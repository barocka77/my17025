/*
  # Remove Circular Dependency in Admin Policy

  1. Problem
    - "Admins can read all profiles" policy creates circular dependency
    - When user tries to read their profile, RLS checks this policy
    - This policy queries profiles table again to check if user is admin
    - This creates infinite recursion and RLS error

  2. Solution
    - Remove the problematic "Admins can read all profiles" policy
    - Keep only "Users can read own profile" which has NO circular dependency
    - For admin panel, we'll use a different approach:
      * Create a SECURITY DEFINER function that bypasses RLS
      * Or use Supabase service role in backend

  3. Result
    - Users can ALWAYS read their own profile without errors
    - Admin functionality will be implemented separately
*/

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Keep the simple, working policy
-- (Already exists, just confirming it's the only SELECT policy now)