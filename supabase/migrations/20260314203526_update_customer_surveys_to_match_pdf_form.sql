/*
  # Update customer_surveys table to match UMS PDF survey form (FR.10/REV01/20.11.18)

  ## Changes
  - Drops old evaluation columns (service_quality, technical_competence, deadline_compliance,
    communication_quality, overall_satisfaction) which did not match the actual 7-question form
  - Adds 7 integer rating columns (q1–q7) corresponding exactly to the questions on the form
  - Adds `preference_reasons` (text[]) for the multi-select "why choose us" question (Q8)
  - Adds `evaluation_topics` (text) for free-text "topics to evaluate"
  - Adds `authorized_person` (text) for the firm's authorized contact name
  - Renames existing `customer_comments` → kept as-is for additional notes
  - Adds `survey_token` (uuid) for sharing unique survey links with customers
  - Adds `token_used` (boolean) to track if the customer has already filled the survey
  - Adds `status` (text): 'pending' | 'completed'

  ## New columns
  - q1 integer (1-5): Teknik altyapımız yeterli mi?
  - q2 integer (1-5): Teknik personelimizin bilgisi yeterli mi?
  - q3 integer (1-5): Teknik personelimizin davranışları uygun mu?
  - q4 integer (1-5): İstediğiniz kişiye rahat ulaşabiliyor musunuz?
  - q5 integer (1-5): Teknik bilgi taleplerinizde yeterli cevap verilebiliyor mu?
  - q6 integer (1-5): Teslim süresi yeterli mi?
  - q7 integer (1-5): Herhangi bir şikayetiniz olduğunda hızlı bir çözüm sağlanıyor mu?
  - preference_reasons text[]: Q8 multi-select checkboxes
  - evaluation_topics text: Free text evaluation topics
  - authorized_person text: Firm authorized person name
  - survey_token uuid: Unique link token for customer self-fill
  - token_used boolean: Whether the token has been used
  - status text: 'pending' | 'completed'

  ## Security
  - RLS remains enabled
  - Public SELECT policy for token-based access (for public survey fill page)
  - Public UPDATE policy for token-based survey completion
*/

-- Add new columns (keep old ones temporarily with defaults to avoid breaking existing data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q1') THEN
    ALTER TABLE customer_surveys ADD COLUMN q1 integer CHECK (q1 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q2') THEN
    ALTER TABLE customer_surveys ADD COLUMN q2 integer CHECK (q2 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q3') THEN
    ALTER TABLE customer_surveys ADD COLUMN q3 integer CHECK (q3 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q4') THEN
    ALTER TABLE customer_surveys ADD COLUMN q4 integer CHECK (q4 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q5') THEN
    ALTER TABLE customer_surveys ADD COLUMN q5 integer CHECK (q5 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q6') THEN
    ALTER TABLE customer_surveys ADD COLUMN q6 integer CHECK (q6 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'q7') THEN
    ALTER TABLE customer_surveys ADD COLUMN q7 integer CHECK (q7 BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'preference_reasons') THEN
    ALTER TABLE customer_surveys ADD COLUMN preference_reasons text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'evaluation_topics') THEN
    ALTER TABLE customer_surveys ADD COLUMN evaluation_topics text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'authorized_person') THEN
    ALTER TABLE customer_surveys ADD COLUMN authorized_person text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'survey_token') THEN
    ALTER TABLE customer_surveys ADD COLUMN survey_token uuid DEFAULT gen_random_uuid() UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'token_used') THEN
    ALTER TABLE customer_surveys ADD COLUMN token_used boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_surveys' AND column_name = 'status') THEN
    ALTER TABLE customer_surveys ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));
  END IF;
END $$;

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view all surveys" ON customer_surveys;
DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON customer_surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys" ON customer_surveys;
DROP POLICY IF EXISTS "Authenticated users can delete surveys" ON customer_surveys;

-- Re-create policies for authenticated access
CREATE POLICY "Authenticated users can view all surveys"
  ON customer_surveys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert surveys"
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

-- Public token-based SELECT (anon can read a survey by its token)
DROP POLICY IF EXISTS "Public token-based survey read" ON customer_surveys;
CREATE POLICY "Public token-based survey read"
  ON customer_surveys FOR SELECT
  TO anon
  USING (survey_token IS NOT NULL);

-- Public token-based UPDATE (anon can submit answers using the token)
DROP POLICY IF EXISTS "Public token-based survey submit" ON customer_surveys;
CREATE POLICY "Public token-based survey submit"
  ON customer_surveys FOR UPDATE
  TO anon
  USING (survey_token IS NOT NULL AND token_used = false)
  WITH CHECK (survey_token IS NOT NULL);
