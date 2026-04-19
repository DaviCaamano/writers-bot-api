jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));
import { mockPool } from '@/__tests__/constants/mock-story';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { mockClear } from '@/__tests__/utils/test-wrappers';

describe(
  'Auth Middleware',
  mockClear(() => {
    describe('Unprotected route returns without auth middleware', () => {
      it('returns 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
      });
    });

    describe('Protected route without token', () => {
      it('returns 401 when Authorization header is missing', async () => {
        const res = await request(app).post('/user/logout').send({ userId: 'some-id' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No auth token provided');
      });

      it('returns 401 when Authorization header is malformed', async () => {
        const res = await request(app)
          .post('/user/logout')
          .set('Authorization', 'Token abc123')
          .send({ userId: 'some-id' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No auth token provided');
      });
    });

    describe('Protected route with invalid token', () => {
      it('returns 401 when token signature is wrong', async () => {
        const res = await request(app)
          .post('/user/logout')
          // causes jwt.verify to throw error
          .set('Authorization', 'Bearer not.a.real.token')
          .send({ userId: 'some-id' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid token');
      });
    });

    describe('Protected route with revoked token', () => {
      it('returns 401 when token is not found in the authentication table', async () => {
        const token = jwt.sign({ userId: 'test-user-id' }, process.env.JWT_SECRET!, {
          expiresIn: '7d',
        });

        mockPool.query.mockResolvedValueOnce({ rows: [] }); // no row in the authentication table

        const res = await request(app)
          .post('/user/logout')
          .set('Authorization', `Bearer ${token}`)
          .send({ userId: 'test-user-id' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Token expired or revoked');
      });
    });

    describe('Protected route with valid token', () => {
      it('passes through to route handler when token is valid', async () => {
        const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

        // auth middleware uses pool.query directly; logout handler uses withQuery (pool.connect)
        mockPool.query.mockResolvedValueOnce({ rows: [{ user_id: userId }] });
        (mockPool.connect as jest.Mock).mockResolvedValueOnce({
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
          release: jest.fn(),
        });

        const res = await request(app)
          .post('/user/logout')
          .set('Authorization', `Bearer ${token}`)
          .send({ userId });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
      });
    });
  }),
);
