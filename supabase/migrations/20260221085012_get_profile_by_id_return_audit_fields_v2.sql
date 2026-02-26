/*
  # Update get_profile_by_id – Return Audit Fields

  ## Summary
  Drops and recreates get_profile_by_id to include created_by, updated_by,
  and updated_at in the return set so the Personnel detail view can display
  audit information to admin users.

  ## Changes
  - Drops existing function (return type change requires DROP + CREATE)
  - Recreates with additional audit columns: created_by, updated_by, updated_at
  - No logic or security changes
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
    p.phone, p.department,
    p.created_by, p.updated_by, p.updated_at
  FROM profiles p
  WHERE p.id = target_id;
END;
$$;
