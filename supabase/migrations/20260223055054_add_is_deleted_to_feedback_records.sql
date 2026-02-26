/*
  # Add is_deleted column to feedback_records

  1. Changes
    - Adds `is_deleted` boolean column to `feedback_records` with default false
    - Backfills all existing rows with is_deleted = false
    - This enables soft delete functionality without affecting the existing `status` business column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;
