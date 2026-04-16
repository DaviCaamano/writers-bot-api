import pool from '@/config/database';
import logger from '@/config/logger';
import type { LoginBody } from '@/schemas/user.schemas';
import bcrypt from 'bcrypt';
import { InvalidCredentialsError } from '@/services/user/user.service';
import { PlanRow, UserRow } from '@/types/database';
import jwt from 'jsonwebtoken';
import { fetchLegacy } from '@/utils/story/world';

export const login = async (data: LoginBody) => {
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
};

export const logout = async (token: string) => {
  const result = await pool.query('DELETE FROM authentication WHERE token = $1 RETURNING user_id', [
    token,
  ]);
  if (result.rows.length > 0) {
    logger.info({ userId: result.rows[0].user_id }, 'User logged out');
  }
};

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
