jest.mock('@/services/user/user.service');
jest.mock('@/services/billing/billing.service');
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import * as billingService from '@/services/billing/billing.service';
import { MOCK_LOGIN_RESPONSE } from '@/__tests__/constants/mock-user';
import request from 'supertest';
import app from '@/app';
import { Plan } from '@/types/enum/plan';
import { mockClear } from '@/__tests__/utils/test-wrappers';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';

const mockGetBillingHistory = billingService.getBillingHistory as jest.Mock;

describe(
  'GET /users/history/:userId',
  mockClear(() => {
    it('returns 200 with billing history for own account', async () => {
      const headers = mockAuthHeaders(MOCK_LOGIN_RESPONSE.userId);
      const mockBilling = [
        {
          billingId: 'bill-1',
          planType: Plan.pro,
          isYearPlan: false,
          amountCents: 500,
          billedAt: new Date().toISOString(),
        },
      ];
      mockGetBillingHistory.mockResolvedValueOnce(mockBilling);

      const res = await request(app)
        .get(`/billing/history/${MOCK_LOGIN_RESPONSE.userId}`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockBilling);
      expect(mockGetBillingHistory).toHaveBeenCalledWith(MOCK_LOGIN_RESPONSE.userId);
    });

    it('returns 403 when requesting another users billing history', async () => {
      const headers = mockAuthHeaders(MOCK_LOGIN_RESPONSE.userId);
      const otherUserId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

      const res = await request(app).get(`/billing/history/${otherUserId}`).set(headers);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  }),
);
