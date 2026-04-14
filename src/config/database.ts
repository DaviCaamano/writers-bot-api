import { Pool } from 'pg';
import logger from '@/config/logger';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle database client');
});

export default pool;
