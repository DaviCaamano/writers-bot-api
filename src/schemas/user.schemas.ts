import { z } from '@/config/zod-extended';
import { Plan } from '@/types/enum/plan';

// Password strength schema (reused for creation & update)
const strongPassword = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be under 128 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

// Schemas
export const LoginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.email('Invalid email address'),
  password: strongPassword,
});

export const UpdateUserSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    password: strongPassword.optional(),
    genres: z.array(z.string().min(1).max(100)).max(50, 'Maximum 50 genres allowed').optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const GenresSchema = z.object({
  genres: z
    .array(z.string().min(1, 'Genre cannot be empty').max(100))
    .min(1, 'At least one genre is required')
    .max(50, 'Maximum 50 genres allowed'),
});

export const BillingHistoryParamsSchema = z.object({
  userId: z.uuid('userId must be a valid UUID'),
});

export const SubscribeSchema = z.object({
  planType: z.enum(Plan, { message: 'planType must be "pro-plan" or "max-plan"' }),
  yearPlan: z.boolean().optional().default(false),
  paymentMethodId: z.string().min(1, 'paymentMethodId is required (from Stripe.js)'),
});

// Inferred types — use these instead of manually typing req.body
export type LoginBody = z.infer<typeof LoginSchema>;
export type CreateUserBody = z.infer<typeof CreateUserSchema>;
export type UpdateUserBody = z.infer<typeof UpdateUserSchema>;
export type GenresBody = z.infer<typeof GenresSchema>;
export type BillingHistoryParams = z.infer<typeof BillingHistoryParamsSchema>;
export type SubscribeBody = z.infer<typeof SubscribeSchema>;
