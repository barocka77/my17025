/*
  # Enable RLS on record_signatures and add signer_id

  1. Modified Tables
    - `record_signatures`
      - Add `signer_id` (uuid, FK to auth.users) for ownership tracking
      - Enable Row Level Security

  2. Security
    - SELECT: All authenticated users can view signatures for any record
    - INSERT: Authenticated users can add signatures (signer_id must match auth.uid())
    - DELETE: Only the signer themselves or admin/quality_manager can remove a signature
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'record_signatures' AND column_name = 'signer_id'
  ) THEN
    ALTER TABLE record_signatures ADD COLUMN signer_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

ALTER TABLE record_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signatures"
  ON record_signatures
  FOR SELECT
  TO authenticated
  USING (true = true);

CREATE POLICY "Authenticated users can insert own signatures"
  ON record_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = signer_id);

CREATE POLICY "Signers or managers can delete signatures"
  ON record_signatures
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = signer_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );
