/*
  # Add Düzeltme Faaliyeti fields to nonconformities

  ## Summary
  Adds three new columns to the `nonconformities` table to support
  the "Düzeltme Faaliyeti" (initial corrective response) section in the
  Uygunsuzluk Analizi drawer.

  ## New Columns
  - `correction_action` (text) - Description of the immediate corrective action taken
  - `correction_responsible` (text) - Person responsible for the correction action
  - `correction_deadline` (date) - Deadline for completing the correction action

  ## Notes
  - These fields represent the FIRST response to a nonconformity (Düzeltme),
    distinct from Düzeltici Faaliyet (DF) which is a deeper corrective action.
  - No RLS changes needed; existing nonconformities table policies apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'correction_action'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN correction_action text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'correction_responsible'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN correction_responsible text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'correction_deadline'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN correction_deadline date;
  END IF;
END $$;
