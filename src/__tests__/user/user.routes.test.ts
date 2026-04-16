import { EmailTakenError } from '@/constants/error/custom-errors';

jest.mock('@/services/user/user.service');
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import app from '@/app';
import * as userService from '@/services/user/user.service';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';
import { mockStrongPassword } from '@/__tests__/constants/mock-login';

const mockCreateUser = userService.createUser as jest.Mock;
const mockAddGenres = userService.addGenres as jest.Mock;
const mockDeleteUser = userService.deleteUser as jest.Mock;

const mockLoginResponse = {
  email: 'jane@example.com',
  userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  plan: null,
  firstName: 'Jane',
  lastName: 'Doe',
  legacy: [],
  token: 'mock-jwt-token',
};

// POST /user/create
describe('POST /user/create', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/user/create').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/user/create').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'not-an-email',
      password: mockStrongPassword,
    });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('email');
  });

  it('returns 400 when password is too weak', async () => {
    const res = await request(app).post('/user/create').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('password');
  });

  it('returns 201 even when email is already registered (anti-enumeration)', async () => {
    mockCreateUser.mockRejectedValueOnce(new EmailTakenError());

    const res = await request(app).post('/user/create').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: mockStrongPassword,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
  });

  it('returns 201 on successful creation', async () => {
    mockCreateUser.mockResolvedValueOnce(undefined);

    const res = await request(app).post('/user/create').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: mockStrongPassword,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
  });
});

// POST /user/genres
describe('POST /user/genres', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/user/genres')
      .send({ genres: ['Fantasy'] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when genres is not an array', async () => {
    const headers = mockAuthHeaders();
    const res = await request(app).post('/user/genres').set(headers).send({ genres: 'Fantasy' });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('genres');
  });

  it('returns 200 with updated genre list', async () => {
    const headers = mockAuthHeaders();
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
    const headers = mockAuthHeaders();
    const res = await request(app).post('/user/deleteme').set(headers).send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(mockDeleteUser).toHaveBeenCalledWith(mockLoginResponse.userId);
  });
});
