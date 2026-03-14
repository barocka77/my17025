/*
  # Add analysis_team column to nonconformities

  ## Summary
  Adds an `analysis_team` column to the `nonconformities` table to store the list
  of personnel selected to investigate the root cause and effects of a non-conformity.

  ## Changes

  ### Modified Tables
  - `nonconformities`
    - Added `analysis_team` (uuid[], nullable) — array of profile IDs representing
      the members of the analysis team assigned at the time of opening the NC.

  ## Notes
  1. Stored as an array of UUIDs referencing profiles.id (no FK constraint to allow
     flexibility if a user is later removed).
  2. Defaults to NULL (no team assigned).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'analysis_team'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN analysis_team uuid[];
  END IF;
END $$;
