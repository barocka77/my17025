/*
  # Remove Onaylayan role from feedback_izahat

  1. Changes
    - Remove the "Onaylayan" signature role from the feedback_izahat module
    - Only "Izahat Sahibi" role will remain

  2. Important Notes
    - Existing signatures with the "Onaylayan" role on records are not deleted
    - Only the role definition is removed so it no longer appears in the UI
*/

DELETE FROM module_signature_roles
WHERE module_key = 'feedback_izahat' AND role_name = 'Onaylayan';