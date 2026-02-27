/*
  # Create signatures storage bucket

  1. Storage
    - Create private `signatures` bucket for signature image files
    - Path convention: signatures/{module_key}/{record_id}/{signature_id}.png

  2. Security Policies
    - SELECT: All authenticated users can view signature images
    - INSERT: Authenticated users can upload their own signatures
    - DELETE: Signer or admin/quality_manager can remove signature files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view signatures"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can upload signatures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can delete own signatures"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (
      auth.uid()::text = (storage.foldername(name))[3]
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'quality_manager')
      )
    )
  );
