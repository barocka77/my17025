/*
  # Add corrective_action_suggestion to nonconformity_root_causes

  1. Changes
    - Add `corrective_action_suggestion` column (TEXT, nullable) to `nonconformity_root_causes`
    - This column stores the AI-generated corrective action recommendation
      produced after the 5 Why analysis root cause summary is finalized.
*/

ALTER TABLE nonconformity_root_causes
ADD COLUMN IF NOT EXISTS corrective_action_suggestion TEXT;
