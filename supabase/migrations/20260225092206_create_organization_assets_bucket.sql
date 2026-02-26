/*
  # Create organization-assets storage bucket

  1. Storage
    - Create `organization-assets` bucket for organization logos
    - Path format: {ORG_ID}/logo.png
  2. Policies
    - Authenticated users can read any organization asset
    - Admin and quality_manager can upload/update/delete organization assets
  3. Security
    - Enable RLS on organizations table
    - Add select policy for authenticated users
    - Add update policy for admin/quality_manager only
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view organization assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'organization-assets');

CREATE POLICY "Managers can upload organization assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can update organization assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete organization assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can update organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );
