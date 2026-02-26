/*
  # Fix Managers Update Profiles Policy

  ## Problem
  The "Managers can update profiles" RLS policy had incorrect USING and WITH CHECK
  clauses. Both clauses were checking if the *target row's id* matches the manager's
  own auth.uid(), which is wrong — it meant managers could only update their own row
  (same as the regular user policy), not other users' rows.

  ## Fix
  - USING clause: should allow matching ANY row (true) — the restriction is on WHO
    can do it (checked via WITH CHECK / subquery)
  - WITH CHECK clause: verify the acting user has admin or quality_manager role

  This allows admins and quality managers to update any profile row.
*/

DROP POLICY IF EXISTS "Managers can update profiles" ON profiles;

CREATE POLICY "Managers can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['admin'::app_role, 'quality_manager'::app_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['admin'::app_role, 'quality_manager'::app_role])
    )
  );
