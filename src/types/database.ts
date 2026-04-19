// Database row types
import { Plan } from '@/types/enum/plan';

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
  story_id: string;
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

export interface WorldRowWithStories extends WorldRow {
  stories: StoryRow[];
}

export interface StoryRow {
  story_id: string;
  world_id: string;
  title: string;
  predecessor_id: string | null;
  successor_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StoryRowWithDocuments extends StoryRow {
  documents: DocumentRow[];
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
  plan_type: Plan;
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
  plan_type: Plan;
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
