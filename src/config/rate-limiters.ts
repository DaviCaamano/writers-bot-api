import rateLimit from 'express-rate-limit';

const rateLimitMessage = (action: string) => ({
  error: `Too many ${action} attempts, please try again later`,
});

/** Applied globally to all authenticated endpoints */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  message: rateLimitMessage('request'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  message: rateLimitMessage('login'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  message: rateLimitMessage('account creation'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  message: rateLimitMessage('subscription'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  message: rateLimitMessage('AI generation'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
