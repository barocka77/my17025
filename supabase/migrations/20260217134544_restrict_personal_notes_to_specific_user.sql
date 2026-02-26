/*
  # Restrict Personal Notes to Specific User
  
  ## Overview
  This migration restricts access to the personal_notes table to only allow
  the user with email 'toztoprakbaraka@gmail.com' to view and manage notes.
  
  ## Changes
  - Drop all existing personal_notes policies
  - Create new policies that check the user's email from profiles table
  - Only users with email 'toztoprakbaraka@gmail.com' can:
    - View notes
    - Create notes
    - Update notes
    - Delete notes
  
  ## Security
  All policies verify the user's email matches 'toztoprakbaraka@gmail.com'
  before granting access.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notes" ON personal_notes;
DROP POLICY IF EXISTS "Users can create own notes" ON personal_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON personal_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON personal_notes;

-- Create restricted SELECT policy
CREATE POLICY "Only specific user can view notes"
  ON personal_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'toztoprakbaraka@gmail.com'
    )
  );

-- Create restricted INSERT policy
CREATE POLICY "Only specific user can create notes"
  ON personal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'toztoprakbaraka@gmail.com'
    )
  );

-- Create restricted UPDATE policy
CREATE POLICY "Only specific user can update notes"
  ON personal_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'toztoprakbaraka@gmail.com'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'toztoprakbaraka@gmail.com'
    )
  );

-- Create restricted DELETE policy
CREATE POLICY "Only specific user can delete notes"
  ON personal_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'toztoprakbaraka@gmail.com'
    )
  );