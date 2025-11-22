ALTER TABLE "activities" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "authentication_type" text DEFAULT 'local';--> statement-breakpoint
CREATE UNIQUE INDEX "user_content_hash_unique" ON "activities" USING btree ("user_id","content_hash");