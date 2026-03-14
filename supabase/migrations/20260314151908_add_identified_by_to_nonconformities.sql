/*
  # Add identified_by column to nonconformities

  ## Changes
  - Adds `identified_by` (uuid, nullable, FK to auth.users) column to the `nonconformities` table
  - This records which personnel member identified/reported the nonconformity
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'identified_by'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN identified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
