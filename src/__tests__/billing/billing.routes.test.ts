import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';

jest.mock('@/services/user/user.service');
jest.mock('@/services/billing/billing.service');
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));
import * as billingService from '@/services/billing/billing.service';
import { mockLoginResponse } from '@/__tests__/constants/mock-login';
import request from 'supertest';
import app from '@/app';
import { Plan } from '@/types/enum/plan';

const mockGetBillingHistory = billingService.getBillingHistory as jest.Mock;

describe('GET /users/history/:userId', () => {
  it('returns 200 with billing history for own account', async () => {
    const headers = mockAuthHeaders(mockLoginResponse.userId);
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

    const res = await request(app).get(`/billing/history/${mockLoginResponse.userId}`).set(headers);

    expect(res.status).toBe(200);
    expect(res.body.billingHistory).toEqual(mockBilling);
    expect(mockGetBillingHistory).toHaveBeenCalledWith(mockLoginResponse.userId);
  });

  it('returns 403 when requesting another users billing history', async () => {
    const headers = mockAuthHeaders(mockLoginResponse.userId);
    const otherUserId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

    const res = await request(app).get(`/billing/history/${otherUserId}`).set(headers);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
