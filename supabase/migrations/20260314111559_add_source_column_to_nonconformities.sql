/*
  # Add source column to nonconformities

  ## Changes
  - Adds `source` (text) column to the `nonconformities` table
  - Stores the origin of the non-conformity (e.g. internal_audit, customer_feedback, etc.)
  - Defaults to NULL (optional field)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'source'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN source text;
  END IF;
END $$;
