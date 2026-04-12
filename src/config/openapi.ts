import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
// Import from zod-extended so the Zod factory methods are already wrapped by
// extendZodWithOpenApi before any schema passed to registry.register() is created.
import { z } from './zod-extended';
import {
  LoginSchema,
  CreateUserSchema,
  UpdateUserSchema,
  GenresSchema,
  LogoutSchema,
  SubscribeSchema,
} from '../schemas/user.schemas';
import {
  UpsertDocumentSchema,
  UpsertStorySchema,
  UpsertWorldSchema,
} from '../schemas/story.schemas';

export const registry = new OpenAPIRegistry();

// ── Security scheme ──────────────────────────────────────────────
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ── Reusable response schemas ────────────────────────────────────
const StatusOkSchema = registry.register('StatusOk', z.object({ status: z.literal('ok') }));

const ErrorSchema = registry.register(
  'Error',
  z.object({ error: z.string(), details: z.record(z.string(), z.array(z.string())).optional() }),
);

const DocumentSchema = registry.register(
  'Document',
  z.object({
    documentId: z.string().uuid(),
    storyId: z.string().uuid(),
    title: z.string(),
    body: z.string(),
    predecessorId: z.string().uuid().nullable(),
    successorId: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const StorySchema = registry.register(
  'Story',
  z.object({
    storyId: z.string().uuid(),
    worldId: z.string().uuid(),
    title: z.string(),
    documents: z.array(DocumentSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const WorldSchema = registry.register(
  'World',
  z.object({
    worldId: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string(),
    stories: z.array(StorySchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const LoginResponseSchema = registry.register(
  'LoginResponse',
  z.object({
    email: z.string().email(),
    userId: z.string().uuid(),
    plan: z.enum(['pro-plan', 'max-plan']).nullable(),
    firstName: z.string(),
    lastName: z.string(),
    legacy: z.array(WorldSchema),
    token: z.string(),
  }),
);

// ── Registered request schemas ───────────────────────────────────
const LoginRequest = registry.register('LoginRequest', LoginSchema);
const CreateUserRequest = registry.register('CreateUserRequest', CreateUserSchema);
const UpdateUserRequest = registry.register('UpdateUserRequest', UpdateUserSchema);
const GenresRequest = registry.register('GenresRequest', GenresSchema);
const LogoutRequest = registry.register('LogoutRequest', LogoutSchema);
const SubscribeRequest = registry.register('SubscribeRequest', SubscribeSchema);
const UpsertDocumentRequest = registry.register('UpsertDocumentRequest', UpsertDocumentSchema);
const UpsertStoryRequest = registry.register('UpsertStoryRequest', UpsertStorySchema);
const UpsertWorldRequest = registry.register('UpsertWorldRequest', UpsertWorldSchema);

const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const secured = [{ bearerAuth: [] }];

const err400 = { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } };
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } };
const err409 = { description: 'Conflict', content: { 'application/json': { schema: ErrorSchema } } };
const err500 = { description: 'Internal server error', content: { 'application/json': { schema: ErrorSchema } } };

// ── User paths ────────────────────────────────────────────────────
registry.registerPath({
  method: 'post', path: '/user/login', tags: ['User'],
  summary: 'Log in and receive a JWT',
  request: { body: json(LoginRequest) },
  responses: {
    200: { description: 'Login successful', ...json(LoginResponseSchema) },
    400: err400, 401: err401, 500: err500,
  },
});

registry.registerPath({
  method: 'post', path: '/user/logout', tags: ['User'],
  summary: 'Log out and revoke JWT',
  security: secured,
  request: { body: json(LogoutRequest) },
  responses: { 200: { description: 'Logged out', ...json(StatusOkSchema) }, 401: err401, 500: err500 },
});

registry.registerPath({
  method: 'post', path: '/user/create', tags: ['User'],
  summary: 'Create a new user account',
  request: { body: json(CreateUserRequest) },
  responses: { 201: { description: 'User created', ...json(StatusOkSchema) }, 400: err400, 409: err409, 500: err500 },
});

registry.registerPath({
  method: 'post', path: '/user', tags: ['User'],
  summary: 'Update the authenticated user',
  security: secured,
  request: { body: json(UpdateUserRequest) },
  responses: { 200: { description: 'User updated' }, 400: err400, 401: err401, 500: err500 },
});

registry.registerPath({
  method: 'post', path: '/user/genres', tags: ['User'],
  summary: 'Add genres to the authenticated user',
  security: secured,
  request: { body: json(GenresRequest) },
  responses: {
    200: { description: 'Genres added', ...json(z.object({ genres: z.array(z.string()) })) },
    400: err400, 401: err401, 500: err500,
  },
});

registry.registerPath({
  method: 'post', path: '/user/deleteme', tags: ['User'],
  summary: 'Delete current user (placeholder)',
  security: secured,
  responses: { 200: { description: 'OK', ...json(StatusOkSchema) }, 401: err401 },
});

registry.registerPath({
  method: 'get', path: '/users/billing-history/{userId}', tags: ['User'],
  summary: 'Get billing history for a user (last 2 years)',
  security: secured,
  request: { params: z.object({ userId: z.string().uuid() }) },
  responses: { 200: { description: 'Billing history' }, 400: err400, 401: err401, 500: err500 },
});

registry.registerPath({
  method: 'post', path: '/user/subscribe', tags: ['User'],
  summary: 'Subscribe to a plan via Stripe',
  security: secured,
  request: { body: json(SubscribeRequest) },
  responses: { 200: { description: 'Subscription created' }, 400: err400, 401: err401, 500: err500 },
});

// ── Story paths ───────────────────────────────────────────────────
registry.registerPath({
  method: 'post', path: '/story/document', tags: ['Story'],
  summary: 'Create or update a document',
  security: secured,
  request: { body: json(UpsertDocumentRequest) },
  responses: { 200: { description: 'World containing the document', ...json(WorldSchema) }, 400: err400, 401: err401, 404: err404, 500: err500 },
});

registry.registerPath({
  method: 'post', path: '/story/story', tags: ['Story'],
  summary: 'Create or update a story',
  security: secured,
  request: { body: json(UpsertStoryRequest) },
  responses: { 200: { description: 'World containing the story', ...json(WorldSchema) }, 400: err400, 401: err401, 404: err404, 500: err500 },
});

registry.registerPath({
  method: 'post', path: '/story/world', tags: ['Story'],
  summary: 'Create or update a world',
  security: secured,
  request: { body: json(UpsertWorldRequest) },
  responses: { 200: { description: 'The world', ...json(WorldSchema) }, 400: err400, 401: err401, 500: err500 },
});

// ── Document generator ────────────────────────────────────────────
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Writers Bot API',
      version: '1.0.0',
      description: 'Writing management platform — documents, stories, worlds, and billing.',
    },
    servers: [{ url: process.env.API_URL ?? 'http://localhost:3000' }],
  });
}
