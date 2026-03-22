/*
  # Add approved and feature_notepad columns to profiles

  ## Summary
  Implements two database-level access control flags on the profiles table:

  1. New Columns
    - `approved` (boolean, NOT NULL, DEFAULT false)
      Controls whether a newly registered user has been approved by an admin.
      New registrations start as unapproved; an admin must explicitly grant access.
    - `feature_notepad` (boolean, NOT NULL, DEFAULT false)
      Feature toggle that grants access to the Personal Notepad module.
      Replaces the previous hardcoded email-based access check in the frontend.

  2. Backward Compatibility
    - All existing profiles are immediately set to `approved = true` so no
      currently active user loses access.

  3. Seed Data
    - The two users previously granted notepad access via hardcoded emails
      are migrated to `feature_notepad = true`.

  4. Security
    - No RLS policy changes required; the existing policies cover these columns
      since they are part of the profiles table which already has RLS enabled.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_notepad boolean NOT NULL DEFAULT false;

UPDATE profiles SET approved = true WHERE approved = false;

UPDATE profiles
SET feature_notepad = true
WHERE email IN ('toztoprakbaraka@gmail.com', 'oosmanozturk06@gmail.com');
