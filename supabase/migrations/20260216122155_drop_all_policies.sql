/*
  # Drop All Existing Policies

  ## Overview
  This migration removes all existing RLS policies in preparation for creating
  secure, optimized policies.

  ## Changes
  - Drop all policies from all tables
*/

-- Drop policies from all tables systematically
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;
