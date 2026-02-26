/*
  # Allow Two Users for Personal Notes
  
  ## Overview
  This migration updates the personal_notes table policies to allow access
  to two specific users:
  - toztoprakbaraka@gmail.com
  - oosmanozturk06@gmail.com
  
  ## Changes
  - Drop existing personal_notes policies
  - Create new policies that check if user's email is one of the two allowed emails
  - Both users can:
    - View all notes in the table
    - Create notes
    - Update notes
    - Delete notes
  
  ## Security
  All policies verify the user's email is one of the two allowed emails
  before granting access.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only specific user can view notes" ON personal_notes;
DROP POLICY IF EXISTS "Only specific user can create notes" ON personal_notes;
DROP POLICY IF EXISTS "Only specific user can update notes" ON personal_notes;
DROP POLICY IF EXISTS "Only specific user can delete notes" ON personal_notes;

-- Create SELECT policy for two users
CREATE POLICY "Authorized users can view notes"
  ON personal_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
    )
  );

-- Create INSERT policy for two users
CREATE POLICY "Authorized users can create notes"
  ON personal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
    )
  );

-- Create UPDATE policy for two users
CREATE POLICY "Authorized users can update notes"
  ON personal_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
    )
  );

-- Create DELETE policy for two users
CREATE POLICY "Authorized users can delete notes"
  ON personal_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
    )
  );