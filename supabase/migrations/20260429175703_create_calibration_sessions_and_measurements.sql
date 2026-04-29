/*
  # Calibration Sessions & Measurements

  ## Purpose
  Replace flat `calibration_results` model with a session + measurement row
  structure that matches the certificate layout (Kademe / Ölçüm Şartları /
  Referans / Kalibre / Sapma / Belirsizlik).

  ## New Tables
  - `calibration_sessions`
    - Session-level metadata: calibrated device, uncertainty, constant
      conditions (voltage, base frequency), notes.
  - `calibration_measurements`
    - One row per certificate line.
    - Groups by `phase_group` (3_FAZ / L1 / L2 / L3) and `angle` (60 / -60).
    - Stores measurement conditions, reference and calibrated readings,
      deviation, and the raw AI extraction JSON for traceability.

  ## Security
  - RLS enabled on both tables.
  - Users can manage their own sessions and nested measurements.
*/

CREATE TABLE IF NOT EXISTS calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_label text DEFAULT '',
  calibrated_device text DEFAULT '',
  reference_device text DEFAULT '',
  uncertainty numeric,
  uncertainty_unit text DEFAULT 'kHz',
  default_voltage numeric DEFAULT 220,
  default_frequency numeric DEFAULT 50,
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS calibration_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  row_order integer DEFAULT 0,
  phase_group text DEFAULT '3_FAZ',
  angle_label text DEFAULT '60 deg',

  current_a numeric,
  voltage_v numeric,
  frequency_hz numeric,
  power_factor numeric,

  reference_value numeric,
  reference_unit text DEFAULT 'kHz',
  calibrated_value numeric,
  calibrated_unit text DEFAULT 'kHz',
  deviation numeric,
  uncertainty numeric,

  source_image_name text DEFAULT '',
  raw_extraction jsonb DEFAULT '{}'::jsonb,
  notes text DEFAULT ''
);

ALTER TABLE calibration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own sessions"
  ON calibration_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users view own sessions"
  ON calibration_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users update own sessions"
  ON calibration_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users delete own sessions"
  ON calibration_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users insert own measurements"
  ON calibration_measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM calibration_sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Users view own measurements"
  ON calibration_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calibration_sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Users update own measurements"
  ON calibration_measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calibration_sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calibration_sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Users delete own measurements"
  ON calibration_measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calibration_sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cal_sessions_user ON calibration_sessions(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cal_measurements_session ON calibration_measurements(session_id, row_order);
