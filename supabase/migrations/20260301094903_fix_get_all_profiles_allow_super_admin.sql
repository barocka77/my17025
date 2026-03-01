/*
  # Fix get_all_profiles to allow super_admin access

  1. Changes
    - Updated `get_all_profiles` function to include `super_admin` in the allowed roles
    - Previously only `admin` and `quality_manager` could call this function
    - Now `super_admin`, `admin`, and `quality_manager` can all view user profiles

  2. Security
    - super_admin retains full access consistent with other admin functions
*/

CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role app_role,
  department text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role app_role;
BEGIN
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  IF caller_role NOT IN ('admin', 'quality_manager', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Only admins, quality managers, and super admins can view all profiles.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.role, p.department, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;
