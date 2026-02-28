/*
  # Create feedback_records closure signature role

  1. New Signature Roles
    - `feedback_records` / `Kapatan` (order 1, is_final_approval = true)
    - This role is used for the "Bildirimi Kapat" flow
    - When signed, the feedback record is locked with status "Kapali"

  2. Important Notes
    - This is separate from the existing `feedback_closure` module which handles
      the closure section signatures
    - The `feedback_records` module_key is used specifically for the final
      close-and-lock action on the entire feedback record
*/

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
SELECT 'feedback_records', 'Kapatan', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM module_signature_roles
  WHERE module_key = 'feedback_records' AND role_name = 'Kapatan'
);
