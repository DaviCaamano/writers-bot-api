import { Plan } from '@/types/enum/plan';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/utils/database/with-query');
jest.mock('@/utils/story/world');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

import { withQuery } from '@/utils/database/with-query';
import { fetchLegacy } from '@/utils/story/world';
import { login } from '@/services/user/login.service';
import {
  mockLoginEmail,
  mockLoginResponse,
  mockLoginToken,
  mockStrongPassword,
  mockUser,
} from '@/__tests__/constants/mock-user';
import { PoolClient } from 'pg';
import { createMockClient } from '@/__tests__/constants/mock-database';
import { mockLegacy } from '@/__tests__/constants/mock-story';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { InvalidCredentialsError } from '@/constants/error/custom-errors';
import { mockClear } from '@/__tests__/utils/test-wrappers';

const mockWithQuery = withQuery as jest.MockedFunction<typeof withQuery>;
const mockFetchLegacy = fetchLegacy as jest.MockedFunction<typeof fetchLegacy>;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

describe(
  'login service: login',
  mockClear(() => {
    it('should return a user object with the correct properties', async () => {
      const mockClient = createMockClient();
      mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ plan_type: Plan.pro }] });
      mockFetchLegacy.mockImplementation(async () => mockLegacy);
      mockBcryptCompare.mockResolvedValueOnce(true);
      (jwt.sign as jest.Mock).mockReturnValueOnce(mockLoginToken);

      const response = await login({
        email: mockLoginEmail,
        password: mockStrongPassword,
      });

      expect(response).toMatchObject(mockLoginResponse);
    });

    it('throw InvalidCredentialsError error if email does not exist', async () => {
      const mockClient = createMockClient();
      mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      expect(
        login({
          email: mockLoginEmail,
          password: mockStrongPassword,
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('throw InvalidCredentialsError error if password is incorrect', async () => {
      const mockClient = createMockClient();
      mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));
      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcryptCompare.mockResolvedValueOnce(false);
      expect(login({ email: mockLoginEmail, password: mockStrongPassword })).rejects.toThrow(
        InvalidCredentialsError,
      );
    });
  }),
);
