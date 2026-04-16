import { mockLoginResponse } from '@/__tests__/constants/mock-login';
import jwt from 'jsonwebtoken';
import pool from '@/config/database';

export const mockAuthHeaders = (userId = mockLoginResponse.userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: userId }] });
  return { Authorization: `Bearer ${token}` };
};
