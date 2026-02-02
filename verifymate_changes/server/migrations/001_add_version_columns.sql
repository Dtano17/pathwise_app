-- Migration: Add version columns and indexes for optimistic locking
-- Date: 2025-12-22
-- Purpose: Enable conflict detection when multiple users edit the same activity/task

-- Add version column to activities table (defaults to 1 for existing rows)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Create index on activities.updated_at for fast conflict checks
CREATE INDEX IF NOT EXISTS idx_activities_updated_at ON activities(updated_at);

-- Create index on activities.version for version-based queries
CREATE INDEX IF NOT EXISTS idx_activities_version ON activities(version);

-- Add updatedAt column to tasks table (defaults to created_at for existing rows)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Backfill tasks.updated_at with created_at for existing rows
UPDATE tasks
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after backfill
ALTER TABLE tasks
ALTER COLUMN updated_at SET NOT NULL;

-- Add version column to tasks table (defaults to 1 for existing rows)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Create index on tasks.updated_at for fast conflict checks
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- Create index on tasks.version for version-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_version ON tasks(version);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_add_version_columns.sql completed successfully';
  RAISE NOTICE 'Added version columns to activities and tasks tables';
  RAISE NOTICE 'Added updated_at column to tasks table';
  RAISE NOTICE 'Created indexes for optimistic locking performance';
END $$;
