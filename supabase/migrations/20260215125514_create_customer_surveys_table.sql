/*
  # Create Customer Surveys Table

  1. New Tables
    - `customer_surveys`
      - `id` (uuid, primary key) - Unique identifier for each survey
      - `customer_name` (text) - Name of the customer
      - `survey_date` (date) - Date when the survey was conducted
      - `service_quality` (integer) - Rating for service quality (1-5)
      - `technical_competence` (integer) - Rating for technical competence (1-5)
      - `deadline_compliance` (integer) - Rating for deadline compliance (1-5)
      - `communication_quality` (integer) - Rating for communication quality (1-5)
      - `overall_satisfaction` (integer) - Overall satisfaction score (1-5)
      - `customer_comments` (text) - General customer feedback and comments
      - `created_at` (timestamptz) - Timestamp when the record was created
      - `updated_at` (timestamptz) - Timestamp when the record was last updated

  2. Security
    - Enable RLS on `customer_surveys` table
    - Add policies for authenticated users to:
      - View all survey records
      - Insert new survey records
      - Update existing survey records
      - Delete survey records
*/

CREATE TABLE IF NOT EXISTS customer_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  survey_date date NOT NULL DEFAULT CURRENT_DATE,
  service_quality integer NOT NULL CHECK (service_quality >= 1 AND service_quality <= 5),
  technical_competence integer NOT NULL CHECK (technical_competence >= 1 AND technical_competence <= 5),
  deadline_compliance integer NOT NULL CHECK (deadline_compliance >= 1 AND deadline_compliance <= 5),
  communication_quality integer NOT NULL CHECK (communication_quality >= 1 AND communication_quality <= 5),
  overall_satisfaction integer NOT NULL CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
  customer_comments text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE customer_surveys ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all survey records
CREATE POLICY "Authenticated users can view all surveys"
  ON customer_surveys
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert new survey records
CREATE POLICY "Authenticated users can insert surveys"
  ON customer_surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update survey records
CREATE POLICY "Authenticated users can update surveys"
  ON customer_surveys
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete survey records
CREATE POLICY "Authenticated users can delete surveys"
  ON customer_surveys
  FOR DELETE
  TO authenticated
  USING (true);