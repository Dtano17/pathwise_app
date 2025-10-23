-- Migration: Add budget breakdown and cost tracking fields
-- Created: 2025-10-22
-- Purpose: Enable detailed budget tracking for activities and tasks

-- Add budget breakdown fields to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS budget_breakdown JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS budget_buffer INTEGER;

-- Add cost tracking fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS cost INTEGER,
ADD COLUMN IF NOT EXISTS cost_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN activities.budget_breakdown IS 'Detailed budget breakdown from AI planner with category, amount, and notes';
COMMENT ON COLUMN activities.budget_buffer IS 'Recommended buffer for unexpected costs (in cents)';
COMMENT ON COLUMN tasks.cost IS 'Optional cost associated with this task (in cents)';
COMMENT ON COLUMN tasks.cost_notes IS 'Details about the cost (e.g., "Round-trip flight LAX-NYC")';
