/*
  # Personnel Module Support

  ## Overview
  This migration adds the necessary database functions and policies
  for the Personnel Management module (LS.03 & FR.27 standards).

  ## Changes

  ### 1. New RPC Function: get_personnel_list
  - Returns all profiles with full personnel fields
  - Accessible by all authenticated users
  - Uses SECURITY DEFINER to bypass the "view own profile" RLS restriction
  - Returns: id, email, full_name, role, job_title, academic_title,
    authorized_areas, experience_years, start_date, education_status,
    phone, department, created_at

  ### 2. New RLS Policy: Users can update own profile
  - Allows any authenticated user to update their own row in profiles
  - Scoped to their own user_id only (auth.uid() = id)
  - Complements the existing "Managers can update profiles" policy

  ## Notes
  - The get_personnel_list function has no role restriction so all staff
    can view the personnel directory (consistent with ISO 17025 transparency)
  - Self-update policy does not expose the role column in the UI for
    non-managers; that is enforced at the application layer
*/

-- Function to get all personnel profiles with extended fields
CREATE OR REPLACE FUNCTION get_personnel_list()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role app_role,
  job_title text,
  academic_title text,
  authorized_areas text,
  experience_years text,
  start_date date,
  education_status text,
  phone text,
  department text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.job_title,
    p.academic_title,
    p.authorized_areas,
    p.experience_years,
    p.start_date,
    p.education_status,
    p.phone,
    p.department,
    p.created_at
  FROM profiles p
  ORDER BY p.full_name ASC NULLS LAST;
END;
$$;

-- Allow users to update their own profile (for self-service edits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
