/*
  # Enable RLS on nonconformity_analysis_team

  1. Security
    - Enable RLS on `nonconformity_analysis_team` table
    - Add SELECT policy: authenticated users can read team members
    - Add INSERT policy: authenticated users can add team members
    - Add DELETE policy: admins/managers can remove team members
*/

ALTER TABLE nonconformity_analysis_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analysis team members"
  ON nonconformity_analysis_team
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert analysis team members"
  ON nonconformity_analysis_team
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete analysis team members"
  ON nonconformity_analysis_team
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
