/*
  # Fix Personal Notes RLS Policies

  ## Overview
  The existing personal_notes policies relied on a subquery against the `profiles`
  table to verify the user's email. This caused issues because the profiles RLS
  policy (`Users can view own profile`) only allows a user to see their own row,
  which works fine for the subquery — but in some execution contexts (particularly
  during INSERT) the nested RLS evaluation can fail silently, blocking all writes.

  ## Changes
  - Drop all existing personal_notes policies
  - Recreate them using `auth.email()` directly, which reads from the JWT token
    without any additional table lookup, eliminating the dependency on profiles RLS

  ## Security
  - Only the two authorized emails can access personal_notes
  - INSERT policy still enforces auth.uid() = user_id ownership
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Authorized users can view notes" ON personal_notes;
DROP POLICY IF EXISTS "Authorized users can create notes" ON personal_notes;
DROP POLICY IF EXISTS "Authorized users can update notes" ON personal_notes;
DROP POLICY IF EXISTS "Authorized users can delete notes" ON personal_notes;

-- SELECT: authorized emails only
CREATE POLICY "Authorized users can view notes"
  ON personal_notes
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
  );

-- INSERT: authorized emails and own user_id
CREATE POLICY "Authorized users can create notes"
  ON personal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND auth.email() IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
  );

-- UPDATE: authorized emails and own user_id
CREATE POLICY "Authorized users can update notes"
  ON personal_notes
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND auth.email() IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
  );

-- DELETE: authorized emails only
CREATE POLICY "Authorized users can delete notes"
  ON personal_notes
  FOR DELETE
  TO authenticated
  USING (
    auth.email() IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com')
  );
