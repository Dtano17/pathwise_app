CREATE TABLE "activity_bookmarks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"reported_by" varchar NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"activity_id" varchar,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plan_engagement" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"user_id" varchar,
	"action_type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "planner_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"twitter_handle" varchar,
	"instagram_handle" varchar,
	"threads_handle" varchar,
	"website_url" varchar,
	"twitter_post_url" varchar,
	"instagram_post_url" varchar,
	"threads_post_url" varchar,
	"linkedin_post_url" varchar,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"approved_at" timestamp,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "planner_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"last_reset" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_pins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "bookmark_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "community_status" text DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "unpublished_at" timestamp;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "last_published_hash" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "seasonal_tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "share_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "adoption_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "completion_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "source_type" text DEFAULT 'community_unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "planner_profile_id" varchar;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "verification_badge" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "plan_type" text DEFAULT 'community' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_pinned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "sponsor_name" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "sponsor_logo_url" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "sponsor_cta_text" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "sponsor_cta_url" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "issuing_agency" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "location_radius" integer;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_role" varchar DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_name" text;--> statement-breakpoint
ALTER TABLE "activity_bookmarks" ADD CONSTRAINT "activity_bookmarks_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_bookmarks" ADD CONSTRAINT "activity_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_reports" ADD CONSTRAINT "activity_reports_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_reports" ADD CONSTRAINT "activity_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_reports" ADD CONSTRAINT "activity_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_engagement" ADD CONSTRAINT "plan_engagement_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_engagement" ADD CONSTRAINT "plan_engagement_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_profiles" ADD CONSTRAINT "planner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_profiles" ADD CONSTRAINT "planner_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pins" ADD CONSTRAINT "user_pins_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pins" ADD CONSTRAINT "user_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_activity_bookmark" ON "activity_bookmarks" USING btree ("user_id","activity_id");--> statement-breakpoint
CREATE INDEX "activity_bookmark_index" ON "activity_bookmarks" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "user_bookmark_index" ON "activity_bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_reports_activity_id_index" ON "activity_reports" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_reports_reported_by_index" ON "activity_reports" USING btree ("reported_by");--> statement-breakpoint
CREATE INDEX "activity_reports_status_index" ON "activity_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "activity_reports_created_at_index" ON "activity_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_index" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_type_index" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_transactions_activity_id_index" ON "credit_transactions" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_index" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trending_calculation_index" ON "plan_engagement" USING btree ("action_type","activity_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_recency_index" ON "plan_engagement" USING btree ("activity_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_engagement_index" ON "plan_engagement" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_profile_index" ON "planner_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_status_index" ON "planner_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "user_credits_user_id_index" ON "user_credits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_activity_pin" ON "user_pins" USING btree ("user_id","activity_id");--> statement-breakpoint
CREATE INDEX "activity_pin_index" ON "user_pins" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "user_pin_index" ON "user_pins" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_planner_profile_id_planner_profiles_id_fk" FOREIGN KEY ("planner_profile_id") REFERENCES "public"."planner_profiles"("id") ON DELETE set null ON UPDATE no action;