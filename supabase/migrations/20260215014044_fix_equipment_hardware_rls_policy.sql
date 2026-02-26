/*
  # Fix equipment_hardware RLS policy

  1. Changes
    - Drop existing policy with incomplete configuration
    - Create separate policies for SELECT, INSERT, UPDATE, and DELETE
    - Each policy properly configured with USING and/or WITH CHECK clauses
  
  2. Security
    - Allows public access to all operations
    - Properly configured for all CRUD operations
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Enable all access" ON equipment_hardware;

-- Create separate policies for each operation
CREATE POLICY "Enable read access for all users"
  ON equipment_hardware
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON equipment_hardware
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
  ON equipment_hardware
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
  ON equipment_hardware
  FOR DELETE
  TO public
  USING (true);