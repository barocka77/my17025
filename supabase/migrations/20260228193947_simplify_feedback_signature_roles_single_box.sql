/*
  # Simplify signature roles for customer_feedback and feedback_closure

  1. Modified Data
    - `module_signature_roles`
      - Removed extra roles from 'customer_feedback' (Kontrol Eden, Onaylayan)
      - Renamed remaining 'customer_feedback' role to 'Karar Verici'
      - Removed extra role from 'feedback_closure' (Onaylayan)
      - Renamed remaining 'feedback_closure' role to 'Kapatan Yetkili'

  2. Notes
    - Each module now has exactly 1 signature role
    - No existing signatures reference these roles so changes are safe
*/

DELETE FROM module_signature_roles
WHERE module_key = 'customer_feedback' AND role_name IN ('Kontrol Eden', 'Onaylayan');

UPDATE module_signature_roles
SET role_name = 'Karar Verici', is_final_approval = true
WHERE module_key = 'customer_feedback' AND role_name = 'Hazirlayan';

DELETE FROM module_signature_roles
WHERE module_key = 'feedback_closure' AND role_name = 'Onaylayan';

UPDATE module_signature_roles
SET role_name = 'Kapatan Yetkili', is_final_approval = true
WHERE module_key = 'feedback_closure' AND role_name = 'Hazirlayan';
