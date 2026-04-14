import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import logger from '@/config/logger';
import userRoutes from '@/routes/user.routes';
import storyRoutes from '@/routes/story.routes';
import docsRoutes from '@/routes/docs.routes';

const app = express();

// ── Security & parsing middleware ────────────────────────────────
app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600,
  }),
);

app.use(express.json({ limit: '1mb' }));

// ── HTTP request logging (skip in tests to keep output clean) ────
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// ── Routes ───────────────────────────────────────────────────────
app.use('/user', userRoutes);
app.use('/users', userRoutes); // also mounts billing-history under /users
app.use('/story', storyRoutes);
app.use('/docs', docsRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Global error handler ─────────────────────────────────────────
// Express 5 natively forwards async errors to this handler — no monkey-patching needed.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
