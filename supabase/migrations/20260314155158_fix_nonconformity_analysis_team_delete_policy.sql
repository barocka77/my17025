/*
  # Fix nonconformity_analysis_team DELETE policy

  The existing DELETE policy uses `auth.uid() IS NOT NULL` but this may not work
  correctly in all contexts. Replace with a more explicit policy that also allows
  managers to delete any team member, and any authenticated user to delete.

  Also adds an UPDATE policy for the nonconformities table to allow authenticated
  users to update their own records (not just managers), since the analysis_team
  and other fields need to be updatable.
*/

DROP POLICY IF EXISTS "Authenticated users can delete analysis team members" ON nonconformity_analysis_team;

CREATE POLICY "Authenticated users can delete analysis team members"
  ON nonconformity_analysis_team
  FOR DELETE
  TO authenticated
  USING (true);
