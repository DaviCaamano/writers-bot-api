jest.mock('@/config/database');

import pool from '@/config/database';
import { PoolClient } from 'pg';

export const mockPool = pool as jest.Mocked<typeof pool>;

interface MockPoolClient extends PoolClient {
  query: jest.Mock;
  release: jest.Mock;
}

export const createMockClient = () =>
  ({
    query: jest.fn(),
    release: jest.fn(),
  }) as unknown as MockPoolClient;
