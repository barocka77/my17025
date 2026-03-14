/*
  # Allow authenticated users to update nonconformities

  Previously only managers could update nonconformities. This caused silent failures
  for regular users where the update returned no error but changed 0 rows, while
  the analysis_team join table was still being modified (delete+insert), causing
  data inconsistency.

  This migration adds a policy allowing any authenticated user to update nonconformities.
  Manager-only operations (like closing) should be enforced at the application level.
*/

CREATE POLICY "Authenticated users can update nonconformities"
  ON nonconformities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
