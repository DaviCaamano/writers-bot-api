jest.mock('@/services/user/user.service');
jest.mock('@/services/billing/billing.service');
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import * as billingService from '@/services/billing/billing.service';
import { MOCK_BILLING_RESPONSE, MOCK_USER_ID } from '@/__tests__/constants/mock-user';
import request from 'supertest';
import app from '@/app';
import { mockClear } from '@/__tests__/utils/test-wrappers';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';

const mockGetBillingHistory = billingService.getBillingHistory as jest.Mock;

describe(
  'GET /history/:userId',
  mockClear(() => {
    it('returns 200 with billing history for own account', async () => {
      const headers = mockAuthHeaders(MOCK_USER_ID);
      mockGetBillingHistory.mockResolvedValueOnce([MOCK_BILLING_RESPONSE]);

      const res = await request(app).get(`/billing/history/${MOCK_USER_ID}`).set(headers);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { ...MOCK_BILLING_RESPONSE, billedAt: MOCK_BILLING_RESPONSE.billedAt.toISOString() },
      ]);
      expect(mockGetBillingHistory).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('returns 403 when requesting another users billing history', async () => {
      const headers = mockAuthHeaders(MOCK_USER_ID);
      const otherUserId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

      const res = await request(app).get(`/billing/history/${otherUserId}`).set(headers);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  }),
);
