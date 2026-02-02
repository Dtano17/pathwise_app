-- ============================================
-- Smart Event-Driven Notification System
-- Database Migration Script
-- ============================================
-- Run this script manually in your PostgreSQL database
-- to create the tables needed for the smart notification system.
-- ============================================

-- 1. Smart Notifications Table
-- Stores all scheduled notifications (event-driven)
CREATE TABLE IF NOT EXISTS smart_notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'activity' | 'task' | 'goal' | 'streak' | 'media' | 'accountability' | 'group'
  source_id VARCHAR,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  metadata JSONB DEFAULT '{}',
  route TEXT, -- Deep link route
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'cancelled'
  sent_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for smart_notifications
CREATE INDEX IF NOT EXISTS smart_notifications_user_scheduled_idx
  ON smart_notifications(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS smart_notifications_pending_idx
  ON smart_notifications(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS smart_notifications_source_idx
  ON smart_notifications(source_type, source_id);

-- 2. User Streaks Table
-- Tracks user activity streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TEXT, -- YYYY-MM-DD format
  streak_start_date TEXT,
  total_active_days INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Accountability Checkins Table
-- Weekly/monthly/quarterly goal check-ins
CREATE TABLE IF NOT EXISTS accountability_checkins (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL, -- 'weekly' | 'monthly' | 'quarterly'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  goals_count INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending' | 'completed' | 'skipped'
  notes TEXT,
  notification_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for accountability_checkins
CREATE INDEX IF NOT EXISTS accountability_checkins_user_type_idx
  ON accountability_checkins(user_id, checkin_type);

-- 4. Notification History Table (Analytics)
-- Tracks all sent notifications for engagement analytics
CREATE TABLE IF NOT EXISTS notification_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT,
  haptic_type TEXT,
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  action_taken TEXT, -- 'view' | 'complete' | 'snooze' | 'dismiss' | 'ignore'
  action_taken_at TIMESTAMP,
  source_type TEXT,
  source_id VARCHAR,
  metadata JSONB DEFAULT '{}',
  delivery_latency_ms INTEGER,
  engagement_latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for notification_history
CREATE INDEX IF NOT EXISTS notification_history_user_idx
  ON notification_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS notification_history_analytics_idx
  ON notification_history(notification_type, action_taken);

-- 5. Enhanced Notification Preferences
-- Add new columns to the existing notification_preferences table
-- (Run these ALTER statements - they will error harmlessly if columns exist)

DO $$
BEGIN
  -- Accountability preferences
  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN enable_accountability_reminders BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN enable_streak_reminders BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN enable_media_release_alerts BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN enable_trip_prep_reminders BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN weekly_checkin_day TEXT DEFAULT 'sunday';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN weekly_checkin_time TEXT DEFAULT '10:00';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN streak_reminder_time TEXT DEFAULT '18:00';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN channel_settings JSONB DEFAULT '{
        "tasks": {"enabled": true, "sound": true, "vibrate": true, "priority": "high"},
        "activities": {"enabled": true, "sound": true, "vibrate": true, "priority": "high"},
        "groups": {"enabled": true, "sound": true, "vibrate": true, "priority": "high"},
        "streaks": {"enabled": true, "sound": true, "vibrate": true, "priority": "default"},
        "achievements": {"enabled": true, "sound": true, "vibrate": true, "priority": "default"},
        "assistant": {"enabled": true, "sound": false, "vibrate": false, "priority": "low"}
      }';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Verify tables were created
SELECT 'smart_notifications' AS table_name, COUNT(*) AS row_count FROM smart_notifications
UNION ALL
SELECT 'user_streaks', COUNT(*) FROM user_streaks
UNION ALL
SELECT 'accountability_checkins', COUNT(*) FROM accountability_checkins
UNION ALL
SELECT 'notification_history', COUNT(*) FROM notification_history;

-- Done!
-- The smart notification system tables have been created.
