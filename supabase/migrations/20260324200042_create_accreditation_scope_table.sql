/*
  # Create Accreditation Scope Table

  ## Summary
  Creates a table to manage the laboratory's ISO/IEC 17025 accreditation scope entries.
  Each row represents one row of the official accreditation scope document.

  ## New Table: accreditation_scope
  - `id` (uuid, PK) — auto-generated
  - `parameter` (text, NOT NULL) — Measured quantity / parameter name (Ölçülen Büyüklük / Parametre)
  - `method` (text, NOT NULL) — Test/measurement method reference (e.g. TS EN ISO ...) (Deney / Ölçüm Metodu)
  - `range` (text) — Measurement range (Ölçüm Aralığı)
  - `uncertainty` (text) — Expanded uncertainty (Genişletilmiş Belirsizlik)
  - `sort_order` (integer) — Manual sort order for display / PDF ordering
  - `created_at` (timestamptz) — Row creation timestamp
  - `updated_at` (timestamptz) — Row last-updated timestamp

  ## Security
  - RLS enabled
  - SELECT: all authenticated users (organizational reference data)
  - INSERT/UPDATE/DELETE: only admin, quality_manager, and super_admin roles

  ## Trigger
  - `set_updated_at` trigger keeps `updated_at` current on every UPDATE
*/

CREATE TABLE IF NOT EXISTS accreditation_scope (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter    text NOT NULL DEFAULT '',
  method       text NOT NULL DEFAULT '',
  range        text NOT NULL DEFAULT '',
  uncertainty  text NOT NULL DEFAULT '',
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_accreditation_scope_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accreditation_scope_updated_at ON accreditation_scope;
CREATE TRIGGER trg_accreditation_scope_updated_at
  BEFORE UPDATE ON accreditation_scope
  FOR EACH ROW EXECUTE FUNCTION update_accreditation_scope_updated_at();

-- Enable RLS
ALTER TABLE accreditation_scope ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user may read the scope (it is org-wide reference data)
CREATE POLICY "Authenticated users can read accreditation scope"
  ON accreditation_scope FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT: admin roles only
CREATE POLICY "Admins can insert accreditation scope"
  ON accreditation_scope FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'quality_manager', 'super_admin')
    )
  );

-- UPDATE: admin roles only
CREATE POLICY "Admins can update accreditation scope"
  ON accreditation_scope FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'quality_manager', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'quality_manager', 'super_admin')
    )
  );

-- DELETE: admin roles only
CREATE POLICY "Admins can delete accreditation scope"
  ON accreditation_scope FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'quality_manager', 'super_admin')
    )
  );
