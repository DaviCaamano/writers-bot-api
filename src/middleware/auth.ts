import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '@/config/database';
import { AuthRequest } from '@/types/request';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No auth token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

    // Cross-check: the token must exist in the DB AND belong to the claimed userId
    const result = await pool.query(
      'SELECT user_id FROM authentication WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [token, decoded.userId],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Token expired or revoked' });
      return;
    }

    req.userId = decoded.userId;
    req.token = token;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
