import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validate';
import { loginLimiter, createAccountLimiter, subscribeLimiter } from '../config/rateLimiters';
import { AuthRequest } from '../types';
import {
  LoginSchema, LoginBody,
  LogoutSchema, LogoutBody,
  CreateUserSchema, CreateUserBody,
  UpdateUserSchema, UpdateUserBody,
  GenresSchema, GenresBody,
  BillingHistoryParamsSchema,
  SubscribeSchema, SubscribeBody,
} from '../schemas/user.schemas';
import {
  login,
  logout,
  createUser,
  updateUser,
  addGenres,
  getBillingHistory,
  subscribe,
  InvalidCredentialsError,
  EmailTakenError,
} from '../services/user.service';

const router = Router();

router.post('/login', loginLimiter, validate(LoginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await login(req.body as LoginBody);
    res.json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    throw err;
  }
});

router.post('/logout', authMiddleware, validate(LogoutSchema), async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body as LogoutBody;
  await logout(userId);
  res.json({ status: 'ok' });
});

router.post('/create', createAccountLimiter, validate(CreateUserSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    await createUser(req.body as CreateUserBody);
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    throw err;
  }
});

router.post('/', authMiddleware, validate(UpdateUserSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await updateUser(req.userId!, req.body as UpdateUserBody);
  res.json(result);
});

router.post('/genres', authMiddleware, validate(GenresSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { genres } = req.body as GenresBody;
  const result = await addGenres(req.userId!, genres);
  res.json({ genres: result });
});

router.post('/deleteme', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ status: 'ok' });
});

router.get('/billing-history/:userId', authMiddleware, validateParams(BillingHistoryParamsSchema), async (req: Request, res: Response): Promise<void> => {
  const result = await getBillingHistory(req.params.userId as string);
  res.json({ billingHistory: result });
});

router.post('/subscribe', authMiddleware, subscribeLimiter, validate(SubscribeSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await subscribe(req.userId!, req.body as SubscribeBody);
  res.json({ status: 'ok', ...result });
});

export default router;
