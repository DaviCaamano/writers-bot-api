import pool from '@/config/database';
import { Pool, PoolClient } from 'pg';

export const mockPool = pool as Pool & { query: jest.Mock; connect: jest.Mock };

export interface MockPoolClient extends PoolClient {
  query: jest.Mock;
  release: jest.Mock;
}

export const createMockClient = () =>
  ({
    query: jest.fn(),
    release: jest.fn(),
  }) as unknown as MockPoolClient;
