CREATE TYPE "public"."plan_type" AS ENUM('pro-plan', 'max-plan');--> statement-breakpoint
CREATE TABLE "authentication" (
	"auth_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "authentication_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "billing" (
	"billing_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_type" "plan_type" NOT NULL,
	"is_year_plan" boolean DEFAULT false NOT NULL,
	"amount_cents" integer NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_invoice_id" varchar(255),
	"billed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"document_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"predecessor_id" uuid,
	"successor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_no_self_predecessor" CHECK ("documents"."predecessor_id" <> "documents"."document_id"),
	CONSTRAINT "chk_no_self_successor" CHECK ("documents"."successor_id"   <> "documents"."document_id")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"genre_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"genre" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"plan_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_type" "plan_type" NOT NULL,
	"is_year_plan" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_subscription_id" varchar(255),
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"story_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"stripe_customer_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"world_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "authentication" ADD CONSTRAINT "authentication_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_story_id_stories_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("story_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_predecessor_id_documents_document_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."documents"("document_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_successor_id_documents_document_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."documents"("document_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genres" ADD CONSTRAINT "genres_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_world_id_worlds_world_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("world_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_authentication_user_id" ON "authentication" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_authentication_token" ON "authentication" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_billing_user_id" ON "billing" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_billing_billed_at" ON "billing" USING btree ("billed_at");--> statement-breakpoint
CREATE INDEX "idx_documents_story_id" ON "documents" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_documents_predecessor_id" ON "documents" USING btree ("predecessor_id");--> statement-breakpoint
CREATE INDEX "idx_documents_successor_id" ON "documents" USING btree ("successor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_user_id_genre_unique" ON "genres" USING btree ("user_id","genre");--> statement-breakpoint
CREATE INDEX "idx_genres_user_id" ON "genres" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_plans_one_active_per_user" ON "plans" USING btree ("user_id") WHERE "plans"."is_active" = TRUE;--> statement-breakpoint
CREATE INDEX "idx_plans_user_id" ON "plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_stories_world_id" ON "stories" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "idx_worlds_user_id" ON "worlds" USING btree ("user_id");