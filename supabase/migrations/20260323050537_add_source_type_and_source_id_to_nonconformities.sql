/*
  # Add source_type and source_id to nonconformities

  ## Summary
  Extends the `nonconformities` table with two new nullable columns that enable
  traceability back to the originating module record.

  ## New Columns

  ### nonconformities
  - `source_type` (text, nullable) — identifies the module that generated this NC,
    e.g. 'internal_audit', 'customer_feedback'. Allows filtering and badging in the
    NC list view without joining other tables.
  - `source_id` (uuid, nullable) — stores the primary-key of the originating record
    in the source module (e.g. the internal_audit_plans.id for audit-originated NCs).

  ## Notes
  1. Both columns are nullable so existing records are unaffected.
  2. No RLS changes required — the columns inherit the table's existing policies.
  3. An index on (source_type, source_id) is added to support efficient lookups when
     navigating from a source record to its derived NCs.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN source_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN source_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nonconformities_source
  ON nonconformities (source_type, source_id)
  WHERE source_type IS NOT NULL;
