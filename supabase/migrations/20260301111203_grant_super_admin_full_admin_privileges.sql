/*
  # Grant super_admin full admin privileges across all functions

  1. Changes
    - `unlock_feedback_record()`: Now allows super_admin to unlock records (was admin-only)
    - `is_manager()`: Now includes super_admin in the manager check
    - `update_profile_by_id()` (both overloads): Now allows super_admin to update other users' profiles

  2. Important Notes
    - super_admin users now have all the same permissions as admin users throughout the system
    - This covers record unlocking, profile updates, and manager-level access via is_manager()
*/

-- 1. Fix unlock_feedback_record: allow super_admin
CREATE OR REPLACE FUNCTION unlock_feedback_record(p_record_id uuid, p_reason text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_locked boolean;
BEGIN
  SELECT role::text INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Bu islemi sadece admin kullanicilar yapabilir.'
      USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Kilit acma nedeni zorunludur.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT is_locked INTO v_locked
  FROM feedback_records
  WHERE id = p_record_id;

  IF v_locked IS NULL THEN
    RAISE EXCEPTION 'Kayit bulunamadi.'
      USING ERRCODE = 'P0003';
  END IF;

  IF v_locked = false THEN
    RETURN json_build_object('success', true, 'message', 'Kayit zaten acik.');
  END IF;

  UPDATE feedback_records
  SET is_locked = false,
      locked_at = null,
      locked_by = null,
      unlocked_at = now(),
      unlocked_by = auth.uid(),
      unlock_reason = trim(p_reason),
      status = 'Açık'
  WHERE id = p_record_id;

  RETURN json_build_object('success', true, 'message', 'Kayit kilidi basariyla acildi.');
END;
$$;

-- 2. Fix is_manager: include super_admin
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'quality_manager', 'super_admin')
  );
END;
$$;

-- 3. Fix update_profile_by_id (9-param version without audit fields)
DROP FUNCTION IF EXISTS update_profile_by_id(uuid, text, text, text, text, date, text, text, text);

CREATE FUNCTION update_profile_by_id(
  target_id uuid,
  p_full_name text,
  p_job_title text,
  p_academic_title text,
  p_education_status text,
  p_start_date date,
  p_phone text,
  p_authorized_areas text,
  p_experience_years text
)
RETURNS void
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

-- 4. Fix update_profile_by_id (10-param version with audit fields)
DROP FUNCTION IF EXISTS update_profile_by_id(uuid, text, text, text, text, date, text, text, text, text);

CREATE FUNCTION update_profile_by_id(
  target_id uuid,
  p_full_name text,
  p_job_title text,
  p_academic_title text,
  p_education_status text,
  p_start_date date,
  p_phone text,
  p_authorized_areas text,
  p_experience_years text,
  p_updated_by text
)
RETURNS void
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
