jest.mock('@/services/user.service');
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '@/app';
import * as userService from '@/services/user.service';
import pool from '@/config/database';

const mockLogin = userService.login as jest.Mock;
const mockCreateUser = userService.createUser as jest.Mock;
const mockAddGenres = userService.addGenres as jest.Mock;
const mockDeleteUser = userService.deleteUser as jest.Mock;
const mockGetBillingHistory = userService.getBillingHistory as jest.Mock;

const STRONG_PASSWORD = 'P@ssword123!';

const mockLoginResponse = {
  email: 'jane@example.com',
  userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  plan: null,
  firstName: 'Jane',
  lastName: 'Doe',
  legacy: [],
  token: 'mock-jwt-token',
};

function authHeaders(userId = mockLoginResponse.userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: userId }] });
  return { Authorization: `Bearer ${token}` };
}

// POST /user/create
describe('POST /user/create', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/user/create').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/user/create').send({
      firstName: 'Jane', lastName: 'Doe', email: 'not-an-email', password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('email');
  });

  it('returns 400 when password is too weak', async () => {
    const res = await request(app).post('/user/create').send({
      firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('password');
  });

  it('returns 201 even when email is already registered (anti-enumeration)', async () => {
    mockCreateUser.mockRejectedValueOnce(new userService.EmailTakenError());

    const res = await request(app).post('/user/create').send({
      firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
  });

  it('returns 201 on successful creation', async () => {
    mockCreateUser.mockResolvedValueOnce(undefined);

    const res = await request(app).post('/user/create').send({
      firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
  });
});

// POST /user/login
describe('POST /user/login', () => {
  it('returns 400 when body is invalid', async () => {
    const res = await request(app).post('/user/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 401 on invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce(new userService.InvalidCredentialsError());

    const res = await request(app).post('/user/login').send({
      email: 'unknown@example.com', password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 200 with user data on success', async () => {
    mockLogin.mockResolvedValueOnce(mockLoginResponse);

    const res = await request(app).post('/user/login').send({
      email: 'jane@example.com', password: STRONG_PASSWORD,
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

// POST /user/logout
describe('POST /user/logout', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/user/logout').send();
    expect(res.status).toBe(401);
  });

  it('returns 200 and calls logout with the token', async () => {
    const mockLogout = userService.logout as jest.Mock;
    mockLogout.mockResolvedValueOnce(undefined);

    const headers = authHeaders();
    const res = await request(app).post('/user/logout').set(headers).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    // Verify logout was called with a token string (not a userId)
    expect(mockLogout).toHaveBeenCalledWith(expect.any(String));
  });
});

// POST /user/genres
describe('POST /user/genres', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/user/genres').send({ genres: ['Fantasy'] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when genres is not an array', async () => {
    const headers = authHeaders();
    const res = await request(app).post('/user/genres').set(headers).send({ genres: 'Fantasy' });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('genres');
  });

  it('returns 200 with updated genre list', async () => {
    const headers = authHeaders();
    mockAddGenres.mockResolvedValueOnce(['Fantasy', 'Sci-Fi']);

    const res = await request(app)
      .post('/user/genres')
      .set(headers)
      .send({ genres: ['Fantasy', 'Sci-Fi'] });

    expect(res.status).toBe(200);
    expect(res.body.genres).toEqual(['Fantasy', 'Sci-Fi']);
  });
});

// POST /user/deleteme
describe('POST /user/deleteme', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/user/deleteme').send();
    expect(res.status).toBe(401);
  });

  it('returns 200 and deletes the user', async () => {
    mockDeleteUser.mockResolvedValueOnce(undefined);
    const headers = authHeaders();
    const res = await request(app).post('/user/deleteme').set(headers).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(mockDeleteUser).toHaveBeenCalledWith(mockLoginResponse.userId);
  });
});

// GET /users/billing-history/:userId
describe('GET /users/billing-history/:userId', () => {
  it('returns 200 with billing history for own account', async () => {
    const headers = authHeaders(mockLoginResponse.userId);
    const mockBilling = [
      { billingId: 'bill-1', planType: 'pro-plan', isYearPlan: false, amountCents: 500, billedAt: new Date().toISOString() },
    ];
    mockGetBillingHistory.mockResolvedValueOnce(mockBilling);

    const res = await request(app)
      .get(`/users/billing-history/${mockLoginResponse.userId}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.billingHistory).toEqual(mockBilling);
    expect(mockGetBillingHistory).toHaveBeenCalledWith(mockLoginResponse.userId);
  });

  it('returns 403 when requesting another users billing history', async () => {
    const headers = authHeaders(mockLoginResponse.userId);
    const otherUserId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

    const res = await request(app)
      .get(`/users/billing-history/${otherUserId}`)
      .set(headers);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
