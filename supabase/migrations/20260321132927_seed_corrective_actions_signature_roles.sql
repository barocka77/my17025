/*
  # Seed corrective_actions module signature roles

  ## Summary
  Registers signature roles for the "corrective_actions" module so that
  the SignaturesSection component can be used on the Düzeltici Faaliyet 
  form's İmzalar tab.

  ## New Rows in module_signature_roles
  - module_key: corrective_actions
    - Hazirlayan (order 1, not final)
    - Kontrol Eden (order 2, not final)
    - Onaylayan   (order 3, final approval)
*/

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
VALUES
  ('corrective_actions', 'Hazirlayan',   1, false),
  ('corrective_actions', 'Kontrol Eden', 2, false),
  ('corrective_actions', 'Onaylayan',    3, true)
ON CONFLICT (module_key, role_name) DO NOTHING;
