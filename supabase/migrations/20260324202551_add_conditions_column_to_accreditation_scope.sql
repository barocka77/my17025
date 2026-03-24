/*
  # Add `conditions` Column to accreditation_scope

  ## Summary
  Adds the "Ölçüm Şartları" (Measurement Conditions) column that is required to
  match the official 5-column TÜRKAK accreditation certificate layout.

  ## Modified Table: accreditation_scope
  - Added `conditions` (text, NOT NULL DEFAULT '') — Measurement conditions
    displayed in the third column of the official TÜRKAK scope document.

  ## Notes
  - All existing rows will receive an empty string as their default value.
  - No data is lost; only an additive column change is made.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accreditation_scope' AND column_name = 'conditions'
  ) THEN
    ALTER TABLE accreditation_scope
      ADD COLUMN conditions text NOT NULL DEFAULT '';
  END IF;
END $$;
