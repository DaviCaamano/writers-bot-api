import dotenv from 'dotenv';
dotenv.config();

import logger from '@/config/logger';

// Validate required environment variables at startup
const required = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.fatal({ missing }, 'Missing required environment variables');
  process.exit(1);
}

// Import app AFTER dotenv + validation so config modules see the env vars
import app from '@/app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
