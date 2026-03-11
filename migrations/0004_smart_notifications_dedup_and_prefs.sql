-- Ensure smart notification deduplication at the DB level
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX smart_notifications_dedup_unique
      ON smart_notifications (user_id, source_type, source_id, notification_type);
  EXCEPTION WHEN duplicate_table THEN NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add seasonal/time-change preferences (if not present)
DO $$
BEGIN
  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN enable_seasonal_alerts BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE notification_preferences
      ADD COLUMN enable_time_change_alerts BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;
