-- Migration: Add social post URLs and credit system
-- Created: 2025-11-17
-- Description: Adds social media post URL fields to planner_profiles and creates user credit tracking tables

-- Add social media post URL fields to planner_profiles
ALTER TABLE planner_profiles ADD COLUMN IF NOT EXISTS twitter_post_url VARCHAR;
ALTER TABLE planner_profiles ADD COLUMN IF NOT EXISTS instagram_post_url VARCHAR;
ALTER TABLE planner_profiles ADD COLUMN IF NOT EXISTS threads_post_url VARCHAR;
ALTER TABLE planner_profiles ADD COLUMN IF NOT EXISTS linkedin_post_url VARCHAR;

-- Create user_credits table for share-to-earn rewards
CREATE TABLE IF NOT EXISTS user_credits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS user_credits_user_id_index ON user_credits(user_id);

-- Create credit_transactions table for tracking all credit movements
CREATE TABLE IF NOT EXISTS credit_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn_publish', 'earn_adoption', 'earn_completion', 'earn_shares', 'spend_plan', 'bonus', 'adjustment')),
  activity_id VARCHAR REFERENCES activities(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for credit_transactions
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_index ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_type_index ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS credit_transactions_activity_id_index ON credit_transactions(activity_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_index ON credit_transactions(created_at);

-- Add sharing metrics to activities table (if not already exists)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS adoption_count INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- Create index on sharing metrics for leaderboard queries
CREATE INDEX IF NOT EXISTS activities_share_count_index ON activities(share_count DESC) WHERE is_public = true AND featured_in_community = true;
CREATE INDEX IF NOT EXISTS activities_adoption_count_index ON activities(adoption_count DESC) WHERE is_public = true AND featured_in_community = true;
