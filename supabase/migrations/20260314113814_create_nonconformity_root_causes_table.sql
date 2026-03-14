/*
  # Create nonconformity_root_causes table

  ## Summary
  Creates the nonconformity_root_causes table to store root cause analysis (Kök Neden Analizi)
  entries linked to nonconformity records.

  ## New Tables

  ### nonconformity_root_causes
  Stores root cause analysis records for non-conformities.
  - `id` (uuid, primary key)
  - `nonconformity_id` (uuid, FK to nonconformities) - Parent nonconformity
  - `rca_category` (text) - Category: human, method, equipment, environment, material, management
  - `rca_description` (text) - Description of the root cause
  - `created_by` (uuid, FK to auth.users)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can read and insert
  - Managers can update and delete
*/

CREATE TABLE IF NOT EXISTS nonconformity_root_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonconformity_id uuid NOT NULL REFERENCES nonconformities(id) ON DELETE CASCADE,
  rca_category text NOT NULL DEFAULT 'human',
  rca_description text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT nonconformity_root_causes_rca_category_check
    CHECK (rca_category IN ('human','method','equipment','environment','material','management'))
);

ALTER TABLE nonconformity_root_causes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view root causes"
  ON nonconformity_root_causes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert root causes"
  ON nonconformity_root_causes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update root causes"
  ON nonconformity_root_causes FOR UPDATE
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

CREATE POLICY "Managers can delete root causes"
  ON nonconformity_root_causes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'quality_manager')
    )
  );
