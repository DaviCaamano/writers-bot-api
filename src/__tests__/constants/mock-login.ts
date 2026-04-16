import { mockDate, mockLegacy } from '@/__tests__/constants/mock-story';
import { LoginResponse } from '@/types/response';
import { UserRow } from '@/types/database';

export const mockLoginEmail = 'jane@example.com';
export const mockLoginUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
export const mockLoginToken = 'mock-jwt-token';
export const mockLoginFirstName = 'Jane';
export const mockLoginLastName = 'Doe';
export const mockLoginPlan = 'pro-plan';
export const mockStrongPassword = 'P@ssword123!';
export const mockHashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
export const mockStripeCustomerId = 'cus_1234567890';
export const mockLoginResponse: LoginResponse = {
  email: mockLoginEmail,
  userId: mockLoginUserId,
  plan: mockLoginPlan,
  firstName: mockLoginFirstName,
  lastName: mockLoginLastName,
  legacy: mockLegacy,
  token: mockLoginToken,
};

export const mockUser: UserRow = {
  user_id: mockLoginUserId,
  email: mockLoginEmail,
  first_name: mockLoginFirstName,
  last_name: mockLoginLastName,
  password_hash: mockHashedPassword,
  stripe_customer_id: mockStripeCustomerId,
  created_at: mockDate,
  updated_at: mockDate,
};
