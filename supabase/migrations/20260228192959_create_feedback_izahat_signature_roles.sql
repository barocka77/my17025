/*
  # Create signature roles for feedback izahat (explanation) section

  1. New Data
    - `module_signature_roles` entries for 'feedback_izahat' module
      - Izahat Sahibi (explanation owner signature, order 1, final approval)

  2. Notes
    - This adds a single signature role for the izahat section of feedback records
    - The izahat section signature allows the explanation provider to formally sign off
*/

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_izahat', 'Izahat Sahibi', 1, false
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles WHERE module_key = 'feedback_izahat' AND role_name = 'Izahat Sahibi'
);
