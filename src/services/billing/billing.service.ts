import pool from '@/config/database';
import { BillingRow } from '@/types/database';
import { BillingResponse } from '@/types/response';
import { mapBilling } from '@/utils/user/map-user';

export async function getBillingHistory(userId: string): Promise<BillingResponse[]> {
  const result = await pool.query<BillingRow>(
    `SELECT * FROM billing
     WHERE user_id = $1 AND billed_at >= NOW() - INTERVAL '2 years'
     ORDER BY billed_at DESC`,
    [userId],
  );

  return result.rows.map(mapBilling);
}
