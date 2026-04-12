CREATE TABLE IF NOT EXISTS "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) UNIQUE NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255) UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "genres" (
	"genre_id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"genre" varchar(255) NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_genre" ON "genres" ("user_id","genre");
CREATE INDEX IF NOT EXISTS "genres_user_id_idx" ON "genres" ("user_id");

CREATE TABLE IF NOT EXISTS "plans" (
	"plan_id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_type" varchar(50) NOT NULL,
	"is_year_plan" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_subscription_id" varchar(255),
	"start_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "plans_user_id_idx" ON "plans" ("user_id");

CREATE TABLE IF NOT EXISTS "billing" (
	"billing_id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_type" varchar(50) NOT NULL,
	"is_year_plan" boolean DEFAULT false NOT NULL,
	"amount_cents" serial NOT NULL,
	"stripe_payment_intent_id" varchar(255) NOT NULL,
	"stripe_invoice_id" varchar(255),
	"billed_at" timestamp DEFAULT now() NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "billing_user_id_idx" ON "billing" ("user_id");
