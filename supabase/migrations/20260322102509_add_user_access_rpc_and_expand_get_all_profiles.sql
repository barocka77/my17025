/*
  # Add update_user_access RPC and expand get_all_profiles

  ## Summary
  Provides the backend infrastructure for managing per-user access flags
  directly from the Admin Panel UI, removing the need for manual DB edits.

  ## Changes

  ### 1. get_all_profiles (updated)
  - Dropped and recreated to return two additional boolean columns:
    `approved` and `feature_notepad`
  - Existing callers receive the extra columns without breaking changes

  ### 2. update_user_access (new RPC)
  - Accepts `target_user_id`, `new_approved`, `new_feature_notepad`
  - Both flag parameters are nullable — pass NULL to leave a column unchanged
  - SECURITY DEFINER so it can bypass RLS on behalf of the caller
  - Caller must have role `admin` or `super_admin`; all other callers get an
    access-denied exception

  ## Security
  - Only `admin` and `super_admin` roles may invoke `update_user_access`
  - Both functions are SECURITY DEFINER with explicit search_path to prevent
    search-path injection
*/

DROP FUNCTION IF EXISTS get_all_profiles();

CREATE FUNCTION get_all_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role app_role,
  department text,
  created_at timestamptz,
  approved boolean,
  feature_notepad boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department,
    p.created_at,
    p.approved,
    p.feature_notepad
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;


CREATE OR REPLACE FUNCTION update_user_access(
  target_user_id uuid,
  new_approved boolean DEFAULT NULL,
  new_feature_notepad boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role app_role;
BEGIN
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Only admin or super_admin can update user access flags.';
  END IF;

  IF new_approved IS NOT NULL THEN
    UPDATE profiles SET approved = new_approved WHERE id = target_user_id;
  END IF;

  IF new_feature_notepad IS NOT NULL THEN
    UPDATE profiles SET feature_notepad = new_feature_notepad WHERE id = target_user_id;
  END IF;
END;
$$;
