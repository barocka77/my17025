/*
  # Create Secure RLS Policies

  ## Overview
  This migration creates secure, optimized RLS policies for all tables.
  All policies use (select auth.uid()) to avoid re-evaluation on each row.

  ## Security Model
  - Most tables: All authenticated users have full access
  - equipment_hardware: Public can view, authenticated can modify
  - feedback_records: Users can view own records or all if manager
  - profiles: Users can view own, managers can update any

  ## Changes
  - Create optimized policies for all tables
  - Add missing indexes for foreign keys
  - Fix function security settings
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_records_profile_id 
ON feedback_records(profile_id);

-- ============================================================================
-- 2. FIX FUNCTION SECURITY
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'personnel'::app_role
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'quality_manager')
  );
END;
$$;

-- ============================================================================
-- 3. CREATE POLICIES
-- ============================================================================

-- customer_feedback
CREATE POLICY "Authenticated users can view feedback"
  ON customer_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create feedback"
  ON customer_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update feedback"
  ON customer_feedback FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete feedback"
  ON customer_feedback FOR DELETE
  TO authenticated
  USING (true);

-- customer_surveys
CREATE POLICY "Authenticated users can view surveys"
  ON customer_surveys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create surveys"
  ON customer_surveys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update surveys"
  ON customer_surveys FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete surveys"
  ON customer_surveys FOR DELETE
  TO authenticated
  USING (true);

-- data_control
CREATE POLICY "Authenticated users can view data control"
  ON data_control FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create data control"
  ON data_control FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update data control"
  ON data_control FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete data control"
  ON data_control FOR DELETE
  TO authenticated
  USING (true);

-- equipment_hardware
CREATE POLICY "Anyone can view equipment"
  ON equipment_hardware FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create equipment"
  ON equipment_hardware FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment"
  ON equipment_hardware FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipment"
  ON equipment_hardware FOR DELETE
  TO authenticated
  USING (true);

-- external_procurement
CREATE POLICY "Authenticated users can view procurement"
  ON external_procurement FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create procurement"
  ON external_procurement FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update procurement"
  ON external_procurement FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete procurement"
  ON external_procurement FOR DELETE
  TO authenticated
  USING (true);

-- facilities_environment
CREATE POLICY "Authenticated users can view facilities"
  ON facilities_environment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create facilities"
  ON facilities_environment FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update facilities"
  ON facilities_environment FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete facilities"
  ON facilities_environment FOR DELETE
  TO authenticated
  USING (true);

-- feedback_records (optimized with subqueries)
CREATE POLICY "Users can view own or all if manager"
  ON feedback_records FOR SELECT
  TO authenticated
  USING (
    (profile_id = (select auth.uid())) 
    OR 
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'quality_manager')
    ))
  );

CREATE POLICY "Users can create own feedback"
  ON feedback_records FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (select auth.uid()));

CREATE POLICY "Managers can update feedback"
  ON feedback_records FOR UPDATE
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
  ON feedback_records FOR DELETE
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
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update devices"
  ON incoming_devices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete devices"
  ON incoming_devices FOR DELETE
  TO authenticated
  USING (true);

-- internal_audits
CREATE POLICY "Authenticated users can view audits"
  ON internal_audits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create audits"
  ON internal_audits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audits"
  ON internal_audits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audits"
  ON internal_audits FOR DELETE
  TO authenticated
  USING (true);

-- management_reviews
CREATE POLICY "Authenticated users can view reviews"
  ON management_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON management_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reviews"
  ON management_reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reviews"
  ON management_reviews FOR DELETE
  TO authenticated
  USING (true);

-- methods_scope
CREATE POLICY "Authenticated users can view methods"
  ON methods_scope FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create methods"
  ON methods_scope FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update methods"
  ON methods_scope FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete methods"
  ON methods_scope FOR DELETE
  TO authenticated
  USING (true);

-- nc_and_capa
CREATE POLICY "Authenticated users can view nc_capa"
  ON nc_and_capa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create nc_capa"
  ON nc_and_capa FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update nc_capa"
  ON nc_and_capa FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete nc_capa"
  ON nc_and_capa FOR DELETE
  TO authenticated
  USING (true);

-- objectives
CREATE POLICY "Authenticated users can view objectives"
  ON objectives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create objectives"
  ON objectives FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update objectives"
  ON objectives FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete objectives"
  ON objectives FOR DELETE
  TO authenticated
  USING (true);

-- personnel
CREATE POLICY "Authenticated users can view personnel"
  ON personnel FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create personnel"
  ON personnel FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update personnel"
  ON personnel FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete personnel"
  ON personnel FOR DELETE
  TO authenticated
  USING (true);

-- policies
CREATE POLICY "Authenticated users can view policies"
  ON policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create policies"
  ON policies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete policies"
  ON policies FOR DELETE
  TO authenticated
  USING (true);

-- process_performance
CREATE POLICY "Authenticated users can view performance"
  ON process_performance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create performance"
  ON process_performance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update performance"
  ON process_performance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete performance"
  ON process_performance FOR DELETE
  TO authenticated
  USING (true);

-- profiles (optimized with subqueries)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Managers can update profiles"
  ON profiles FOR UPDATE
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

-- quality_assurance
CREATE POLICY "Authenticated users can view qa"
  ON quality_assurance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create qa"
  ON quality_assurance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update qa"
  ON quality_assurance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete qa"
  ON quality_assurance FOR DELETE
  TO authenticated
  USING (true);

-- records_control
CREATE POLICY "Authenticated users can view records"
  ON records_control FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create records"
  ON records_control FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update records"
  ON records_control FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete records"
  ON records_control FOR DELETE
  TO authenticated
  USING (true);

-- reporting
CREATE POLICY "Authenticated users can view reports"
  ON reporting FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reports"
  ON reporting FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reports"
  ON reporting FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reports"
  ON reporting FOR DELETE
  TO authenticated
  USING (true);

-- requests_proposals
CREATE POLICY "Authenticated users can view requests"
  ON requests_proposals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create requests"
  ON requests_proposals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update requests"
  ON requests_proposals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete requests"
  ON requests_proposals FOR DELETE
  TO authenticated
  USING (true);

-- risks_opportunities
CREATE POLICY "Authenticated users can view risks"
  ON risks_opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create risks"
  ON risks_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update risks"
  ON risks_opportunities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete risks"
  ON risks_opportunities FOR DELETE
  TO authenticated
  USING (true);

-- suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);

-- system_documentation
CREATE POLICY "Authenticated users can view documentation"
  ON system_documentation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create documentation"
  ON system_documentation FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documentation"
  ON system_documentation FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documentation"
  ON system_documentation FOR DELETE
  TO authenticated
  USING (true);

-- technical_records
CREATE POLICY "Authenticated users can view technical records"
  ON technical_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create technical records"
  ON technical_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update technical records"
  ON technical_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete technical records"
  ON technical_records FOR DELETE
  TO authenticated
  USING (true);
