/*
  # Add Onaylayan role to feedback_izahat module

  1. Changes
    - Add a new "Onaylayan" (Approver) signature role to the `feedback_izahat` module
    - Role order 2, after the existing "Izahat Sahibi" role (order 1)
    - Not a final approval role (does not lock the record)

  2. Purpose
    - Allows an approver to sign off on the izahat (explanation) section
    - Provides an additional level of verification for the explanation
*/

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_izahat', 'Onaylayan', 2, false
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles
  WHERE module_key = 'feedback_izahat' AND role_name = 'Onaylayan'
);