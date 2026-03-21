/*
  # Add 5 Why Fields to nonconformity_root_causes

  ## Summary
  This migration extends the nonconformity_root_causes table to support the
  5 Why (5 Neden) root cause analysis method alongside the existing Balık Kılçığı
  (fishbone/category) method.

  ## Changes

  ### Modified Table: nonconformity_root_causes
  - Added `rca_method` (text): identifies the method used ('fishbone' or '5why')
  - Added `why_1_question` through `why_5_question` (text): AI-generated questions
  - Added `why_1_answer` through `why_5_answer` (text): user-provided answers
  - Added `root_cause_summary` (text): AI-generated final summary

  ### Constraint Update
  - Dropped old rca_category check constraint that excluded 'five_why'
  - Added new check constraint that includes 'five_why' as a valid category
  - Added check constraint for rca_method values

  ## Notes
  - Existing fishbone records are unaffected; rca_method defaults to 'fishbone'
  - 5Why records will have rca_category = 'five_why' and rca_method = '5why'
  - All new columns are nullable to maintain backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformity_root_causes' AND column_name = 'rca_method'
  ) THEN
    ALTER TABLE nonconformity_root_causes ADD COLUMN rca_method text NOT NULL DEFAULT 'fishbone';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformity_root_causes' AND column_name = 'why_1_question'
  ) THEN
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_1_question text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_1_answer text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_2_question text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_2_answer text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_3_question text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_3_answer text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_4_question text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_4_answer text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_5_question text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN why_5_answer text;
    ALTER TABLE nonconformity_root_causes ADD COLUMN root_cause_summary text;
  END IF;
END $$;

ALTER TABLE nonconformity_root_causes DROP CONSTRAINT IF EXISTS nonconformity_root_causes_rca_category_check;

ALTER TABLE nonconformity_root_causes ADD CONSTRAINT nonconformity_root_causes_rca_category_check
  CHECK (rca_category IN ('human','method','equipment','environment','material','management','five_why'));

ALTER TABLE nonconformity_root_causes DROP CONSTRAINT IF EXISTS nonconformity_root_causes_rca_method_check;

ALTER TABLE nonconformity_root_causes ADD CONSTRAINT nonconformity_root_causes_rca_method_check
  CHECK (rca_method IN ('fishbone','5why'));
