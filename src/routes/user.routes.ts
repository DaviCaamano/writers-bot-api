import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
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
  SubscribeSchema,
  SubscribeBody,
} from '@/schemas/user.schemas';
import {
  createUser,
  updateUser,
  addGenres,
  deleteUser,
  subscribe,
} from '@/services/user/user.service';
import { AuthRequest } from '@/types/request';
import { login, logout } from '@/services/user/login.service';
import {
  EmailTakenError,
  InvalidCredentialsError,
  StripePaymentFailed,
} from '@/constants/error/custom-errors';
import { LoginResponse, LogoutResponse, RouteResponse, UserResponse } from '@/types/response';

const router = Router();

// Login
router.post(
  '/login',
  loginLimiter,
  validate(LoginSchema),
  async (req: Request, res: RouteResponse<LoginResponse>) => {
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
  async (req: AuthRequest, res: RouteResponse<LogoutResponse>) => {
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
  async (req: Request, res: RouteResponse<{ status: string }>): Promise<void> => {
    const user: CreateUserBody = req.body;
    try {
      await createUser(user);
    } catch (err) {
      if (err instanceof EmailTakenError) {
        // Return identical response to prevent email enumeration
        res.status(201).json({ status: 'ok', ...user });
      }
      throw err;
    }
    res.status(200).json({ status: 'ok', ...user });
  },
);

// Update user
router.post(
  '/',
  authMiddleware,
  generalLimiter,
  validate(UpdateUserSchema),
  async (req: AuthRequest, res: Response<UserResponse>): Promise<void> => {
    res.json(await updateUser(req.userId!, req.body as UpdateUserBody));
  },
);

// Add genres
router.post(
  '/genres',
  authMiddleware,
  generalLimiter,
  validate(GenresSchema),
  async (req: AuthRequest, res: Response<{ genres: string[] }>): Promise<void> => {
    const { genres } = req.body as GenresBody;
    res.json({ genres: await addGenres(req.userId!, genres) });
  },
);

// Delete account
router.post('/deleteme', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  await deleteUser(req.userId!);
  res.json({ status: 'ok' });
});

// Subscribe
router.post(
  '/subscribe',
  authMiddleware,
  subscribeLimiter,
  validate(SubscribeSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json({ status: 'ok', ...(await subscribe(req.userId!, req.body as SubscribeBody)) });
    } catch (err) {
      if (err instanceof StripePaymentFailed) {
        res.status(402).json({ error: 'Payment failed' });
        return;
      }
      throw err;
    }
  },
);

export default router;
