/*
  # Add Audit Columns to Profiles Table

  ## Summary
  Adds three audit tracking columns to the profiles table to record who created
  and last updated each personnel record, and when the last update occurred.

  ## New Columns
  - `created_by` (text): Email of the user who created the record
  - `updated_by` (text): Email of the user who last updated the record
  - `updated_at` (timestamptz): Timestamp of the last update

  ## Notes
  - All columns are nullable so existing rows are unaffected
  - No destructive changes are made
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz;
  END IF;
END $$;
