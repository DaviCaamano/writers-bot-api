import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  index,
  check,
  PgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { Plan } from '@/types/enum/plan';

// Enums
export const planTypeEnum = pgEnum('plan_type', Plan);

// Users
export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Authentication
export const authentication = pgTable(
  'authentication',
  {
    authId: uuid('auth_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('idx_authentication_user_id').on(t.userId),
    index('idx_authentication_token').on(t.token),
  ],
);

// Genres
export const genres = pgTable(
  'genres',
  {
    genreId: uuid('genre_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    genre: varchar('genre', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('genres_user_id_genre_unique').on(t.userId, t.genre),
    index('idx_genres_user_id').on(t.userId),
  ],
);

// Worlds
export const worlds = pgTable(
  'worlds',
  {
    worldId: uuid('world_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_worlds_user_id').on(t.userId)],
);

// Stories
export const stories = pgTable(
  'stories',
  {
    storyId: uuid('story_id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.worldId, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    predecessorId: uuid('predecessor_id').references((): PgColumn => stories.storyId, {
      onDelete: 'set null',
    }),
    successorId: uuid('successor_id').references((): PgColumn => stories.storyId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_stories_world_id').on(t.worldId),
    index('idx_stories_predecessor_id').on(t.predecessorId),
    index('idx_stories_successor_id').on(t.successorId),
    check('chk_story_no_self_predecessor', sql`${t.predecessorId} <> ${t.storyId}`),
    check('chk_story_no_self_successor', sql`${t.successorId} <> ${t.storyId}`),
  ],
);

// Documents
export const documents = pgTable(
  'documents',
  {
    documentId: uuid('document_id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body').notNull().default(''),
    predecessorId: uuid('predecessor_id').references((): PgColumn => documents.documentId, {
      onDelete: 'set null',
    }),
    successorId: uuid('successor_id').references((): PgColumn => documents.documentId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_documents_story_id').on(t.storyId),
    index('idx_documents_predecessor_id').on(t.predecessorId),
    index('idx_documents_successor_id').on(t.successorId),
    check('chk_no_self_predecessor', sql`${t.predecessorId} <> ${t.documentId}`),
    check('chk_no_self_successor', sql`${t.successorId}   <> ${t.documentId}`),
  ],
);

// Plans
export const plans = pgTable(
  'plans',
  {
    planId: uuid('plan_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    planType: planTypeEnum('plan_type').notNull(),
    isYearPlan: boolean('is_year_plan').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Only one active plan per user at a time
    uniqueIndex('idx_plans_one_active_per_user')
      .on(t.userId)
      .where(sql`${t.isActive} = TRUE`),
    index('idx_plans_user_id').on(t.userId),
  ],
);

// Billing
export const billing = pgTable(
  'billing',
  {
    billingId: uuid('billing_id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    planType: planTypeEnum('plan_type').notNull(),
    isYearPlan: boolean('is_year_plan').notNull().default(false),
    amountCents: integer('amount_cents').notNull(),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
    billedAt: timestamp('billed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_billing_user_id').on(t.userId), index('idx_billing_billed_at').on(t.billedAt)],
);
