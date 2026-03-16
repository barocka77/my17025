
/*
  # Add name column to suppliers table

  The application queries the 'name' column but the table has 'company_name'.
  This migration adds a 'name' column and copies existing data from 'company_name'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'name'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN name text NOT NULL DEFAULT '';
  END IF;
END $$;

UPDATE suppliers SET name = company_name WHERE name = '' OR name IS NULL;
