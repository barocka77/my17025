/*
  # Add get_profile_by_id and update_profile_by_id Functions

  ## Problem
  The SELECT RLS policy on profiles only allows users to see their own row
  (id = auth.uid()). This means managers cannot load another user's profile
  in the detail view, causing "Güncelleme başarısız" errors even after the
  UPDATE policy was fixed — the profile was never loaded in the first place.

  ## Solution
  Two SECURITY DEFINER functions that bypass RLS:

  1. get_profile_by_id(target_id uuid)
     - Returns a single profile row for the given id
     - Callable by: the profile owner themselves OR admin/quality_manager roles
     - Others get an exception

  2. update_profile_by_id(target_id, ...)
     - Updates a profile row by id
     - Callable by: the profile owner themselves OR admin/quality_manager roles
     - Returns the updated row
*/

-- Function to fetch a single profile (bypasses row-level SELECT restriction)
CREATE OR REPLACE FUNCTION get_profile_by_id(target_id uuid)
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
  department text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_role app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.role INTO caller_role FROM profiles p WHERE p.id = auth.uid();

  IF auth.uid() <> target_id AND caller_role NOT IN ('admin', 'quality_manager') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.email, p.full_name, p.role, p.job_title, p.academic_title,
    p.authorized_areas, p.experience_years, p.start_date, p.education_status,
    p.phone, p.department
  FROM profiles p
  WHERE p.id = target_id;
END;
$$;

-- Function to update a profile (bypasses row-level UPDATE restriction for managers)
CREATE OR REPLACE FUNCTION update_profile_by_id(
  target_id uuid,
  p_full_name text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_academic_title text DEFAULT NULL,
  p_education_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_authorized_areas text DEFAULT NULL,
  p_experience_years text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_role app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.role INTO caller_role FROM profiles p WHERE p.id = auth.uid();

  IF auth.uid() <> target_id AND caller_role NOT IN ('admin', 'quality_manager') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE profiles SET
    full_name        = p_full_name,
    job_title        = p_job_title,
    academic_title   = p_academic_title,
    education_status = p_education_status,
    start_date       = p_start_date,
    phone            = p_phone,
    authorized_areas = p_authorized_areas,
    experience_years = p_experience_years
  WHERE id = target_id;
END;
$$;
