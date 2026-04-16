import { PoolClient } from 'pg';
import pool from '@/config/database';

// Initializes a client for the database connection
// Beings a transaction
// Perform the operations of the callback
// Commit the transaction if successful
// Rolls back the transaction if an error is thrown
// handles release regardless
export const withTransaction = async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
