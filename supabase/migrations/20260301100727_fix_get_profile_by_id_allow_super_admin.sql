/*
  # Fix get_profile_by_id to allow super_admin access

  1. Changes
    - Updated `get_profile_by_id` function permission check to include `super_admin` role
    - Previously only `admin` and `quality_manager` could view other users' profiles
    - Now `super_admin` can also view any user's profile

  2. Important Notes
    - This fixes the "Profil bulunamadi" error when super_admin users try to view personnel profiles
    - Function signature (return types) preserved exactly as before
*/

DROP FUNCTION IF EXISTS get_profile_by_id(uuid);

CREATE FUNCTION get_profile_by_id(target_id uuid)
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
  created_by text,
  updated_by text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.role INTO caller_role FROM profiles p WHERE p.id = auth.uid();

  IF auth.uid() <> target_id AND caller_role NOT IN ('admin', 'quality_manager', 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.email, p.full_name, p.role, p.job_title, p.academic_title,
    p.authorized_areas, p.experience_years, p.start_date, p.education_status,
    p.phone, p.department,
    p.created_by, p.updated_by, p.updated_at
  FROM profiles p
  WHERE p.id = target_id;
END;
$$;
