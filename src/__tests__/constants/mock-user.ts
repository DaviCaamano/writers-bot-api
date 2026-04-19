import { LoginResponse } from '@/types/response';
import { GenreRow, PlanRow, UserRow } from '@/types/database';
import { Plan } from '@/types/enum/plan';
import { CreateUserBody, SubscribeBody, UpdateUserBody } from '@/schemas/user.schemas';
import {
  mockStipePaymentMethodId,
  mockStripeCustomerId,
  mockStripeSubscriptionId,
} from '@/__tests__/constants/mock-stripe';
import { MOCK_DATE } from '@/__tests__/constants/mock-basic';
import { mockLegacyResponse } from '@/__tests__/utils/mock-linked-documents';

export const MOCK_LOGIN_EMAIL = 'jane@example.com';
export const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
export const MOCK_LOGIN_TOKEN = 'mock-jwt-token';
export const MOCK_LOGIN_FIRST_NAME = 'Jane';
export const MOCK_LOGIN_LAST_NAME = 'Doe';
export const MOCK_LOGIN_PLAN = Plan.pro;
export const MOCK_STRONG_PASSWORD = 'P@ssword123!';
export const MOCK_HASHED_PASSWORD = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
export const MOCK_GENRE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
export const MOCK_GENRE_FIELD = 'fantasy';
export const MOCK_GENRES = ['fantasy', 'horror'];
export const MOCK_PLAN_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';

export const mockUser: UserRow = {
  user_id: MOCK_USER_ID,
  email: MOCK_LOGIN_EMAIL,
  first_name: MOCK_LOGIN_FIRST_NAME,
  last_name: MOCK_LOGIN_LAST_NAME,
  password_hash: MOCK_HASHED_PASSWORD,
  stripe_customer_id: mockStripeCustomerId,
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
};

export const mockNewUser: CreateUserBody = {
  firstName: MOCK_LOGIN_FIRST_NAME,
  lastName: MOCK_LOGIN_LAST_NAME,
  email: MOCK_LOGIN_EMAIL,
  password: MOCK_STRONG_PASSWORD,
};

export const mockUpdatingUser: UpdateUserBody = {
  firstName: MOCK_LOGIN_FIRST_NAME,
  lastName: MOCK_LOGIN_LAST_NAME,
  genres: MOCK_GENRES,
  password: MOCK_STRONG_PASSWORD,
};

export const mockLoginResponse: LoginResponse = {
  email: MOCK_LOGIN_EMAIL,
  userId: MOCK_USER_ID,
  plan: MOCK_LOGIN_PLAN,
  firstName: MOCK_LOGIN_FIRST_NAME,
  lastName: MOCK_LOGIN_LAST_NAME,
  legacy: mockLegacyResponse(),
  token: MOCK_LOGIN_TOKEN,
};

export const mockGenre: GenreRow = {
  story_id: MOCK_GENRE_ID,
  genre: MOCK_GENRE_FIELD,
  created_at: MOCK_DATE,
};

export const mockPlan: PlanRow = {
  plan_id: MOCK_PLAN_ID,
  user_id: MOCK_USER_ID,
  plan_type: Plan.pro,
  is_year_plan: false,
  is_active: true,
  stripe_subscription_id: mockStripeSubscriptionId,
  start_date: MOCK_DATE,
  end_date: MOCK_DATE,
  created_at: MOCK_DATE,
  updated_at: MOCK_DATE,
};

export const mockSubscriptionRequest: SubscribeBody = {
  planType: Plan.pro,
  yearPlan: false,
  paymentMethodId: mockStipePaymentMethodId,
};
