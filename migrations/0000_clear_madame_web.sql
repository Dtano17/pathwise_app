CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"badge_icon" text NOT NULL,
	"level" integer DEFAULT 1,
	"points" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"unlocked_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"timeline" jsonb DEFAULT '[]'::jsonb,
	"plan_summary" text,
	"is_public" boolean DEFAULT false,
	"share_token" varchar,
	"shareable_link" varchar,
	"social_text" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"share_title" text,
	"backdrop" text,
	"target_group_id" varchar,
	"view_count" integer DEFAULT 0,
	"like_count" integer DEFAULT 0,
	"trending_score" integer DEFAULT 0,
	"featured_in_community" boolean DEFAULT false,
	"creator_name" text,
	"creator_avatar" text,
	"rating" integer,
	"feedback" text,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"community_snapshot" jsonb,
	"status" text DEFAULT 'planning' NOT NULL,
	"completed_at" timestamp,
	"archived" boolean DEFAULT false,
	"copied_from_share_token" varchar,
	"is_archived" boolean DEFAULT false,
	"location" text,
	"budget" integer DEFAULT 0 NOT NULL,
	"budget_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"budget_buffer" integer DEFAULT 0 NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "activities_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "activity_change_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_activity_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"change_type" text NOT NULL,
	"change_description" text NOT NULL,
	"change_data" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_change_proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_activity_id" varchar NOT NULL,
	"proposed_by" varchar NOT NULL,
	"change_type" text NOT NULL,
	"task_id" varchar,
	"proposed_changes" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposal_note" text,
	"admin_response" text,
	"proposed_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"feedback_type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_permission_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"requested_by" varchar NOT NULL,
	"owner_id" varchar NOT NULL,
	"permission_type" text DEFAULT 'edit' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"requested_at" timestamp DEFAULT now(),
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" varchar NOT NULL,
	"email" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_imports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"source" text NOT NULL,
	"conversation_title" text,
	"chat_history" jsonb NOT NULL,
	"extracted_goals" jsonb DEFAULT '[]'::jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_shares" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"shared_by" varchar NOT NULL,
	"share_type" text NOT NULL,
	"activity_id" varchar,
	"group_id" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"invitation_message" text,
	"shared_at" timestamp DEFAULT now(),
	"responded_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" varchar NOT NULL,
	"source" text NOT NULL,
	"external_id" varchar,
	"name" text NOT NULL,
	"emails" jsonb DEFAULT '[]'::jsonb,
	"phones" jsonb DEFAULT '[]'::jsonb,
	"photo_url" varchar,
	"matched_user_id" varchar,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "external_oauth_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"activity_id" varchar NOT NULL,
	"canonical_version" jsonb NOT NULL,
	"is_public" boolean DEFAULT false,
	"share_token" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "group_activities_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "group_activity_feed" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text NOT NULL,
	"activity_type" text NOT NULL,
	"activity_title" text,
	"task_title" text,
	"group_activity_id" varchar,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar,
	"user_id" varchar,
	"role" text DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" varchar,
	"is_private" boolean DEFAULT false,
	"invite_code" varchar,
	"tracking_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"date" text NOT NULL,
	"mood" text NOT NULL,
	"reflection" text,
	"completed_tasks" jsonb DEFAULT '[]'::jsonb,
	"missed_tasks" jsonb DEFAULT '[]'::jsonb,
	"achievements" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lifestyle_planner_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_state" text DEFAULT 'intake' NOT NULL,
	"user_confirmed_add" boolean DEFAULT false NOT NULL,
	"slots" jsonb DEFAULT '{}'::jsonb,
	"external_context" jsonb DEFAULT '{}'::jsonb,
	"conversation_history" jsonb DEFAULT '[]'::jsonb,
	"generated_plan" jsonb,
	"is_complete" boolean DEFAULT false,
	"last_interaction_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enable_browser_notifications" boolean DEFAULT true,
	"enable_task_reminders" boolean DEFAULT true,
	"enable_deadline_warnings" boolean DEFAULT true,
	"enable_daily_planning" boolean DEFAULT false,
	"reminder_lead_time" integer DEFAULT 30,
	"daily_planning_time" text DEFAULT '09:00',
	"quiet_hours_start" text DEFAULT '22:00',
	"quiet_hours_end" text DEFAULT '08:00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"importance" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"date" text NOT NULL,
	"completed_count" integer DEFAULT 0,
	"total_count" integer DEFAULT 0,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduling_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"suggestion_type" text NOT NULL,
	"target_date" text NOT NULL,
	"suggested_tasks" jsonb DEFAULT '[]'::jsonb,
	"score" integer DEFAULT 0,
	"accepted" boolean DEFAULT false,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar,
	"created_by" varchar,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shared_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shared_goal_id" varchar,
	"assigned_to" varchar,
	"created_by" varchar,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"action" text NOT NULL,
	"action_data" jsonb DEFAULT '{}'::jsonb,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"feedback_type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"reminder_type" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"goal_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"due_date" timestamp,
	"time_estimate" text,
	"cost" integer,
	"cost_notes" text,
	"context" text,
	"archived" boolean DEFAULT false,
	"skipped" boolean DEFAULT false,
	"snooze_until" timestamp,
	"original_task_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_consent" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"allow_personalization" boolean DEFAULT false,
	"share_intentions" boolean DEFAULT false,
	"data_processing_consent" boolean DEFAULT false,
	"marketing_consent" boolean DEFAULT false,
	"consented_at" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"source_group_id" varchar,
	"actor_user_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lifestyle_goal_summary" text,
	"use_personalization" boolean DEFAULT false,
	"user_context_summary" text,
	"context_generated_at" timestamp,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"bio" text,
	"height_cm" integer,
	"weight_kg" integer,
	"birth_date" text,
	"sex" text,
	"ethnicity" text,
	"profile_visibility" text DEFAULT 'private',
	"profile_image_url_override" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_statistics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"period" text NOT NULL,
	"period_key" text NOT NULL,
	"stats" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"age" integer,
	"occupation" text,
	"location" text,
	"timezone" text DEFAULT 'UTC',
	"working_hours" jsonb,
	"fitness_level" text,
	"sleep_schedule" jsonb,
	"primary_goal_categories" jsonb DEFAULT '[]'::jsonb,
	"motivation_style" text,
	"difficulty_preference" text DEFAULT 'medium',
	"interests" jsonb DEFAULT '[]'::jsonb,
	"personality_type" text,
	"communication_style" text,
	"style_preferences" jsonb,
	"transportation_preferences" jsonb,
	"lifestyle_context" jsonb,
	"about_me" text,
	"current_challenges" jsonb DEFAULT '[]'::jsonb,
	"success_factors" jsonb DEFAULT '[]'::jsonb,
	"has_completed_tutorial" boolean DEFAULT false,
	"creator_points" integer DEFAULT 0,
	"creator_badges" jsonb DEFAULT '[]'::jsonb,
	"creator_level" varchar DEFAULT 'bronze',
	"total_plans_created" integer DEFAULT 0,
	"total_likes_received" integer DEFAULT 0,
	"total_copies_received" integer DEFAULT 0,
	"subscription_tier" varchar DEFAULT 'free',
	"subscription_status" varchar DEFAULT 'active',
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"plan_count" integer DEFAULT 0,
	"plan_count_reset_date" timestamp,
	"trial_ends_at" timestamp,
	"subscription_ends_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_target_group_id_groups_id_fk" FOREIGN KEY ("target_group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_change_logs" ADD CONSTRAINT "activity_change_logs_group_activity_id_group_activities_id_fk" FOREIGN KEY ("group_activity_id") REFERENCES "public"."group_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_change_logs" ADD CONSTRAINT "activity_change_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_change_proposals" ADD CONSTRAINT "activity_change_proposals_group_activity_id_group_activities_id_fk" FOREIGN KEY ("group_activity_id") REFERENCES "public"."group_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_change_proposals" ADD CONSTRAINT "activity_change_proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_change_proposals" ADD CONSTRAINT "activity_change_proposals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_feedback" ADD CONSTRAINT "activity_feedback_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_feedback" ADD CONSTRAINT "activity_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_permission_requests" ADD CONSTRAINT "activity_permission_requests_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_permission_requests" ADD CONSTRAINT "activity_permission_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_permission_requests" ADD CONSTRAINT "activity_permission_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_imports" ADD CONSTRAINT "chat_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_shares" ADD CONSTRAINT "contact_shares_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_shares" ADD CONSTRAINT "contact_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_shares" ADD CONSTRAINT "contact_shares_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_shares" ADD CONSTRAINT "contact_shares_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_matched_user_id_users_id_fk" FOREIGN KEY ("matched_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_oauth_tokens" ADD CONSTRAINT "external_oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_activities" ADD CONSTRAINT "group_activities_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_activities" ADD CONSTRAINT "group_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_activity_feed" ADD CONSTRAINT "group_activity_feed_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_activity_feed" ADD CONSTRAINT "group_activity_feed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_activity_feed" ADD CONSTRAINT "group_activity_feed_group_activity_id_group_activities_id_fk" FOREIGN KEY ("group_activity_id") REFERENCES "public"."group_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifestyle_planner_sessions" ADD CONSTRAINT "lifestyle_planner_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priorities" ADD CONSTRAINT "priorities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_stats" ADD CONSTRAINT "progress_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_suggestions" ADD CONSTRAINT "scheduling_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_goals" ADD CONSTRAINT "shared_goals_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_goals" ADD CONSTRAINT "shared_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_tasks" ADD CONSTRAINT "shared_tasks_shared_goal_id_shared_goals_id_fk" FOREIGN KEY ("shared_goal_id") REFERENCES "public"."shared_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_tasks" ADD CONSTRAINT "shared_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_tasks" ADD CONSTRAINT "shared_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_actions" ADD CONSTRAINT "task_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_actions" ADD CONSTRAINT "task_actions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_source_group_id_groups_id_fk" FOREIGN KEY ("source_group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_statistics" ADD CONSTRAINT "user_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_achievement_index" ON "achievements" USING btree ("user_id","achievement_type");--> statement-breakpoint
CREATE INDEX "activities_user_status_index" ON "activities" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "public_activities_index" ON "activities" USING btree ("is_public","created_at");--> statement-breakpoint
CREATE INDEX "group_activity_log_index" ON "activity_change_logs" USING btree ("group_activity_id","timestamp");--> statement-breakpoint
CREATE INDEX "user_activity_log_index" ON "activity_change_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_activity_proposal_index" ON "activity_change_proposals" USING btree ("group_activity_id","status");--> statement-breakpoint
CREATE INDEX "proposer_index" ON "activity_change_proposals" USING btree ("proposed_by");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_activity_feedback" ON "activity_feedback" USING btree ("user_id","activity_id");--> statement-breakpoint
CREATE INDEX "activity_feedback_index" ON "activity_feedback" USING btree ("activity_id","feedback_type");--> statement-breakpoint
CREATE INDEX "activity_request_index" ON "activity_permission_requests" USING btree ("activity_id","status");--> statement-breakpoint
CREATE INDEX "requester_index" ON "activity_permission_requests" USING btree ("requested_by","status");--> statement-breakpoint
CREATE INDEX "owner_status_index" ON "activity_permission_requests" USING btree ("owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_activity_task" ON "activity_tasks" USING btree ("activity_id","task_id");--> statement-breakpoint
CREATE INDEX "activity_order_index" ON "activity_tasks" USING btree ("activity_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provider_user" ON "auth_identities" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "contact_share_index" ON "contact_shares" USING btree ("contact_id","status");--> statement-breakpoint
CREATE INDEX "shared_by_index" ON "contact_shares" USING btree ("shared_by","share_type");--> statement-breakpoint
CREATE INDEX "owner_source_index" ON "contacts" USING btree ("owner_user_id","source");--> statement-breakpoint
CREATE INDEX "matched_user_index" ON "contacts" USING btree ("matched_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_synced_contact" ON "contacts" USING btree ("owner_user_id","source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_provider_token" ON "external_oauth_tokens" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_activity" ON "group_activities" USING btree ("group_id","activity_id");--> statement-breakpoint
CREATE INDEX "group_activity_index" ON "group_activities" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_feed_index" ON "group_activity_feed" USING btree ("group_id","timestamp");--> statement-breakpoint
CREATE INDEX "user_feed_index" ON "group_activity_feed" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "unique_group_user" ON "group_memberships" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "user_date_index" ON "task_actions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "user_action_index" ON "task_actions" USING btree ("user_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_task_feedback" ON "task_feedback" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "task_feedback_index" ON "task_feedback" USING btree ("task_id","feedback_type");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_consent" ON "user_consent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_notifications_user_id_read_at_index" ON "user_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_preferences" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_profile" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_period" ON "user_statistics" USING btree ("user_id","period","period_key");--> statement-breakpoint
CREATE INDEX "user_period_index" ON "user_statistics" USING btree ("user_id","period");