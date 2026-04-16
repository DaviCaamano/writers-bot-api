import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { validate, validateParams } from '@/middleware/validate';
import {
  loginLimiter,
  createAccountLimiter,
  subscribeLimiter,
  generalLimiter,
} from '@/config/rate-limiters';
import {
  LoginSchema,
  LoginBody,
  CreateUserSchema,
  CreateUserBody,
  UpdateUserSchema,
  UpdateUserBody,
  GenresSchema,
  GenresBody,
  BillingHistoryParamsSchema,
  BillingHistoryParams,
  SubscribeSchema,
  SubscribeBody,
} from '@/schemas/user.schemas';
import {
  login,
  logout,
  createUser,
  updateUser,
  addGenres,
  getBillingHistory,
  deleteUser,
  subscribe,
  InvalidCredentialsError,
  EmailTakenError,
} from '@/services/user.service';
import { AuthRequest } from '@/types/request';

const router = Router();

// Login
router.post(
  '/login',
  loginLimiter,
  validate(LoginSchema),
  async (req: Request, res: Response): Promise<void> => {
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
  },
);

// Logout (revokes only the current session token)
router.post(
  '/logout',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    await logout(req.token!);
    res.json({ status: 'ok' });
  },
);

// Create account
// Returns the same response whether the email exists or not to prevent enumeration.

router.post(
  '/create',
  createAccountLimiter,
  validate(CreateUserSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await createUser(req.body as CreateUserBody);
    } catch (err) {
      if (err instanceof EmailTakenError) {
        // Return identical response to prevent email enumeration
        res.status(201).json({ status: 'ok' });
        return;
      }
      throw err;
    }
    res.status(201).json({ status: 'ok' });
  },
);

// Update user
router.post(
  '/',
  authMiddleware,
  generalLimiter,
  validate(UpdateUserSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await updateUser(req.userId!, req.body as UpdateUserBody);
    res.json(result);
  },
);

// Add genres
router.post(
  '/genres',
  authMiddleware,
  generalLimiter,
  validate(GenresSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { genres } = req.body as GenresBody;
    const result = await addGenres(req.userId!, genres);
    res.json({ genres: result });
  },
);

// Delete account
router.post(
  '/deleteme',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    await deleteUser(req.userId!);
    res.json({ status: 'ok' });
  },
);

// Billing history (owner-only)
router.get(
  '/billing-history/:userId',
  authMiddleware,
  generalLimiter,
  validateParams(BillingHistoryParamsSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const params = req.params as BillingHistoryParams;

    // Ensure the authenticated user can only access their own billing history
    if (req.userId !== params.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const result = await getBillingHistory(params.userId);
    res.json({ billingHistory: result });
  },
);

// Subscribe
router.post(
  '/subscribe',
  authMiddleware,
  subscribeLimiter,
  validate(SubscribeSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await subscribe(req.userId!, req.body as SubscribeBody);
    res.json({ status: 'ok', ...result });
  },
);

export default router;
