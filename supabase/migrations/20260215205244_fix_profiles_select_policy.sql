/*
  # Simplify Profiles RLS Policies

  1. Changes
    - Remove duplicate and conflicting SELECT policies on profiles table
    - Create a single, clear SELECT policy that allows:
      a) All authenticated users to read their own profile
      b) Admins and quality managers to read all profiles
  
  2. Security
    - Every authenticated user can always read their own profile
    - Only admin and quality_manager roles can view other users' profiles
    - Maintains existing INSERT and UPDATE policies
*/

-- Drop all existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Admins and Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create a single, clear SELECT policy
-- This allows users to ALWAYS see their own profile, and admins/quality_managers to see all profiles
CREATE POLICY "Users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Always allow users to read their own profile
    id = auth.uid()
    OR
    -- Allow admins and quality managers to read all profiles
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'quality_manager')
    )
  );
