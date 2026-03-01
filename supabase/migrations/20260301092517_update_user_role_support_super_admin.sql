/*
  # Update update_user_role function for super_admin support

  1. Changes
    - Allow super_admin callers to invoke the function
    - Only super_admin callers can assign the super_admin role
    - admin and quality_manager can still assign other roles as before

  2. Security
    - super_admin role assignment is restricted to super_admin callers only
    - No RLS changes needed (existing policies already include super_admin in the enum)
*/

CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role app_role)
RETURNS void
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
    RAISE EXCEPTION 'Access denied. Only admins, quality managers, and super admins can update roles.';
  END IF;

  IF new_role = 'super_admin' AND caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can assign the super_admin role.';
  END IF;

  UPDATE profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;