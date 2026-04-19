import { getBillingHistory } from '@/services/billing/billing.service';
import { authMiddleware } from '@/middleware/auth';
import { Router } from 'express';
import { generalLimiter } from '@/config/rate-limiters';
import { validateParams } from '@/middleware/validate';
import { BillingHistoryParams, BillingHistoryParamsSchema } from '@/schemas/user.schemas';
import { AuthRequest } from '@/types/request';
import { BillingResponse, RouteResponse } from '@/types/response';

const router = Router();

// Billing history (owner-only)
router.get(
  '/history/:userId',
  authMiddleware,
  generalLimiter,
  validateParams(BillingHistoryParamsSchema),
  async (req: AuthRequest, res: RouteResponse<BillingResponse[]>): Promise<void> => {
    const params = req.params as BillingHistoryParams;

    // Ensure the authenticated user can only access their own billing history
    if (req.userId !== params.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const result = await getBillingHistory(params.userId);
    res.json(result);
  },
);

export default router;
