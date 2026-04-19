import { Plan } from '@/types/enum/plan';

jest.mock('@/utils/database/with-query');
jest.mock('@/services/story/world.service');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

import { withQuery } from '@/utils/database/with-query';
import { fetchLegacy } from '@/services/story/world.service';
import { login } from '@/services/user/login.service';
import {
  MOCK_LOGIN_EMAIL,
  MOCK_LOGIN_RESPONSE,
  MOCK_LOGIN_TOKEN,
  MOCK_STRONG_PASSWORD,
  MOCK_USER,
} from '@/__tests__/constants/mock-user';
import { PoolClient } from 'pg';
import { createMockClient } from '@/__tests__/constants/mock-database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { InvalidCredentialsError } from '@/constants/error/custom-errors';
import { mockClear } from '@/__tests__/utils/test-wrappers';
import { mockLegacyResponse } from '@/__tests__/utils/mock-linked-documents';

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
        .mockResolvedValueOnce({ rows: [MOCK_USER] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ plan_type: Plan.pro }] });
      mockFetchLegacy.mockImplementation(async () => mockLegacyResponse());
      mockBcryptCompare.mockResolvedValueOnce(true);
      (jwt.sign as jest.Mock).mockReturnValueOnce(MOCK_LOGIN_TOKEN);

      const response = await login({
        email: MOCK_LOGIN_EMAIL,
        password: MOCK_STRONG_PASSWORD,
      });

      expect(response).toMatchObject(MOCK_LOGIN_RESPONSE);
    });

    it('throw InvalidCredentialsError error if email does not exist', async () => {
      const mockClient = createMockClient();
      mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      void expect(
        login({
          email: MOCK_LOGIN_EMAIL,
          password: MOCK_STRONG_PASSWORD,
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('throw InvalidCredentialsError error if password is incorrect', async () => {
      const mockClient = createMockClient();
      mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));
      mockClient.query.mockResolvedValueOnce({ rows: [MOCK_USER] });
      mockBcryptCompare.mockResolvedValueOnce(false);
      void expect(
        login({ email: MOCK_LOGIN_EMAIL, password: MOCK_STRONG_PASSWORD }),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  }),
);
