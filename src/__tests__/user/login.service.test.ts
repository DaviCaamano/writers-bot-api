jest.mock('@/services/user/login.service');
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import app from '@/app';
import * as loginService from '@/services/user/login.service';
import * as userService from '@/services/user/user.service';
import { mockLoginResponse } from '@/__tests__/constants/mock-login';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';

const STRONG_PASSWORD = 'P@ssword123!';
const mockLogin = loginService.login as jest.Mock;
const mockLogout = loginService.logout as jest.Mock;

describe('POST /user/login', () => {
  it('returns 400 when body is invalid', async () => {
    const res = await request(app).post('/user/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 401 on invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce(new userService.InvalidCredentialsError());

    const res = await request(app).post('/user/login').send({
      email: 'unknown@example.com',
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 200 with user data on success', async () => {
    mockLogin.mockResolvedValueOnce(mockLoginResponse);

    const res = await request(app).post('/user/login').send({
      email: 'jane@example.com',
      password: STRONG_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'jane@example.com',
      userId: mockLoginResponse.userId,
      firstName: 'Jane',
      lastName: 'Doe',
      token: 'mock-jwt-token',
      plan: null,
      legacy: [],
    });
  });
});

describe('POST /user/logout', () => {
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
    // Verify logout was called with a token string (not a userId)
    expect(mockLogout).toHaveBeenCalledWith(expect.any(String));
  });
});
