/*
  # Add completed_date to feedback_actions and create signature roles

  1. Modified Tables
    - `feedback_actions`
      - Added `completed_date` (date) - date when action was completed

  2. New Data
    - `module_signature_roles` entries for 'feedback_action' module
      - Hazirlayan (preparer, order 1)
      - Onaylayan (approver, order 2, final approval)

  3. Notes
    - completed_date is nullable, only set when status is Tamamlandi
    - Signature roles allow each action to be individually signed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_actions' AND column_name = 'completed_date'
  ) THEN
    ALTER TABLE feedback_actions ADD COLUMN completed_date date;
  END IF;
END $$;

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_action', 'Hazirlayan', 1, false
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles WHERE module_key = 'feedback_action' AND role_name = 'Hazirlayan'
);

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_action', 'Onaylayan', 2, true
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles WHERE module_key = 'feedback_action' AND role_name = 'Onaylayan'
);