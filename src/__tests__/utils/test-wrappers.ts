import request from 'supertest';
import app from '@/app';

type Tests = () => void | Promise<void>;
export const testAuth = (
  route: string,
  method: 'post' | 'get' | 'put' | 'delete',
  inputs: string | Record<string, unknown> | undefined | Tests,
  tests?: Tests,
) => {
  const data = typeof inputs === 'function' ? undefined : inputs;
  const testsToRun = typeof inputs === 'function' ? inputs : tests;
  return mockClear(() => {
    it('returns 401 without auth', async () => {
      const res = await request(app)[method](route).send(data);
      expect(res.status).toBe(401);
    });

    testsToRun!();
  });
};

export const mockClear = (tests: Tests) => {
  return () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    tests();
  };
};
