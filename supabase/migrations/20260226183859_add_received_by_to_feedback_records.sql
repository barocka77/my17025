/*
  # Add received_by column to feedback_records

  1. Modified Tables
    - `feedback_records`
      - `received_by` (text, nullable) - Name of the personnel who received the feedback

  2. Notes
    - This column stores the name of the user who received/accepted the feedback
    - Used for tracking accountability in feedback management workflow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'received_by'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN received_by text;
  END IF;
END $$;