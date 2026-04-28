/*
  # Create calibration_results table

  ## Purpose
  Stores structured electrical measurement data extracted from calibration device photos
  via AI (Anthropic Vision). Each row represents one measurement session imported from
  a photo of a Reference Counter and Multimeter screen.

  ## New Tables
  - `calibration_results`
    - `id` (uuid, primary key)
    - `created_at` (timestamptz) — import timestamp
    - `created_by` (uuid) — user who imported the record
    - `device_label` (text) — optional label for the measurement session
    - `image_url` (text) — storage URL of the uploaded photo (optional)
    - Phase measurements for L1, L2, L3:
      - `l1_u_v`, `l2_u_v`, `l3_u_v` — Voltage in Volts
      - `l1_i_a`, `l2_i_a`, `l3_i_a` — Current in Amps
      - `l1_p_w`, `l2_p_w`, `l3_p_w` — Active Power in Watts
      - `l1_q_var`, `l2_q_var`, `l3_q_var` — Reactive Power in VAr
      - `l1_s_va`, `l2_s_va`, `l3_s_va` — Apparent Power in VA
      - `l1_cos_phi`, `l2_cos_phi`, `l3_cos_phi` — Power Factor
    - `frequency_hz` (numeric) — Frequency in Hz
    - `voltage_ref` (numeric) — Reference voltage
    - `notes` (text) — optional free-text notes
    - `source_image_names` (text[]) — original file names of uploaded images

  ## Security
  - RLS enabled
  - Authenticated users can insert and select their own records
  - Admins/quality_managers/super_admin can view all records
*/

CREATE TABLE IF NOT EXISTS calibration_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_label text DEFAULT '',
  image_url text DEFAULT '',
  source_image_names text[] DEFAULT '{}',

  -- L1 Phase
  l1_u_v numeric,
  l1_i_a numeric,
  l1_p_w numeric,
  l1_q_var numeric,
  l1_s_va numeric,
  l1_cos_phi numeric,

  -- L2 Phase
  l2_u_v numeric,
  l2_i_a numeric,
  l2_p_w numeric,
  l2_q_var numeric,
  l2_s_va numeric,
  l2_cos_phi numeric,

  -- L3 Phase
  l3_u_v numeric,
  l3_i_a numeric,
  l3_p_w numeric,
  l3_q_var numeric,
  l3_s_va numeric,
  l3_cos_phi numeric,

  -- Summary
  frequency_hz numeric,
  voltage_ref numeric,
  notes text DEFAULT ''
);

ALTER TABLE calibration_results ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own records
CREATE POLICY "Authenticated users can insert calibration results"
  ON calibration_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can view their own records
CREATE POLICY "Users can view own calibration results"
  ON calibration_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Users can update their own records
CREATE POLICY "Users can update own calibration results"
  ON calibration_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own records
CREATE POLICY "Users can delete own calibration results"
  ON calibration_results
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Index for fast user-based queries
CREATE INDEX IF NOT EXISTS idx_calibration_results_created_by ON calibration_results(created_by);
CREATE INDEX IF NOT EXISTS idx_calibration_results_created_at ON calibration_results(created_at DESC);
