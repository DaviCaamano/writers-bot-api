import { Request } from 'express';

// ── Database row types ──────────────────────────────────────────

export interface UserRow {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GenreRow {
  genre_id: string;
  user_id: string;
  genre: string;
  created_at: Date;
}

export interface WorldRow {
  world_id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface StoryRow {
  story_id: string;
  world_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentRow {
  document_id: string;
  story_id: string;
  title: string;
  body: string;
  predecessor_id: string | null;
  successor_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlanRow {
  plan_id: string;
  user_id: string;
  plan_type: 'pro-plan' | 'max-plan';
  is_year_plan: boolean;
  is_active: boolean;
  stripe_subscription_id: string | null;
  start_date: Date;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BillingRow {
  billing_id: string;
  user_id: string;
  plan_type: 'pro-plan' | 'max-plan';
  is_year_plan: boolean;
  amount_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  billed_at: Date;
}

export interface AuthenticationRow {
  auth_id: string;
  user_id: string;
  token: string;
  created_at: Date;
  expires_at: Date;
}

// ── API response types ──────────────────────────────────────────

export interface DocumentResponse {
  documentId: string;
  storyId: string;
  title: string;
  body: string;
  predecessorId: string | null;
  successorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryResponse {
  storyId: string;
  worldId: string;
  title: string;
  documents: DocumentResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldResponse {
  worldId: string;
  userId: string;
  title: string;
  stories: StoryResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  email: string;
  userId: string;
  plan: 'pro-plan' | 'max-plan' | null;
  firstName: string;
  lastName: string;
  legacy: WorldResponse[];
  token: string;
}

export type PlanType = 'pro-plan' | 'max-plan';

// ── Extended Request with auth ──────────────────────────────────

export interface AuthRequest extends Request {
  userId?: string;
}
