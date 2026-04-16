import pool from '@/config/database';
import { BillingRow } from '@/types/database';

export async function getBillingHistory(userId: string) {
  const result = await pool.query<BillingRow>(
    `SELECT * FROM billing
     WHERE user_id = $1 AND billed_at >= NOW() - INTERVAL '2 years'
     ORDER BY billed_at DESC`,
    [userId],
  );

  return result.rows.map((b) => ({
    billingId: b.billing_id,
    planType: b.plan_type,
    isYearPlan: b.is_year_plan,
    amountCents: b.amount_cents,
    billedAt: b.billed_at,
  }));
}
