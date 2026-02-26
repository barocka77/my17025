/*
  # Add attachments column to feedback_records

  ## Summary
  Adds a `attachments` column to the `feedback_records` table to store file paths
  uploaded to the `feedback-files` Supabase storage bucket.

  ## Changes
  - `feedback_records`: new column `attachments text[]` — array of storage paths

  ## Notes
  - Default is an empty array so existing rows are unaffected
  - Paths follow the format: feedback/{record_id}/{filename}
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN attachments text[] DEFAULT '{}';
  END IF;
END $$;
