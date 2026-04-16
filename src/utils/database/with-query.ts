import { PoolClient } from 'pg';
import pool from '@/config/database';

// Initializes a client for the database connection
// Perform the operations of the callback
// handles release regardless
export const withQuery = async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
};
