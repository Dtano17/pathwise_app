-- Migration: Add activity reports table for spam/fraud reporting
-- Created: 2025-11-17
-- Description: Allows users to report fraudulent or inappropriate community plans

CREATE TABLE IF NOT EXISTS activity_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  activity_id VARCHAR NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  reported_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fraud', 'inappropriate', 'copyright', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS activity_reports_activity_id_index ON activity_reports(activity_id);
CREATE INDEX IF NOT EXISTS activity_reports_reported_by_index ON activity_reports(reported_by);
CREATE INDEX IF NOT EXISTS activity_reports_status_index ON activity_reports(status);
CREATE INDEX IF NOT EXISTS activity_reports_created_at_index ON activity_reports(created_at DESC);

-- Prevent duplicate reports from same user for same activity
CREATE UNIQUE INDEX IF NOT EXISTS activity_reports_unique_user_activity ON activity_reports(activity_id, reported_by) WHERE status != 'dismissed';
