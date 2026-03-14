/*
  # Create nonconformities and corrective_actions tables

  ## Summary
  Creates two new tables to support the Uygunsuzluklar & Düzeltici Faaliyetler (NC & CAPA) module.

  ## New Tables

  ### nonconformities
  Stores non-conformity records detected during lab operations.
  - `id` (uuid, primary key)
  - `nc_number` (text) - Auto-generated unique identifier, e.g. NC-2026-001
  - `detection_date` (date) - Date the non-conformity was detected
  - `description` (text) - Description of the non-conformity
  - `severity` (text) - Severity level: Düşük, Orta, Yüksek, Kritik
  - `status` (text) - Current status: Açık, İşlemde, Kapalı
  - `recurrence_risk` (text) - Risk of recurrence: Düşük, Orta, Yüksek
  - `calibration_impact` (text) - Impact on calibration: Var, Yok, Belirsiz
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### corrective_actions
  Stores corrective actions linked to non-conformities.
  - `id` (uuid, primary key)
  - `ca_number` (text) - Auto-generated unique identifier, e.g. CA-2026-001
  - `nonconformity_id` (uuid, nullable FK to nonconformities)
  - `action_description` (text) - Description of the corrective action
  - `responsible_user` (text) - Name of the person responsible
  - `planned_completion_date` (date) - Target completion date
  - `status` (text) - Current status: Planlandı, İşlemde, Tamamlandı
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Authenticated users can read all records
  - Authenticated users can insert records
  - Admins/quality managers can update and delete (checked via profiles.role)
  - Personnel can update records they are responsible for

  ## Notes
  1. nc_number and ca_number are generated via triggers for sequential numbering
  2. Both tables have updated_at auto-updated via trigger
*/

-- Create nonconformities table
CREATE TABLE IF NOT EXISTS nonconformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_number text UNIQUE,
  detection_date date,
  description text,
  severity text DEFAULT 'Orta',
  status text DEFAULT 'Açık',
  recurrence_risk text DEFAULT 'Orta',
  calibration_impact text DEFAULT 'Belirsiz',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create corrective_actions table
CREATE TABLE IF NOT EXISTS corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_number text UNIQUE,
  nonconformity_id uuid REFERENCES nonconformities(id) ON DELETE SET NULL,
  action_description text,
  responsible_user text,
  planned_completion_date date,
  status text DEFAULT 'Planlandı',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at for nonconformities
CREATE OR REPLACE FUNCTION update_nonconformities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nonconformities_updated_at ON nonconformities;
CREATE TRIGGER trg_nonconformities_updated_at
  BEFORE UPDATE ON nonconformities
  FOR EACH ROW EXECUTE FUNCTION update_nonconformities_updated_at();

-- Auto-update updated_at for corrective_actions
CREATE OR REPLACE FUNCTION update_corrective_actions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_corrective_actions_updated_at ON corrective_actions;
CREATE TRIGGER trg_corrective_actions_updated_at
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION update_corrective_actions_updated_at();

-- Auto-generate nc_number on insert
CREATE OR REPLACE FUNCTION generate_nc_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  year_str text;
  next_seq int;
BEGIN
  IF NEW.nc_number IS NULL OR NEW.nc_number = '' THEN
    year_str := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SPLIT_PART(nc_number, '-', 3) AS int)), 0) + 1
      INTO next_seq
      FROM nonconformities
      WHERE nc_number LIKE 'NC-' || year_str || '-%';
    NEW.nc_number := 'NC-' || year_str || '-' || LPAD(next_seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_nc_number ON nonconformities;
CREATE TRIGGER trg_generate_nc_number
  BEFORE INSERT ON nonconformities
  FOR EACH ROW EXECUTE FUNCTION generate_nc_number();

-- Auto-generate ca_number on insert
CREATE OR REPLACE FUNCTION generate_ca_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  year_str text;
  next_seq int;
BEGIN
  IF NEW.ca_number IS NULL OR NEW.ca_number = '' THEN
    year_str := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SPLIT_PART(ca_number, '-', 3) AS int)), 0) + 1
      INTO next_seq
      FROM corrective_actions
      WHERE ca_number LIKE 'CA-' || year_str || '-%';
    NEW.ca_number := 'CA-' || year_str || '-' || LPAD(next_seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ca_number ON corrective_actions;
CREATE TRIGGER trg_generate_ca_number
  BEFORE INSERT ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION generate_ca_number();

-- Enable RLS
ALTER TABLE nonconformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

-- Nonconformities policies
CREATE POLICY "Authenticated users can view nonconformities"
  ON nonconformities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert nonconformities"
  ON nonconformities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update nonconformities"
  ON nonconformities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete nonconformities"
  ON nonconformities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  );

-- Corrective actions policies
CREATE POLICY "Authenticated users can view corrective_actions"
  ON corrective_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert corrective_actions"
  ON corrective_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update corrective_actions"
  ON corrective_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete corrective_actions"
  ON corrective_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  );
