/*
  # Create Admin Functions with SECURITY DEFINER

  1. New Functions
    - get_all_profiles(): Returns all user profiles (bypasses RLS)
    - update_user_role(): Updates user role (bypasses RLS)
    
  2. Security
    - Both functions use SECURITY DEFINER to bypass RLS
    - Both check caller's role before executing
    - Only admin and quality_manager can call these functions
    - Returns error if non-admin tries to call

  3. Usage
    - Admin panel will call these functions instead of direct table access
    - This eliminates circular dependency issues
*/

-- Function to get all profiles (for admin panel)
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role app_role,
  department text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_role app_role;
BEGIN
  -- Get the caller's role
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Check if caller is admin or quality_manager
  IF caller_role NOT IN ('admin', 'quality_manager') THEN
    RAISE EXCEPTION 'Access denied. Only admins and quality managers can view all profiles.';
  END IF;

  -- Return all profiles
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.role, p.department, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to update user role (for admin panel)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id uuid,
  new_role app_role
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_role app_role;
BEGIN
  -- Get the caller's role
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Check if caller is admin or quality_manager
  IF caller_role NOT IN ('admin', 'quality_manager') THEN
    RAISE EXCEPTION 'Access denied. Only admins and quality managers can update roles.';
  END IF;

  -- Update the target user's role
  UPDATE profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;