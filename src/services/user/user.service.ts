import bcrypt from 'bcrypt';
import pool from '@/config/database';
import stripe from '@/config/stripe';
import logger from '@/config/logger';
import type { CreateUserBody, UpdateUserBody, SubscribeBody } from '@/schemas/user.schemas';
import { GenreRow, PlanRow, UserRow } from '@/types/database';
import { EmailTakenError, StripePaymentFailed } from '@/constants/error/custom-errors';
import { UserResponse } from '@/types/response';
import { Plan } from '@/types/enum/plan';
import { withTransaction } from '@/utils/database/with-transaction';
import { PoolClient } from 'pg';
import { withQuery } from '@/utils/database/with-query';

const SALT_ROUNDS = 12;

// Create user
export async function createUser(data: CreateUserBody): Promise<void> {
  const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [data.email]);
  if (existing.rows.length > 0) throw new EmailTakenError();

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  await pool.query(
    `INSERT INTO users 
    (first_name, last_name, email, password_hash) 
    VALUES ($1, $2, $3, $4)`,
    [data.firstName, data.lastName, data.email, passwordHash],
  );
  logger.info({ email: data.email }, 'User account created');
}

// Update user
export const updateUser = async (userId: string, data: UpdateUserBody): Promise<UserResponse> => {
  return withTransaction(async (client: PoolClient) => {
    const updates: string[] = [];
    const values: (string | Date)[] = [];
    let paramIdx = 1;

    if (data.firstName) {
      updates.push(`first_name = $${paramIdx++}`);
      values.push(data.firstName);
    }
    if (data.lastName) {
      updates.push(`last_name = $${paramIdx++}`);
      values.push(data.lastName);
    }
    if (data.password) {
      const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
      updates.push(`password_hash = $${paramIdx++}`);
      values.push(hash);
      logger.info({ userId }, 'Password changed');
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${paramIdx++}`);
      values.push(new Date());
      values.push(userId);
      await client.query(
        `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramIdx}`,
        values,
      );
    }

    const userQuery = client.query<UserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
    const planQuery = client.query<PlanRow>(
      'SELECT plan_type FROM plans WHERE user_id = $1 AND is_active = TRUE LIMIT 1',
      [userId],
    );

    const [userResult, planResult] = await Promise.all([userQuery, planQuery]);
    const user = userResult.rows[0];
    logger.info({ userId, fields: Object.keys(data) }, 'User updated');

    return {
      userId: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      plan: planResult.rows.length > 0 ? planResult.rows[0].plan_type : null,
    };
  });
};

// Genres
export async function addGenres(userId: string, genres: string[]) {
  return withQuery(async (client) => {
    for (const genre of genres) {
      await client.query(
        'INSERT INTO genres (user_id, genre) VALUES ($1, $2) ON CONFLICT (user_id, genre) DO NOTHING',
        [userId, genre],
      );
    }

    const result = await client.query<GenreRow>(
      'SELECT genre FROM genres WHERE user_id = $1 ORDER BY genre',
      [userId],
    );
    return result.rows.map((r) => r.genre as string);
  });
}

// Delete user (GDPR / account deletion)
export async function deleteUser(userId: string) {
  // All related tables cascade-delete from users.user_id
  // await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
  // logger.info({ userId }, 'User account deleted');
  //TODO implement such that it emails me the requests users make for account deletion
  console.warn(userId, 'User account deletion requested. Not implemented yet.');
}

// Subscribe
export async function subscribe(userId: string, data: SubscribeBody) {
  return withTransaction(async (client: PoolClient) => {
    const { planType, yearPlan, paymentMethodId } = data;
    const amountCents = await calculatePrice(userId, planType, yearPlan, client);

    const userResult = await client.query<UserRow>('SELECT * FROM users WHERE user_id = $1', [
      userId,
    ]);
    const user = userResult.rows[0];

    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
      });
      stripeCustomerId = customer.id;
      await client.query('UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2', [
        stripeCustomerId,
        userId,
      ]);
    }

    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      },
      { idempotencyKey: `subscribe_${userId}_${Date.now()}` },
    );

    if (paymentIntent.status !== 'succeeded') {
      logger.warn({ userId, status: paymentIntent.status }, 'Payment not succeeded');
      throw new StripePaymentFailed();
    }

    const updatePlanQuery = client.query(
      'UPDATE plans SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_active = TRUE',
      [userId],
    );
    const insertPlanQuery = client.query(
      `INSERT INTO plans (user_id, plan_type, is_year_plan, is_active, stripe_subscription_id, start_date)
       VALUES ($1, $2, $3, TRUE, $4, NOW())`,
      [userId, planType, yearPlan, paymentIntent.id],
    );
    const insertBillingQuery = client.query(
      `INSERT INTO billing (user_id, plan_type, is_year_plan, amount_cents, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, planType, yearPlan, amountCents, paymentIntent.id],
    );

    await Promise.all([updatePlanQuery, insertPlanQuery, insertBillingQuery]);

    logger.info({ userId, planType, yearPlan, amountCents }, 'Subscription created');

    return { amountCents, planType, yearPlan };
  });
}

// Private helpers
async function calculatePrice(
  userId: string,
  planType: Plan,
  yearPlan: boolean,
  client: PoolClient,
): Promise<number> {
  if (yearPlan) return planType === Plan.pro ? 10000 : 30000;

  const countResult = await client.query(
    'SELECT COUNT(*) as cnt FROM billing WHERE user_id = $1 AND plan_type = $2 AND is_year_plan = FALSE',
    [userId, planType],
  );
  const monthsBilled = parseInt(countResult.rows[0].cnt, 10);

  if (planType === Plan.pro) return monthsBilled < 3 ? 500 : 1000;
  return monthsBilled < 3 ? 1500 : 3000;
}
