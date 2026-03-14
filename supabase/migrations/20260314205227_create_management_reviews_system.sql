/*
  # Create Management Reviews System (PR01.10 - Yönetimin Gözden Geçirmesi Prosedürü)

  ## Overview
  Implements the full YGG (Yönetimin Gözden Geçirmesi) workflow per PR01.10 Rev.01.
  
  ## New Tables

  ### management_reviews (FR.19 - Yönetim Sistemi Değerlendirme Raporu + FR.20 - Toplantı Tutanağı)
  - Master record for each YGG meeting
  - Tracks meeting date, type (periodic/extraordinary), participants, status
  - Contains the Yönetim Sistemi Değerlendirme Raporu fields (FR.19 agenda evaluation data)
  - Contains the Toplantı Tutanağı fields (FR.20 minutes)

  ### management_review_agenda_items (FR.19 agenda items per ISO 17025 §8.9)
  - Structured agenda items covering all required ISO 17025 topics
  - Each item has a description, evaluation text, and status

  ### management_review_decisions (FR.20 - Kararlar / Actions)
  - Decisions and action items made during the meeting
  - Has responsible person, deadline, status for follow-up tracking (§5.5)

  ## Security
  - RLS enabled on all tables
  - Authenticated users have full access
*/

-- ========== MANAGEMENT REVIEWS ==========
CREATE TABLE IF NOT EXISTS management_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  meeting_no text NOT NULL DEFAULT '',
  meeting_type text NOT NULL DEFAULT 'periodic' CHECK (meeting_type IN ('periodic', 'extraordinary')),
  meeting_date date,
  meeting_location text DEFAULT '',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  chairperson text DEFAULT '',
  participants text[] DEFAULT '{}',
  -- FR.19 Yönetim Sistemi Değerlendirme Raporu fields
  internal_external_changes text DEFAULT '',
  objectives_status text DEFAULT '',
  policy_procedure_adequacy text DEFAULT '',
  previous_review_status text DEFAULT '',
  internal_audit_results text DEFAULT '',
  corrective_actions_status text DEFAULT '',
  external_assessments text DEFAULT '',
  workload_changes text DEFAULT '',
  customer_feedback_summary text DEFAULT '',
  complaints_summary text DEFAULT '',
  improvements_effectiveness text DEFAULT '',
  resources_adequacy text DEFAULT '',
  risk_assessment_results text DEFAULT '',
  results_validity_outputs text DEFAULT '',
  other_factors text DEFAULT '',
  -- FR.20 Toplantı Tutanağı fields
  opening_speech text DEFAULT '',
  management_system_effectiveness text DEFAULT '',
  iso_requirements_improvements text DEFAULT '',
  resource_needs text DEFAULT '',
  change_needs text DEFAULT '',
  general_conclusion text DEFAULT '',
  minutes_prepared_by text DEFAULT '',
  minutes_distributed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE management_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view management reviews"
  ON management_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert management reviews"
  ON management_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update management reviews"
  ON management_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete management reviews"
  ON management_reviews FOR DELETE TO authenticated USING (true);

-- ========== DECISIONS & ACTION ITEMS ==========
CREATE TABLE IF NOT EXISTS management_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES management_reviews(id) ON DELETE CASCADE,
  decision_no text NOT NULL DEFAULT '',
  decision_type text NOT NULL DEFAULT 'action' CHECK (decision_type IN ('action', 'corrective', 'improvement', 'resource', 'other')),
  description text NOT NULL DEFAULT '',
  responsible_person text DEFAULT '',
  planned_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  completion_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE management_review_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view review decisions"
  ON management_review_decisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert review decisions"
  ON management_review_decisions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update review decisions"
  ON management_review_decisions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete review decisions"
  ON management_review_decisions FOR DELETE TO authenticated USING (true);
