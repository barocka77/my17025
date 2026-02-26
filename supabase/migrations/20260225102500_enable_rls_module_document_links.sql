/*
  # Enable RLS on module_document_links

  1. Security
    - Enable RLS on `module_document_links` table
    - Add SELECT policy for all authenticated users
    - Add INSERT policy for admin and quality_manager roles
    - Add UPDATE policy for admin and quality_manager roles
    - Add DELETE policy for admin role only

  2. Notes
    - All authenticated users can read links (needed for PDF generation)
    - Only admin/quality_manager can create or update bindings
    - Only admin can remove bindings
*/

ALTER TABLE module_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view module document links"
  ON module_document_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admin and quality_manager can insert module document links"
  ON module_document_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Admin and quality_manager can update module document links"
  ON module_document_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Admin can delete module document links"
  ON module_document_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
