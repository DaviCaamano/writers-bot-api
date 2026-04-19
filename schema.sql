-- =============================================================
-- Writers Bot API - PostgreSQL Database Schema
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE plan_type AS ENUM ('pro-plan', 'max-plan');


-- =============================================================
-- USERS
-- =============================================================

CREATE TABLE users (
    user_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT       NOT NULL,
    stripe_customer_id VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
-- AUTHENTICATION
-- Stores active JWTs. Logout destroys the row.
-- =============================================================

CREATE TABLE authentication (
    auth_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_authentication_user_id ON authentication(user_id);
CREATE INDEX idx_authentication_token   ON authentication(token);


-- =============================================================
-- GENRES
-- Many genres per user, each stored as a separate row.
-- =============================================================

CREATE TABLE genres (
    story_id    UUID        NOT NULL REFERENCES stories(story_id) ON DELETE CASCADE,
    genre       VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (story_id, genre)
);

CREATE INDEX idx_genres_user_id ON genres(story_id);


-- =============================================================
-- WORLDS
-- Top-level grouping (a fictional universe / setting).
-- A user's full collection of worlds is their "Legacy."
-- =============================================================

CREATE TABLE worlds (
    world_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worlds_user_id ON worlds(user_id);


-- =============================================================
-- STORIES
-- A collection of documents belonging to one world.
-- Represents a single book in a series.
-- =============================================================

CREATE TABLE stories (
    story_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id        UUID        NOT NULL REFERENCES worlds(world_id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    predecessor_id  UUID        REFERENCES stories(story_id) ON DELETE SET NULL,
    successor_id    UUID        REFERENCES stories(story_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_story_no_self_predecessor CHECK (predecessor_id <> story_id),
    CONSTRAINT chk_story_no_self_successor   CHECK (successor_id   <> story_id)
);

CREATE INDEX idx_stories_world_id       ON stories(world_id);
CREATE INDEX idx_stories_predecessor_id ON stories(predecessor_id);
CREATE INDEX idx_stories_successor_id   ON stories(successor_id);


-- =============================================================
-- DOCUMENTS
-- A single chapter or section. Forms a doubly-linked list
-- within a story (predecessor / successor chain).
-- =============================================================

CREATE TABLE documents (
    document_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id        UUID        NOT NULL REFERENCES stories(story_id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    body            TEXT        NOT NULL DEFAULT '',
    predecessor_id  UUID        REFERENCES documents(document_id) ON DELETE SET NULL,
    successor_id    UUID        REFERENCES documents(document_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Enforce that a document cannot be its own predecessor or successor
    CONSTRAINT chk_no_self_predecessor CHECK (predecessor_id <> document_id),
    CONSTRAINT chk_no_self_successor   CHECK (successor_id   <> document_id)
);

CREATE INDEX idx_documents_story_id       ON documents(story_id);
CREATE INDEX idx_documents_predecessor_id ON documents(predecessor_id);
CREATE INDEX idx_documents_successor_id   ON documents(successor_id);


-- =============================================================
-- PLANS
-- Active subscription per user.
-- Only one active plan per user at a time (enforced by partial index).
-- =============================================================

CREATE TABLE plans (
    plan_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plan_type           plan_type   NOT NULL,
    is_year_plan        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    stripe_subscription_id VARCHAR(255),
    start_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active plan per user at a time
CREATE UNIQUE INDEX idx_plans_one_active_per_user
    ON plans(user_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_plans_user_id ON plans(user_id);


-- =============================================================
-- BILLING
-- Full billing history. Used to determine introductory pricing
-- (first 3 months billed = discounted rate).
-- =============================================================

CREATE TABLE billing (
    billing_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plan_type               plan_type   NOT NULL,
    is_year_plan            BOOLEAN     NOT NULL DEFAULT FALSE,
    amount_cents            INTEGER     NOT NULL,           -- stored in cents to avoid float issues
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id       VARCHAR(255),
    billed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_user_id   ON billing(user_id);
CREATE INDEX idx_billing_billed_at ON billing(billed_at);
