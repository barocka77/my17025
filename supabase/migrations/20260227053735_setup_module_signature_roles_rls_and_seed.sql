/*
  # Set up module_signature_roles: RLS, unique constraint, and seed data

  1. Modified Tables
    - `module_signature_roles`
      - Enable Row Level Security
      - Add unique constraint on (module_key, role_name) to prevent duplicate roles per module

  2. Security
    - SELECT: All authenticated users can read roles
    - INSERT/UPDATE/DELETE: Only admin and quality_manager can manage roles

  3. Seed Data
    - customer_feedback module: Hazirlayan (order 1), Kontrol Eden (order 2), Onaylayan (order 3, final approval)
*/

ALTER TABLE module_signature_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'module_signature_roles'::regclass
    AND conname = 'module_signature_roles_module_key_role_name_key'
  ) THEN
    ALTER TABLE module_signature_roles
      ADD CONSTRAINT module_signature_roles_module_key_role_name_key
      UNIQUE (module_key, role_name);
  END IF;
END $$;

CREATE POLICY "Authenticated users can view signature roles"
  ON module_signature_roles
  FOR SELECT
  TO authenticated
  USING (true = true);

CREATE POLICY "Admins and quality managers can insert signature roles"
  ON module_signature_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Admins and quality managers can update signature roles"
  ON module_signature_roles
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

CREATE POLICY "Admins and quality managers can delete signature roles"
  ON module_signature_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'quality_manager')
    )
  );

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
VALUES
  ('customer_feedback', 'Hazirlayan', 1, false),
  ('customer_feedback', 'Kontrol Eden', 2, false),
  ('customer_feedback', 'Onaylayan', 3, true)
ON CONFLICT (module_key, role_name) DO NOTHING;
