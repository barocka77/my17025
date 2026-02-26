/*
  # Update update_profile_by_id RPC – Add Audit Fields

  ## Summary
  Updates the existing update_profile_by_id function to also set updated_by
  (the email of the caller) and updated_at (current timestamp) whenever a
  profile is updated.

  ## Changes
  - Adds p_updated_by (text) parameter
  - Sets updated_by = p_updated_by and updated_at = now() on every UPDATE
*/

CREATE OR REPLACE FUNCTION update_profile_by_id(
  target_id uuid,
  p_full_name text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_academic_title text DEFAULT NULL,
  p_education_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_authorized_areas text DEFAULT NULL,
  p_experience_years text DEFAULT NULL,
  p_updated_by text DEFAULT NULL
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
    experience_years = p_experience_years,
    updated_by       = p_updated_by,
    updated_at       = now()
  WHERE id = target_id;
END;
$$;
