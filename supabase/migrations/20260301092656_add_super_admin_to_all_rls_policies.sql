/*
  # Add super_admin role to all RLS policies

  1. Problem
    - 57 RLS policies check for admin/quality_manager but not super_admin
    - super_admin users are blocked from all table operations

  2. Fix
    - Recreate all affected policies with super_admin included in the role array
    - Policies on public tables and storage.objects are all updated
    - Pattern: ARRAY['admin', 'quality_manager'] becomes ARRAY['admin', 'super_admin', 'quality_manager']

  3. Security
    - super_admin gets same access as admin across all tables
    - No new tables or columns
*/

-- Helper: generic "managers" pattern used across most tables
-- These all use: profiles.role = ANY (ARRAY['admin'::app_role, 'quality_manager'::app_role])

-- customer_feedback
DROP POLICY IF EXISTS "Managers can delete feedback" ON customer_feedback;
CREATE POLICY "Managers can delete feedback" ON customer_feedback FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update feedback" ON customer_feedback;
CREATE POLICY "Managers can update feedback" ON customer_feedback FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- customer_surveys
DROP POLICY IF EXISTS "Managers can delete surveys" ON customer_surveys;
CREATE POLICY "Managers can delete surveys" ON customer_surveys FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update surveys" ON customer_surveys;
CREATE POLICY "Managers can update surveys" ON customer_surveys FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- data_control
DROP POLICY IF EXISTS "Managers can delete data control" ON data_control;
CREATE POLICY "Managers can delete data control" ON data_control FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update data control" ON data_control;
CREATE POLICY "Managers can update data control" ON data_control FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- external_procurement
DROP POLICY IF EXISTS "Managers can delete procurement" ON external_procurement;
CREATE POLICY "Managers can delete procurement" ON external_procurement FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update procurement" ON external_procurement;
CREATE POLICY "Managers can update procurement" ON external_procurement FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- facilities_environment
DROP POLICY IF EXISTS "Managers can delete facilities" ON facilities_environment;
CREATE POLICY "Managers can delete facilities" ON facilities_environment FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update facilities" ON facilities_environment;
CREATE POLICY "Managers can update facilities" ON facilities_environment FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- feedback_records
DROP POLICY IF EXISTS "Managers can delete feedback" ON feedback_records;
CREATE POLICY "Managers can delete feedback" ON feedback_records FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- incoming_devices
DROP POLICY IF EXISTS "Managers can delete devices" ON incoming_devices;
CREATE POLICY "Managers can delete devices" ON incoming_devices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update devices" ON incoming_devices;
CREATE POLICY "Managers can update devices" ON incoming_devices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- internal_audits
DROP POLICY IF EXISTS "Managers can delete audits" ON internal_audits;
CREATE POLICY "Managers can delete audits" ON internal_audits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update audits" ON internal_audits;
CREATE POLICY "Managers can update audits" ON internal_audits FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- management_reviews
DROP POLICY IF EXISTS "Managers can delete reviews" ON management_reviews;
CREATE POLICY "Managers can delete reviews" ON management_reviews FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update reviews" ON management_reviews;
CREATE POLICY "Managers can update reviews" ON management_reviews FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- methods_scope
DROP POLICY IF EXISTS "Managers can delete methods" ON methods_scope;
CREATE POLICY "Managers can delete methods" ON methods_scope FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update methods" ON methods_scope;
CREATE POLICY "Managers can update methods" ON methods_scope FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- module_document_links
DROP POLICY IF EXISTS "Admin and quality_manager can insert module document links" ON module_document_links;
CREATE POLICY "Admin and quality_manager can insert module document links" ON module_document_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Admin and quality_manager can update module document links" ON module_document_links;
CREATE POLICY "Admin and quality_manager can update module document links" ON module_document_links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Admin can delete module document links" ON module_document_links;
CREATE POLICY "Admin can delete module document links" ON module_document_links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])));

-- module_signature_roles
DROP POLICY IF EXISTS "Admins and quality managers can delete signature roles" ON module_signature_roles;
CREATE POLICY "Admins and quality managers can delete signature roles" ON module_signature_roles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Admins and quality managers can insert signature roles" ON module_signature_roles;
CREATE POLICY "Admins and quality managers can insert signature roles" ON module_signature_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Admins and quality managers can update signature roles" ON module_signature_roles;
CREATE POLICY "Admins and quality managers can update signature roles" ON module_signature_roles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- nc_and_capa
DROP POLICY IF EXISTS "Managers can delete nc_capa" ON nc_and_capa;
CREATE POLICY "Managers can delete nc_capa" ON nc_and_capa FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update nc_capa" ON nc_and_capa;
CREATE POLICY "Managers can update nc_capa" ON nc_and_capa FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- objectives
DROP POLICY IF EXISTS "Managers can delete objectives" ON objectives;
CREATE POLICY "Managers can delete objectives" ON objectives FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update objectives" ON objectives;
CREATE POLICY "Managers can update objectives" ON objectives FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- storage.objects (signatures bucket)
DROP POLICY IF EXISTS "Authenticated users can delete own signatures" ON storage.objects;
CREATE POLICY "Authenticated users can delete own signatures" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'signatures' AND ((auth.uid()::text = (storage.foldername(name))[3]) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role]))));

-- storage.objects (organization-assets bucket)
DROP POLICY IF EXISTS "Managers can delete organization assets" ON storage.objects;
CREATE POLICY "Managers can delete organization assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'organization-assets' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update organization assets" ON storage.objects;
CREATE POLICY "Managers can update organization assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'organization-assets' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can upload organization assets" ON storage.objects;
CREATE POLICY "Managers can upload organization assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'organization-assets' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- organizations
DROP POLICY IF EXISTS "Managers can update organizations" ON organizations;
CREATE POLICY "Managers can update organizations" ON organizations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- personnel
DROP POLICY IF EXISTS "Managers can delete personnel" ON personnel;
CREATE POLICY "Managers can delete personnel" ON personnel FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update personnel" ON personnel;
CREATE POLICY "Managers can update personnel" ON personnel FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- policies
DROP POLICY IF EXISTS "Managers can delete policies" ON policies;
CREATE POLICY "Managers can delete policies" ON policies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update policies" ON policies;
CREATE POLICY "Managers can update policies" ON policies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- process_performance
DROP POLICY IF EXISTS "Managers can delete performance" ON process_performance;
CREATE POLICY "Managers can delete performance" ON process_performance FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update performance" ON process_performance;
CREATE POLICY "Managers can update performance" ON process_performance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- profiles
DROP POLICY IF EXISTS "Managers can update profiles" ON profiles;
CREATE POLICY "Managers can update profiles" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- quality_assurance
DROP POLICY IF EXISTS "Managers can delete qa" ON quality_assurance;
CREATE POLICY "Managers can delete qa" ON quality_assurance FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update qa" ON quality_assurance;
CREATE POLICY "Managers can update qa" ON quality_assurance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- record_signatures
DROP POLICY IF EXISTS "Signers or managers can delete signatures" ON record_signatures;
CREATE POLICY "Signers or managers can delete signatures" ON record_signatures FOR DELETE TO authenticated
  USING (auth.uid() = signer_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- records_control
DROP POLICY IF EXISTS "Managers can delete records" ON records_control;
CREATE POLICY "Managers can delete records" ON records_control FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update records" ON records_control;
CREATE POLICY "Managers can update records" ON records_control FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- reporting
DROP POLICY IF EXISTS "Managers can delete reports" ON reporting;
CREATE POLICY "Managers can delete reports" ON reporting FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update reports" ON reporting;
CREATE POLICY "Managers can update reports" ON reporting FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- requests_proposals
DROP POLICY IF EXISTS "Managers can delete requests" ON requests_proposals;
CREATE POLICY "Managers can delete requests" ON requests_proposals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update requests" ON requests_proposals;
CREATE POLICY "Managers can update requests" ON requests_proposals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- risks_opportunities
DROP POLICY IF EXISTS "Managers can delete risks" ON risks_opportunities;
CREATE POLICY "Managers can delete risks" ON risks_opportunities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update risks" ON risks_opportunities;
CREATE POLICY "Managers can update risks" ON risks_opportunities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- suppliers
DROP POLICY IF EXISTS "Managers can delete suppliers" ON suppliers;
CREATE POLICY "Managers can delete suppliers" ON suppliers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update suppliers" ON suppliers;
CREATE POLICY "Managers can update suppliers" ON suppliers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- system_documentation
DROP POLICY IF EXISTS "Managers can delete documentation" ON system_documentation;
CREATE POLICY "Managers can delete documentation" ON system_documentation FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update documentation" ON system_documentation;
CREATE POLICY "Managers can update documentation" ON system_documentation FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

-- technical_records
DROP POLICY IF EXISTS "Managers can delete technical records" ON technical_records;
CREATE POLICY "Managers can delete technical records" ON technical_records FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));

DROP POLICY IF EXISTS "Managers can update technical records" ON technical_records;
CREATE POLICY "Managers can update technical records" ON technical_records FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role, 'quality_manager'::app_role])));