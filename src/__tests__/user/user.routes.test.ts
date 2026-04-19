import { EmailTakenError, StripePaymentFailed } from '@/constants/error/custom-errors';

jest.mock('@/services/user/user.service');
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import app from '@/app';
import * as userService from '@/services/user/user.service';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';
import { MOCK_STRONG_PASSWORD, MOCK_SUBSCRIPTION_REQUEST } from '@/__tests__/constants/mock-user';
import { mockClear, testAuth } from '@/__tests__/utils/test-wrappers';

const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>;
const mockAddGenres = userService.addGenres as jest.MockedFunction<typeof userService.addGenres>;
const mockDeleteUser = userService.deleteUser as jest.MockedFunction<typeof userService.deleteUser>;
const mockSubscribe = userService.subscribe as jest.MockedFunction<typeof userService.subscribe>;

const MOCK_LOGIN_RESPONSE = {
  email: 'jane@example.com',
  userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  plan: null,
  firstName: 'Jane',
  lastName: 'Doe',
  legacy: [],
  token: 'mock-jwt-token',
};

// POST /user/create
describe(
  'POST /user/create',
  mockClear(() => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/user/create').send({ email: 'bad' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app).post('/user/create').send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'not-an-email',
        password: MOCK_STRONG_PASSWORD,
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
        password: MOCK_STRONG_PASSWORD,
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
        password: MOCK_STRONG_PASSWORD,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  }),
);

// POST /user/genres
describe(
  'POST /user/genres',
  testAuth('/user/genres', 'post', { genres: 'Fantasy' }, () => {
    it('returns 400 when genres is not an array', async () => {
      const res = await request(app)
        .post('/user/genres')
        .set(mockAuthHeaders())
        .send({ genres: 'Fantasy' });
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
  }),
);

// POST /user/deleteme
describe(
  'POST /user/deleteme',
  testAuth('/user/deleteme', 'post', () => {
    it('returns 200 and deletes the user', async () => {
      mockDeleteUser.mockResolvedValueOnce(undefined);
      const res = await request(app).post('/user/deleteme').set(mockAuthHeaders()).send();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(mockDeleteUser).toHaveBeenCalledWith(MOCK_LOGIN_RESPONSE.userId);
    });
  }),
);

// POST /user/subscribe
describe(
  'POST /user/subscribe',
  testAuth('/user/subscribe', 'post', MOCK_SUBSCRIPTION_REQUEST, () => {
    it('returns 200 and creates subscription', async () => {
      const res = await request(app)
        .post('/user/subscribe')
        .set(mockAuthHeaders())
        .send(MOCK_SUBSCRIPTION_REQUEST);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns 402 on a payment processing error', async () => {
      mockSubscribe.mockImplementationOnce(() => {
        throw new StripePaymentFailed();
      });
      const res = await request(app)
        .post('/user/subscribe')
        .set(mockAuthHeaders())
        .send(MOCK_SUBSCRIPTION_REQUEST);
      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Payment failed');
      expect(mockSubscribe).toHaveBeenCalledWith(
        MOCK_LOGIN_RESPONSE.userId,
        MOCK_SUBSCRIPTION_REQUEST,
      );
    });
  }),
);
