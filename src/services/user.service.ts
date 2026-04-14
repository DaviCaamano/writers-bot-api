import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '@/config/database';
import stripe from '@/config/stripe';
import logger from '@/config/logger';
import { fetchLegacy } from '@/utils/legacy';
import type {
  LoginBody,
  CreateUserBody,
  UpdateUserBody,
  SubscribeBody,
} from '@/schemas/user.schemas';
import { BillingRow, PlanRow, UserRow } from '@/types/database';
import { PlanType } from '@/types/plan';

const SALT_ROUNDS = 12;

// ── Domain errors ────────────────────────────────────────────────

export class InvalidCredentialsError extends Error {}
export class EmailTakenError extends Error {}

// ── Login ────────────────────────────────────────────────────────

export async function login(data: LoginBody) {
  const userResult = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [
    data.email,
  ]);

  if (userResult.rows.length === 0) {
    logger.info({ email: data.email }, 'Login failed: unknown email');
    throw new InvalidCredentialsError();
  }

  const user = userResult.rows[0];
  const passwordMatch = await bcrypt.compare(data.password, user.password_hash);
  if (!passwordMatch) {
    logger.info({ userId: user.user_id }, 'Login failed: wrong password');
    throw new InvalidCredentialsError();
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign(
    { userId: user.user_id },
    process.env.JWT_SECRET as string,
    { expiresIn } as jwt.SignOptions,
  );

  const expiresAt = new Date(Date.now() + parseExpiry(expiresIn));
  await pool.query('INSERT INTO authentication (user_id, token, expires_at) VALUES ($1, $2, $3)', [
    user.user_id,
    token,
    expiresAt,
  ]);

  const planResult = await pool.query<PlanRow>(
    'SELECT plan_type FROM plans WHERE user_id = $1 AND is_active = TRUE LIMIT 1',
    [user.user_id],
  );

  const legacy = await fetchLegacy(user.user_id);

  logger.info({ userId: user.user_id }, 'User logged in');

  return {
    email: user.email,
    userId: user.user_id,
    plan: planResult.rows.length > 0 ? planResult.rows[0].plan_type : null,
    firstName: user.first_name,
    lastName: user.last_name,
    legacy,
    token,
  };
}

// ── Logout (revoke only the specific session token) ──────────────

export async function logout(token: string) {
  const result = await pool.query('DELETE FROM authentication WHERE token = $1 RETURNING user_id', [
    token,
  ]);
  if (result.rows.length > 0) {
    logger.info({ userId: result.rows[0].user_id }, 'User logged out');
  }
}

// ── Create user ──────────────────────────────────────────────────

export async function createUser(data: CreateUserBody) {
  const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [data.email]);
  if (existing.rows.length > 0) throw new EmailTakenError();

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  await pool.query(
    'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4)',
    [data.firstName, data.lastName, data.email, passwordHash],
  );

  logger.info({ email: data.email }, 'User account created');
}

// ── Update user ──────────────────────────────────────────────────

export async function updateUser(userId: string, data: UpdateUserBody) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    if (data.genres) {
      await client.query('DELETE FROM genres WHERE user_id = $1', [userId]);
      for (const genre of data.genres) {
        await client.query('INSERT INTO genres (user_id, genre) VALUES ($1, $2)', [userId, genre]);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const userResult = await pool.query<UserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
  const user = userResult.rows[0];
  const genreResult = await pool.query('SELECT genre FROM genres WHERE user_id = $1', [userId]);
  const planResult = await pool.query<PlanRow>(
    'SELECT plan_type FROM plans WHERE user_id = $1 AND is_active = TRUE LIMIT 1',
    [userId],
  );

  logger.info({ userId, fields: Object.keys(data) }, 'User updated');

  return {
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    genres: genreResult.rows.map((r) => r.genre),
    plan: planResult.rows.length > 0 ? planResult.rows[0].plan_type : null,
  };
}

// ── Genres ───────────────────────────────────────────────────────

export async function addGenres(userId: string, genres: string[]) {
  for (const genre of genres) {
    await pool.query(
      'INSERT INTO genres (user_id, genre) VALUES ($1, $2) ON CONFLICT (user_id, genre) DO NOTHING',
      [userId, genre],
    );
  }

  const result = await pool.query('SELECT genre FROM genres WHERE user_id = $1 ORDER BY genre', [
    userId,
  ]);
  return result.rows.map((r) => r.genre as string);
}

// ── Billing history ──────────────────────────────────────────────

export async function getBillingHistory(userId: string) {
  const result = await pool.query<BillingRow>(
    `SELECT * FROM billing
     WHERE user_id = $1 AND billed_at >= NOW() - INTERVAL '2 years'
     ORDER BY billed_at DESC`,
    [userId],
  );

  return result.rows.map((b) => ({
    billingId: b.billing_id,
    planType: b.plan_type,
    isYearPlan: b.is_year_plan,
    amountCents: b.amount_cents,
    billedAt: b.billed_at,
  }));
}

// ── Delete user (GDPR / account deletion) ────────────────────────

export async function deleteUser(userId: string) {
  // All related tables cascade-delete from users.user_id
  await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
  logger.info({ userId }, 'User account deleted');
}

// ── Subscribe ────────────────────────────────────────────────────

export async function subscribe(userId: string, data: SubscribeBody) {
  const { planType, yearPlan, paymentMethodId } = data;
  const amountCents = await calculatePrice(userId, planType, yearPlan);

  const userResult = await pool.query<UserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
  const user = userResult.rows[0];

  let stripeCustomerId = user.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
    });
    stripeCustomerId = customer.id;
    await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2', [
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
    throw new Error(`Payment failed with status: ${paymentIntent.status}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE plans SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_active = TRUE',
      [userId],
    );
    await client.query(
      `INSERT INTO plans (user_id, plan_type, is_year_plan, is_active, stripe_subscription_id, start_date)
       VALUES ($1, $2, $3, TRUE, $4, NOW())`,
      [userId, planType, yearPlan, paymentIntent.id],
    );
    await client.query(
      `INSERT INTO billing (user_id, plan_type, is_year_plan, amount_cents, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, planType, yearPlan, amountCents, paymentIntent.id],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  logger.info({ userId, planType, yearPlan, amountCents }, 'Subscription created');

  return { amountCents, planType, yearPlan };
}

// ── Private helpers ──────────────────────────────────────────────

async function calculatePrice(
  userId: string,
  planType: PlanType,
  yearPlan: boolean,
): Promise<number> {
  if (yearPlan) return planType === 'pro-plan' ? 10000 : 30000;

  const countResult = await pool.query(
    'SELECT COUNT(*) as cnt FROM billing WHERE user_id = $1 AND plan_type = $2 AND is_year_plan = FALSE',
    [userId, planType],
  );
  const monthsBilled = parseInt(countResult.rows[0].cnt, 10);

  if (planType === 'pro-plan') return monthsBilled < 3 ? 500 : 1000;
  return monthsBilled < 3 ? 1500 : 3000;
}

function parseExpiry(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}
