/*
  # Create document_master_list table

  1. New Tables
    - `document_master_list`
      - `id` (uuid, primary key)
      - `sira_no` (integer) - sequential document number
      - `dokuman_kodu` (text) - document code
      - `dokuman_adi` (text) - document name
      - `ilk_yayin_tarihi` (date) - initial publication date
      - `revizyon_tarihi` (date) - revision date
      - `rev_no` (text) - revision number
      - `guncellik_kontrol_tarihi` (date) - currency check date
      - `aktif` (boolean, default true) - soft delete flag
      - `created_at` (timestamptz) - record creation timestamp
      - `updated_at` (timestamptz) - record update timestamp

  2. Security
    - Enable RLS on `document_master_list` table
    - Admin users can perform all CRUD operations
    - Other authenticated users can only SELECT active records

  3. Notes
    - Only admin role has full access (insert, update, delete)
    - Non-admin authenticated users have read-only access to active documents
*/

CREATE TABLE IF NOT EXISTS document_master_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sira_no integer NOT NULL,
  dokuman_kodu text NOT NULL DEFAULT '',
  dokuman_adi text NOT NULL DEFAULT '',
  ilk_yayin_tarihi date,
  revizyon_tarihi date,
  rev_no text NOT NULL DEFAULT '',
  guncellik_kontrol_tarihi date,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_master_list ENABLE ROW LEVEL SECURITY;

-- Admin can read all records (including soft-deleted)
CREATE POLICY "Admin can select all document_master_list"
  ON document_master_list
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Non-admin authenticated users can read only active records
CREATE POLICY "Authenticated users can select active document_master_list"
  ON document_master_list
  FOR SELECT
  TO authenticated
  USING (
    aktif = true
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can insert
CREATE POLICY "Admin can insert document_master_list"
  ON document_master_list
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update
CREATE POLICY "Admin can update document_master_list"
  ON document_master_list
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can delete
CREATE POLICY "Admin can delete document_master_list"
  ON document_master_list
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
