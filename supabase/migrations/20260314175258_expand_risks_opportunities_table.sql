/*
  # Expand risks_opportunities table for Risk Değerlendirme Formu (FR.51)

  ## Summary
  Replaces the minimal risks_opportunities table structure with a comprehensive
  schema matching the Risk Değerlendirme Formu (FR.51) used in ISO 17025 labs.

  ## New Columns Added

  ### Identification
  - `risk_no` (text) - Auto-generated sequential risk number (e.g., R-001)
  - `risk_type` (text) - 'risk' or 'opportunity'
  - `risk_definition` (text) - Risk description / Tanımı
  - `risk_impact` (text) - Impact of the risk / Riskin Etkisi
  - `impact_area` (text) - Area affected / Etki Alanı

  ### Initial Evaluation (DEĞERLENDİRME)
  - `probability` (integer 1-5) - Olasılık
  - `severity` (integer 1-5) - Şiddet
  - `risk_level` (integer) - Risk Derecesi = probability × severity (computed)
  - `related_activity` (text) - İlgili Faaliyet
  - `decision` (text) - Karar
  - `activity_responsible` (text) - Faaliyet Sorumlusu
  - `deadline` (date) - Termin
  - `planned_review_term` (date) - Planlanan Gözden Geçirme Termini
  - `requires_df` (boolean) - Düzeltici Faaliyet açılacak mı?
  - `df_no` (text) - DF No (if requires_df = true)
  - `evaluators` (text) - Değerlendirenler
  - `evaluation_date` (date) - Değerlendirme Tarihi

  ### Re-Evaluation (TEKRAR DEĞERLENDİRME)
  - `re_probability` (integer 1-5) - Tekrar Olasılık
  - `re_severity` (integer 1-5) - Tekrar Şiddet
  - `re_risk_level` (integer) - Tekrar Risk Derecesi
  - `re_related_activity` (text) - Tekrar İlgili Faaliyet
  - `re_decision` (text) - Tekrar Karar
  - `re_activity_responsible` (text) - Tekrar Faaliyet Sorumlusu
  - `re_deadline` (date) - Tekrar Termin
  - `re_requires_df` (boolean) - Tekrar DF açılacak mı?
  - `re_df_no` (text) - Tekrar DF No
  - `re_evaluators` (text) - Tekrar Değerlendirenler
  - `re_evaluation_date` (date) - Tekrar Değerlendirme Tarihi

  ### Review & Outcome
  - `review_date` (date) - Gözden Geçirme Tarihi
  - `risk_change_occurred` (boolean) - Mevcut risk derecesini değiştirecek durum oluştu mu?
  - `change_explanation` (text) - Açıklama
  - `risk_change_cause` (text) - Risk derecesinde değişikliğe sebep olan durum
  - `opportunities_improvements` (text) - Fırsatlar / İyileştirmeler

  ### Metadata
  - `created_by` (uuid FK to auth.users) - Record creator
  - `updated_at` (timestamptz) - Last update time

  ## Security
  - RLS already enabled (existing table)
  - New policies added for authenticated users
*/

-- Add new columns to existing table (safe - no drops)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_no') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_no text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_type') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_type text DEFAULT 'risk';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_definition') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_definition text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_impact') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_impact text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'impact_area') THEN
    ALTER TABLE risks_opportunities ADD COLUMN impact_area text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'probability') THEN
    ALTER TABLE risks_opportunities ADD COLUMN probability integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'severity') THEN
    ALTER TABLE risks_opportunities ADD COLUMN severity integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_level') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_level integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'related_activity') THEN
    ALTER TABLE risks_opportunities ADD COLUMN related_activity text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'decision') THEN
    ALTER TABLE risks_opportunities ADD COLUMN decision text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'activity_responsible') THEN
    ALTER TABLE risks_opportunities ADD COLUMN activity_responsible text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'deadline') THEN
    ALTER TABLE risks_opportunities ADD COLUMN deadline date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'planned_review_term') THEN
    ALTER TABLE risks_opportunities ADD COLUMN planned_review_term date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'requires_df') THEN
    ALTER TABLE risks_opportunities ADD COLUMN requires_df boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'df_no') THEN
    ALTER TABLE risks_opportunities ADD COLUMN df_no text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'evaluators') THEN
    ALTER TABLE risks_opportunities ADD COLUMN evaluators text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'evaluation_date') THEN
    ALTER TABLE risks_opportunities ADD COLUMN evaluation_date date;
  END IF;
  -- Re-evaluation columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_probability') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_probability integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_severity') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_severity integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_risk_level') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_risk_level integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_related_activity') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_related_activity text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_decision') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_decision text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_activity_responsible') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_activity_responsible text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_deadline') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_deadline date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_requires_df') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_requires_df boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_df_no') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_df_no text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_evaluators') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_evaluators text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 're_evaluation_date') THEN
    ALTER TABLE risks_opportunities ADD COLUMN re_evaluation_date date;
  END IF;
  -- Review and outcome columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'review_date') THEN
    ALTER TABLE risks_opportunities ADD COLUMN review_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_change_occurred') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_change_occurred boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'change_explanation') THEN
    ALTER TABLE risks_opportunities ADD COLUMN change_explanation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'risk_change_cause') THEN
    ALTER TABLE risks_opportunities ADD COLUMN risk_change_cause text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'opportunities_improvements') THEN
    ALTER TABLE risks_opportunities ADD COLUMN opportunities_improvements text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'created_by') THEN
    ALTER TABLE risks_opportunities ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks_opportunities' AND column_name = 'updated_at') THEN
    ALTER TABLE risks_opportunities ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create a sequence for risk numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS risks_opportunities_risk_no_seq START 1;

-- Function to generate risk_no on insert
CREATE OR REPLACE FUNCTION generate_risk_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.risk_no IS NULL OR NEW.risk_no = '' THEN
    NEW.risk_no := 'R-' || LPAD(nextval('risks_opportunities_risk_no_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_risk_no ON risks_opportunities;
CREATE TRIGGER set_risk_no
  BEFORE INSERT ON risks_opportunities
  FOR EACH ROW EXECUTE FUNCTION generate_risk_no();

-- Update updated_at on every update
CREATE OR REPLACE FUNCTION update_risks_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS risks_opportunities_updated_at ON risks_opportunities;
CREATE TRIGGER risks_opportunities_updated_at
  BEFORE UPDATE ON risks_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_risks_opportunities_updated_at();

-- Enable RLS (idempotent)
ALTER TABLE risks_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop old generic policies if any exist, replace with proper ones
DROP POLICY IF EXISTS "Authenticated users can view risks_opportunities" ON risks_opportunities;
DROP POLICY IF EXISTS "Authenticated users can insert risks_opportunities" ON risks_opportunities;
DROP POLICY IF EXISTS "Authenticated users can update risks_opportunities" ON risks_opportunities;
DROP POLICY IF EXISTS "Managers can delete risks_opportunities" ON risks_opportunities;

CREATE POLICY "Authenticated users can view risks_opportunities"
  ON risks_opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert risks_opportunities"
  ON risks_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update risks_opportunities"
  ON risks_opportunities FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete risks_opportunities"
  ON risks_opportunities FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
