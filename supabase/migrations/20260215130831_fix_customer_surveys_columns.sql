/*
  # Fix Customer Surveys Table Column Names

  1. Changes
    - Rename `service_quality_score` to `service_quality`
    - Rename `technical_competence_score` to `technical_competence`
    - Rename `delivery_speed_score` to `deadline_compliance`
    - Rename `communication_score` to `communication_quality`
    - Rename `comments` to `customer_comments`
    - Remove `is_reviewed` column (not needed)
    - Add `updated_at` column

  2. Notes
    - Aligns database columns with frontend code expectations
    - Maintains data integrity with proper constraints
*/

-- Rename columns to match the code expectations
DO $$
BEGIN
  -- Rename service_quality_score to service_quality
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'service_quality_score'
  ) THEN
    ALTER TABLE customer_surveys RENAME COLUMN service_quality_score TO service_quality;
  END IF;

  -- Rename technical_competence_score to technical_competence
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'technical_competence_score'
  ) THEN
    ALTER TABLE customer_surveys RENAME COLUMN technical_competence_score TO technical_competence;
  END IF;

  -- Rename delivery_speed_score to deadline_compliance
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'delivery_speed_score'
  ) THEN
    ALTER TABLE customer_surveys RENAME COLUMN delivery_speed_score TO deadline_compliance;
  END IF;

  -- Rename communication_score to communication_quality
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'communication_score'
  ) THEN
    ALTER TABLE customer_surveys RENAME COLUMN communication_score TO communication_quality;
  END IF;

  -- Rename comments to customer_comments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'comments'
  ) THEN
    ALTER TABLE customer_surveys RENAME COLUMN comments TO customer_comments;
  END IF;

  -- Drop is_reviewed if it exists (not needed in the current design)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'is_reviewed'
  ) THEN
    ALTER TABLE customer_surveys DROP COLUMN is_reviewed;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_surveys' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE customer_surveys ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Add constraints if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'customer_surveys' AND constraint_name LIKE '%service_quality%'
  ) THEN
    ALTER TABLE customer_surveys ADD CONSTRAINT service_quality_check 
      CHECK (service_quality >= 1 AND service_quality <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'customer_surveys' AND constraint_name LIKE '%technical_competence%'
  ) THEN
    ALTER TABLE customer_surveys ADD CONSTRAINT technical_competence_check 
      CHECK (technical_competence >= 1 AND technical_competence <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'customer_surveys' AND constraint_name LIKE '%deadline_compliance%'
  ) THEN
    ALTER TABLE customer_surveys ADD CONSTRAINT deadline_compliance_check 
      CHECK (deadline_compliance >= 1 AND deadline_compliance <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'customer_surveys' AND constraint_name LIKE '%communication_quality%'
  ) THEN
    ALTER TABLE customer_surveys ADD CONSTRAINT communication_quality_check 
      CHECK (communication_quality >= 1 AND communication_quality <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'customer_surveys' AND constraint_name LIKE '%overall_satisfaction%'
  ) THEN
    ALTER TABLE customer_surveys ADD CONSTRAINT overall_satisfaction_check 
      CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5);
  END IF;
END $$;