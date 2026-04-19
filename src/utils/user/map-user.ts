import { BillingRow, UserRow } from '@/types/database';
import { BillingResponse, UserResponse } from '@/types/response';
import { Plan } from '@/types/enum/plan';
import { CreateUserBody } from '@/schemas/user.schemas';

export const mapUser = (user: UserRow, plan?: { plan_type: Plan }): UserResponse => ({
  userId: user.user_id,
  firstName: user.first_name,
  lastName: user.last_name,
  email: user.email,
  plan: plan?.plan_type ?? null,
});

export const mapUserBodyToResponse = (user: CreateUserBody): UserResponse => ({
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  userId: '',
  plan: null,
});

export const mapBilling = (billing: BillingRow): BillingResponse => ({
  billingId: billing.billing_id,
  planType: billing.plan_type,
  isYearPlan: billing.is_year_plan,
  amountCents: billing.amount_cents,
  billedAt: billing.billed_at,
});
