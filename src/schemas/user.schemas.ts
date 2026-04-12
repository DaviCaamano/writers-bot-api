import { z } from '../config/zod-extended';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LogoutSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export const CreateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters'),
});

export const UpdateUserSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    password: z.string().min(8).max(128).optional(),
    genres: z.array(z.string().min(1).max(100)).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const GenresSchema = z.object({
  genres: z
    .array(z.string().min(1, 'Genre cannot be empty').max(100))
    .min(1, 'At least one genre is required'),
});

export const DeleteMeSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export const BillingHistoryParamsSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export const SubscribeSchema = z.object({
  planType: z.enum(['pro-plan', 'max-plan'], {
    message: 'planType must be "pro-plan" or "max-plan"',
  }),
  yearPlan: z.boolean().optional().default(false),
  paymentMethodId: z.string().min(1, 'paymentMethodId is required (from Stripe.js)'),
});

// Inferred types — use these instead of manually typing req.body
export type LoginBody = z.infer<typeof LoginSchema>;
export type LogoutBody = z.infer<typeof LogoutSchema>;
export type CreateUserBody = z.infer<typeof CreateUserSchema>;
export type UpdateUserBody = z.infer<typeof UpdateUserSchema>;
export type GenresBody = z.infer<typeof GenresSchema>;
export type DeleteMeBody = z.infer<typeof DeleteMeSchema>;
export type BillingHistoryParams = z.infer<typeof BillingHistoryParamsSchema>;
export type SubscribeBody = z.infer<typeof SubscribeSchema>;
