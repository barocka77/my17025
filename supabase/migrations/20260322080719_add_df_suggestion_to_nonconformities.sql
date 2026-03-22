/*
  # Add df_suggestion column to nonconformities

  ## Summary
  Adds a new nullable text column `df_suggestion` to the `nonconformities` table
  to persist the AI-generated corrective action suggestion so it survives page
  refreshes and drawer reopens.

  ## Changes
  - `nonconformities.df_suggestion` (text, nullable) — stores the last saved
    AI-generated or manually edited DF (Düzeltici Faaliyet) suggestion text
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'df_suggestion'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN df_suggestion text;
  END IF;
END $$;
