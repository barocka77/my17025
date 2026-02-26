/*
  # Admin Panel RLS Policies

  1. Changes
    - Add policy for quality_manager and admin to view all profiles
    - Add policy for quality_manager and admin to update user roles
    - Ensure personnel can only view their own profile
  
  2. Security
    - Only quality_manager and admin roles can view all users
    - Only quality_manager and admin roles can update user roles
    - Personnel can only access their own profile data
*/

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update user roles" ON profiles;

-- Allow managers (quality_manager and admin) to view all profiles
CREATE POLICY "Managers can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('quality_manager', 'admin')
    )
    OR id = auth.uid()
  );

-- Allow managers to update user roles
CREATE POLICY "Managers can update user roles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('quality_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('quality_manager', 'admin')
    )
  );

-- Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);