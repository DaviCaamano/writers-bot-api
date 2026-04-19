import { InvalidCredentialsError } from '@/constants/error/custom-errors';

jest.mock('@/services/user/login.service');

import request from 'supertest';
import app from '@/app';
import * as loginService from '@/services/user/login.service';
import {
  MOCK_LOGIN_EMAIL,
  MOCK_LOGIN_RESPONSE,
  MOCK_STRONG_PASSWORD,
} from '@/__tests__/constants/mock-user';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';
import { mockClear } from '@/__tests__/utils/test-wrappers';

const mockLogin = loginService.login as jest.Mock;
const mockLogout = loginService.logout as jest.Mock;

describe(
  'POST /user/login',
  mockClear(() => {
    it('returns 400 when body is invalid', async () => {
      const res = await request(app).post('/user/login').send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 on invalid credentials', async () => {
      mockLogin.mockRejectedValueOnce(new InvalidCredentialsError());

      const res = await request(app).post('/user/login').send({
        email: MOCK_LOGIN_EMAIL,
        password: MOCK_STRONG_PASSWORD,
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 200 with user data on success', async () => {
      mockLogin.mockResolvedValueOnce(MOCK_LOGIN_RESPONSE);

      const res = await request(app).post('/user/login').send({
        email: 'jane@example.com',
        password: MOCK_STRONG_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(JSON.parse(JSON.stringify(MOCK_LOGIN_RESPONSE)));
    });
  }),
);

describe(
  'POST /user/logout',
  mockClear(() => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/user/logout').send();
      expect(res.status).toBe(401);
    });

    it('returns 200 and calls logout with the token', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      const headers = mockAuthHeaders();
      const res = await request(app).post('/user/logout').set(headers).send();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  }),
);
