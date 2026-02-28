/*
  # Add closure fields to feedback_records and create closure signature roles

  1. Modified Tables
    - `feedback_records`
      - Added `closure_date` (date) - date when feedback was officially closed
      - Added `closure_notes` (text) - closure statement/notes

  2. New Data
    - `module_signature_roles` entries for 'feedback_closure' module
      - Hazirlayan (preparer, order 1)
      - Onaylayan (approver, order 2, final approval)

  3. Notes
    - closure_date and closure_notes are nullable
    - Signature roles allow the closure to be formally signed off
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'closure_date'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN closure_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'closure_notes'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN closure_notes text DEFAULT '';
  END IF;
END $$;

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_closure', 'Hazirlayan', 1, false
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles WHERE module_key = 'feedback_closure' AND role_name = 'Hazirlayan'
);

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_closure', 'Onaylayan', 2, true
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles WHERE module_key = 'feedback_closure' AND role_name = 'Onaylayan'
);