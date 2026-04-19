import { MOCK_LOGIN_RESPONSE } from '@/__tests__/constants/mock-user';
import jwt from 'jsonwebtoken';
import { mockPool } from '@/__tests__/constants/mock-database';

export const mockAuthHeaders = (userId = MOCK_LOGIN_RESPONSE.userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  mockPool.query.mockResolvedValueOnce({ rows: [{ user_id: userId }] });
  return { Authorization: `Bearer ${token}` };
};
