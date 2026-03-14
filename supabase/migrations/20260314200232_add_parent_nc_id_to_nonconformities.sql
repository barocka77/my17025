/*
  # Add parent_nc_id to nonconformities table

  ## Summary
  Adds a `parent_nc_id` column to the `nonconformities` table to support
  the automatic creation of a follow-up NC record when a corrective action
  is marked as having a recurrence ("Düzeltici Faaliyet Sonrası Uygunsuzluk Tekrar Etmektedir").

  ## Changes
  - `parent_nc_id` (uuid, nullable FK to nonconformities.id): References the original NC
    that led to this follow-up record.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'parent_nc_id'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN parent_nc_id uuid REFERENCES nonconformities(id) ON DELETE SET NULL;
  END IF;
END $$;
