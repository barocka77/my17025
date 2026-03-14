/*
  # Create Internal Audits System (PR01.09 İç Tetkik Prosedürü)

  ## New Tables

  ### internal_audit_plans (FR.16 - İç Tetkik Planı)
  - Plan for each audit (year, scope, auditor, planned date, status)
  - Covers annual planning per ISO 17025 clauses

  ### internal_audit_questions (FR.17 - İç Tetkik Soru Formu)
  - Questions used during audits, linked to a plan
  - References ISO 17025 clause numbers
  - Has finding type: uygun / minör uygunsuzluk / majör uygunsuzluk / gözlem
  - Has evidence/notes field

  ### internal_audit_nonconformities (FR.18 - İç Tetkik Uygunsuzluk ve Düzeltici Faaliyet Formu)
  - Nonconformities found during audit
  - Root cause, corrective action, responsible person, deadline, status, closure info

  ### internal_audit_reports (FR.41 - İç Tetkik Raporu)
  - Overall audit report linked to a plan
  - Summary, general evaluation, improvement areas, status

  ## Security
  - RLS enabled on all tables
  - Authenticated users have full access
*/

-- ========== AUDIT PLANS (FR.16) ==========
CREATE TABLE IF NOT EXISTS internal_audit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  audit_no text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT '',
  auditor_name text NOT NULL DEFAULT '',
  auditee_name text NOT NULL DEFAULT '',
  planned_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  audit_type text NOT NULL DEFAULT 'planned' CHECK (audit_type IN ('planned', 'unplanned')),
  iso_clauses text[] DEFAULT '{}',
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE internal_audit_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit plans"
  ON internal_audit_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit plans"
  ON internal_audit_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit plans"
  ON internal_audit_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audit plans"
  ON internal_audit_plans FOR DELETE
  TO authenticated
  USING (true);

-- ========== AUDIT QUESTIONS (FR.17) ==========
CREATE TABLE IF NOT EXISTS internal_audit_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_plan_id uuid NOT NULL REFERENCES internal_audit_plans(id) ON DELETE CASCADE,
  question_order integer NOT NULL DEFAULT 0,
  iso_clause text NOT NULL DEFAULT '',
  question_text text NOT NULL DEFAULT '',
  finding_type text NOT NULL DEFAULT 'pending' CHECK (finding_type IN ('pending', 'uygun', 'minör', 'majör', 'gözlem')),
  evidence text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE internal_audit_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit questions"
  ON internal_audit_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit questions"
  ON internal_audit_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit questions"
  ON internal_audit_questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audit questions"
  ON internal_audit_questions FOR DELETE
  TO authenticated
  USING (true);

-- ========== AUDIT NONCONFORMITIES (FR.18) ==========
CREATE TABLE IF NOT EXISTS internal_audit_nonconformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_plan_id uuid NOT NULL REFERENCES internal_audit_plans(id) ON DELETE CASCADE,
  question_id uuid REFERENCES internal_audit_questions(id) ON DELETE SET NULL,
  nc_no text NOT NULL DEFAULT '',
  iso_clause text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  finding_type text NOT NULL DEFAULT 'minör' CHECK (finding_type IN ('minör', 'majör', 'gözlem')),
  root_cause text DEFAULT '',
  corrective_action text DEFAULT '',
  responsible_person text DEFAULT '',
  planned_close_date date,
  actual_close_date date,
  verification_method text DEFAULT '' CHECK (verification_method IN ('', 'document_review', 'follow_up_audit')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'verified')),
  auditor_name text DEFAULT '',
  auditee_signature text DEFAULT '',
  closure_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE internal_audit_nonconformities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit nonconformities"
  ON internal_audit_nonconformities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit nonconformities"
  ON internal_audit_nonconformities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit nonconformities"
  ON internal_audit_nonconformities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audit nonconformities"
  ON internal_audit_nonconformities FOR DELETE
  TO authenticated
  USING (true);

-- ========== AUDIT REPORTS (FR.41) ==========
CREATE TABLE IF NOT EXISTS internal_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_plan_id uuid NOT NULL REFERENCES internal_audit_plans(id) ON DELETE CASCADE,
  report_date date DEFAULT now(),
  summary text DEFAULT '',
  general_evaluation text DEFAULT '',
  strengths text DEFAULT '',
  improvement_areas text DEFAULT '',
  total_questions integer DEFAULT 0,
  total_conformant integer DEFAULT 0,
  total_minor_nc integer DEFAULT 0,
  total_major_nc integer DEFAULT 0,
  total_observations integer DEFAULT 0,
  conclusion text DEFAULT '',
  submitted_by text DEFAULT '',
  reviewed_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE internal_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit reports"
  ON internal_audit_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit reports"
  ON internal_audit_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit reports"
  ON internal_audit_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audit reports"
  ON internal_audit_reports FOR DELETE
  TO authenticated
  USING (true);
