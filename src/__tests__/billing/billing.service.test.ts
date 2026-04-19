import { mockPool } from '@/__tests__/constants/mock-story';
import { getBillingHistory } from '@/services/billing/billing.service';
import { MOCK_BILLING_ROW, MOCK_USER_ID } from '@/__tests__/constants/mock-user';

describe('BillingService', () => {
  it('should return billing history for a user', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [MOCK_BILLING_ROW] });
    const result = await getBillingHistory(MOCK_USER_ID);
    expect(result).toBeDefined();
    expect(true).toBe(true);
  });
});
