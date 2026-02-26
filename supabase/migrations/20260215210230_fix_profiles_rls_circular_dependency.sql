/*
  # Fix Profiles RLS Circular Dependency

  1. Problem
    - Current SELECT policy has circular dependency
    - When user tries to read their own profile, the EXISTS subquery
      also tries to read the same profile, causing RLS error
    - Users cannot see their own profile role

  2. Solution
    - Split into TWO separate policies:
      a) Simple policy: Users can ALWAYS read their own profile
      b) Admin policy: Admins can read ALL profiles
    - This eliminates circular dependency

  3. Security
    - Every authenticated user can read their own profile (basic requirement)
    - Only admin and quality_manager roles can view other users' profiles
    - Maintains existing INSERT and UPDATE policies
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Policy 1: Every user can read their OWN profile
-- This is simple and has NO circular dependency
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Admins and managers can read ALL profiles
-- This only applies AFTER they already have access to their own profile
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'quality_manager')
    )
  );