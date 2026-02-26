/*
  # Implement Role-Based Access Control

  ## Overview
  This migration implements proper role-based access control for all tables.
  The security model is designed for a quality-controlled laboratory environment.

  ## Security Model
  ### For most data tables:
  - SELECT: All authenticated users can view
  - INSERT: All authenticated users can create
  - UPDATE: Only managers (admin/quality_manager) can modify
  - DELETE: Only managers (admin/quality_manager) can delete

  ### Exceptions:
  - equipment_hardware: Public can view, authenticated can create/update/delete
  - feedback_records: Already has proper role-based policies
  - profiles: Already has proper role-based policies

  ## Changes
  - Drop and recreate all policies with role-based restrictions
  - Keep the index on feedback_records(profile_id) as it's needed for foreign key queries

  ## Note on Password Protection
  The "Leaked Password Protection Disabled" issue requires configuration in
  Supabase Dashboard under Authentication > Settings > Security.
  Enable "Check for leaked passwords" to integrate with HaveIBeenPwned.org.
*/

-- ============================================================================
-- DROP ALL POLICIES EXCEPT feedback_records, profiles, and equipment_hardware
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename NOT IN ('feedback_records', 'profiles', 'equipment_hardware')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- CREATE SECURE ROLE-BASED POLICIES
-- ============================================================================

-- Helper function to check if user is a manager (already exists, just verifying)
-- This function uses (select auth.uid()) internally for performance

-- customer_feedback
CREATE POLICY "Authenticated users can view feedback"
  ON customer_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create feedback"
  ON customer_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update feedback"
  ON customer_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete feedback"
  ON customer_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- customer_surveys
CREATE POLICY "Authenticated users can view surveys"
  ON customer_surveys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create surveys"
  ON customer_surveys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update surveys"
  ON customer_surveys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete surveys"
  ON customer_surveys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- data_control
CREATE POLICY "Authenticated users can view data control"
  ON data_control FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create data control"
  ON data_control FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update data control"
  ON data_control FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete data control"
  ON data_control FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- external_procurement
CREATE POLICY "Authenticated users can view procurement"
  ON external_procurement FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create procurement"
  ON external_procurement FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update procurement"
  ON external_procurement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete procurement"
  ON external_procurement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- facilities_environment
CREATE POLICY "Authenticated users can view facilities"
  ON facilities_environment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create facilities"
  ON facilities_environment FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update facilities"
  ON facilities_environment FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete facilities"
  ON facilities_environment FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- incoming_devices
CREATE POLICY "Authenticated users can view devices"
  ON incoming_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create devices"
  ON incoming_devices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update devices"
  ON incoming_devices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete devices"
  ON incoming_devices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- internal_audits
CREATE POLICY "Authenticated users can view audits"
  ON internal_audits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create audits"
  ON internal_audits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update audits"
  ON internal_audits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete audits"
  ON internal_audits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- management_reviews
CREATE POLICY "Authenticated users can view reviews"
  ON management_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON management_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update reviews"
  ON management_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete reviews"
  ON management_reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- methods_scope
CREATE POLICY "Authenticated users can view methods"
  ON methods_scope FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create methods"
  ON methods_scope FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update methods"
  ON methods_scope FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete methods"
  ON methods_scope FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- nc_and_capa
CREATE POLICY "Authenticated users can view nc_capa"
  ON nc_and_capa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create nc_capa"
  ON nc_and_capa FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update nc_capa"
  ON nc_and_capa FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete nc_capa"
  ON nc_and_capa FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- objectives
CREATE POLICY "Authenticated users can view objectives"
  ON objectives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create objectives"
  ON objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update objectives"
  ON objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete objectives"
  ON objectives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- personnel
CREATE POLICY "Authenticated users can view personnel"
  ON personnel FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create personnel"
  ON personnel FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update personnel"
  ON personnel FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete personnel"
  ON personnel FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- policies
CREATE POLICY "Authenticated users can view policies"
  ON policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create policies"
  ON policies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete policies"
  ON policies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- process_performance
CREATE POLICY "Authenticated users can view performance"
  ON process_performance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create performance"
  ON process_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update performance"
  ON process_performance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete performance"
  ON process_performance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- quality_assurance
CREATE POLICY "Authenticated users can view qa"
  ON quality_assurance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create qa"
  ON quality_assurance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update qa"
  ON quality_assurance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete qa"
  ON quality_assurance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- records_control
CREATE POLICY "Authenticated users can view records"
  ON records_control FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create records"
  ON records_control FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update records"
  ON records_control FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete records"
  ON records_control FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- reporting
CREATE POLICY "Authenticated users can view reports"
  ON reporting FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reports"
  ON reporting FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update reports"
  ON reporting FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete reports"
  ON reporting FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- requests_proposals
CREATE POLICY "Authenticated users can view requests"
  ON requests_proposals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create requests"
  ON requests_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update requests"
  ON requests_proposals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete requests"
  ON requests_proposals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- risks_opportunities
CREATE POLICY "Authenticated users can view risks"
  ON risks_opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create risks"
  ON risks_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update risks"
  ON risks_opportunities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete risks"
  ON risks_opportunities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- system_documentation
CREATE POLICY "Authenticated users can view documentation"
  ON system_documentation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create documentation"
  ON system_documentation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update documentation"
  ON system_documentation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete documentation"
  ON system_documentation FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

-- technical_records
CREATE POLICY "Authenticated users can view technical records"
  ON technical_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create technical records"
  ON technical_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Managers can update technical records"
  ON technical_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );

CREATE POLICY "Managers can delete technical records"
  ON technical_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    )
  );
