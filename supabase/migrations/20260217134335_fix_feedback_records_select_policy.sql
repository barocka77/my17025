/*
  # Fix feedback_records SELECT Policy
  
  ## Overview
  This migration updates the feedback_records SELECT policy to allow all 
  authenticated users to view all feedback records, not just their own or 
  manager-only access.
  
  ## Changes
  - Drop the restrictive "Users can view own or all if manager" policy
  - Create a new policy that allows all authenticated users to view all records
  
  ## Reason
  The Action Tracking module needs to display feedback records with upcoming 
  deadlines to all users, regardless of who created them. The previous policy 
  was too restrictive and prevented personnel from seeing important deadlines.
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own or all if manager" ON feedback_records;

-- Create a new open policy for viewing
CREATE POLICY "Authenticated users can view all feedback records"
  ON feedback_records FOR SELECT
  TO authenticated
  USING (true);