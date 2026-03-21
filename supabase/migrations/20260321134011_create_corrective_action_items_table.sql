/*
  # Create corrective_action_items table

  ## Summary
  Adds a sub-actions table for corrective action records, mirroring the
  feedback_actions pattern. Each corrective_action record can have multiple
  individual action items that can be tracked independently.

  ## New Tables
  - `corrective_action_items`
    - `id` (uuid, primary key)
    - `corrective_action_id` (uuid, FK to corrective_actions ON DELETE CASCADE)
    - `action_description` (text) — description of the action item
    - `responsible_person` (text) — name of responsible person
    - `deadline` (date) — target completion date
    - `status` (text, default 'Devam Ediyor') — Devam Ediyor | Tamamlandı
    - `completed_date` (date) — set when status becomes Tamamlandı
    - `sort_order` (integer, default 0) — display order
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled; authenticated users can SELECT/INSERT/UPDATE/DELETE rows
    where the parent corrective_action exists.

  ## New module_signature_roles rows
  - module_key: ca_action_item
    - Hazirlayan (order 1)
    - Onaylayan  (order 2, final)
*/

CREATE TABLE IF NOT EXISTS corrective_action_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id uuid NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  action_description   text DEFAULT '',
  responsible_person   text DEFAULT '',
  deadline             date,
  status               text DEFAULT 'Devam Ediyor',
  completed_date       date,
  sort_order           integer DEFAULT 0,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE corrective_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select corrective action items"
  ON corrective_action_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM corrective_actions ca
      WHERE ca.id = corrective_action_items.corrective_action_id
    )
  );

CREATE POLICY "Authenticated users can insert corrective action items"
  ON corrective_action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM corrective_actions ca
      WHERE ca.id = corrective_action_items.corrective_action_id
    )
  );

CREATE POLICY "Authenticated users can update corrective action items"
  ON corrective_action_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM corrective_actions ca
      WHERE ca.id = corrective_action_items.corrective_action_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM corrective_actions ca
      WHERE ca.id = corrective_action_items.corrective_action_id
    )
  );

CREATE POLICY "Authenticated users can delete corrective action items"
  ON corrective_action_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM corrective_actions ca
      WHERE ca.id = corrective_action_items.corrective_action_id
    )
  );

INSERT INTO module_signature_roles (module_key, role_name, role_order, is_final_approval)
VALUES
  ('ca_action_item', 'Hazirlayan', 1, false),
  ('ca_action_item', 'Onaylayan',  2, true)
ON CONFLICT (module_key, role_name) DO NOTHING;
