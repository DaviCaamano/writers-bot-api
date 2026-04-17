import { mockLegacy } from '@/__tests__/constants/mock-story';
import { LoginResponse } from '@/types/response';
import { GenreRow, PlanRow, UserRow } from '@/types/database';
import { Plan } from '@/types/enum/plan';
import { CreateUserBody, SubscribeBody, UpdateUserBody } from '@/schemas/user.schemas';
import {
  mockStipePaymentMethodId,
  mockStripeCustomerId,
  mockStripeSubscriptionId,
} from '@/__tests__/constants/mock-stripe';
import { mockDate } from '@/__tests__/constants/mock-basic';

export const mockLoginEmail = 'jane@example.com';
export const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
export const mockLoginToken = 'mock-jwt-token';
export const mockLoginFirstName = 'Jane';
export const mockLoginLastName = 'Doe';
export const mockLoginPlan = Plan.pro;
export const mockStrongPassword = 'P@ssword123!';
export const mockHashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
export const mockGenreId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
export const mockGenreField = 'fantasy';
export const mockGenreField2 = 'horror';
export const mockPlanId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';


export const mockUser: UserRow = {
  user_id: mockUserId,
  email: mockLoginEmail,
  first_name: mockLoginFirstName,
  last_name: mockLoginLastName,
  password_hash: mockHashedPassword,
  stripe_customer_id: mockStripeCustomerId,
  created_at: mockDate,
  updated_at: mockDate,
};


export const mockNewUser: CreateUserBody = {
  firstName: mockLoginFirstName,
  lastName: mockLoginLastName,
  email: mockLoginEmail,
  password: mockStrongPassword,
};

export const mockUpdatingUser: UpdateUserBody = {
  firstName: mockLoginFirstName,
  lastName: mockLoginLastName,
  genres: [mockGenreField, mockGenreField2],
  password: mockStrongPassword,
};

export const mockLoginResponse: LoginResponse = {
  email: mockLoginEmail,
  userId: mockUserId,
  plan: mockLoginPlan,
  firstName: mockLoginFirstName,
  lastName: mockLoginLastName,
  legacy: mockLegacy,
  token: mockLoginToken,
};

export const mockGenre: GenreRow = {
  genre_id: mockGenreId,
  user_id: mockUserId,
  genre: mockGenreField,
  created_at: mockDate,
};

export const mockPlan: PlanRow = {
  plan_id: mockPlanId,
  user_id: mockUserId,
  plan_type: Plan.pro,
  is_year_plan: false,
  is_active: true,
  stripe_subscription_id: mockStripeSubscriptionId,
  start_date: mockDate,
  end_date: mockDate,
  created_at: mockDate,
  updated_at: mockDate,
};

export const mockSubscriptionRequest: SubscribeBody ={
  planType: Plan.pro,
    yearPlan: false,
  paymentMethodId: mockStipePaymentMethodId
}
