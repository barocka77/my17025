/*
  # Create feedback_actions table for multiple actions per feedback record

  1. New Tables
    - `feedback_actions`
      - `id` (uuid, primary key)
      - `feedback_id` (uuid, foreign key to feedback_records)
      - `action_description` (text) - description of the action
      - `responsible_person` (text) - person responsible
      - `deadline` (date) - target deadline
      - `status` (text, default 'Açık') - current status
      - `sort_order` (integer, default 0) - ordering
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `feedback_actions` table
    - Add policies for authenticated users based on feedback_records ownership
*/

CREATE TABLE IF NOT EXISTS feedback_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES feedback_records(id) ON DELETE CASCADE,
  action_description text DEFAULT '',
  responsible_person text DEFAULT '',
  deadline date,
  status text DEFAULT 'Açık',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select feedback actions"
  ON feedback_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_records fr
      WHERE fr.id = feedback_actions.feedback_id
    )
  );

CREATE POLICY "Authenticated users can insert feedback actions"
  ON feedback_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_records fr
      WHERE fr.id = feedback_actions.feedback_id
    )
  );

CREATE POLICY "Authenticated users can update feedback actions"
  ON feedback_actions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_records fr
      WHERE fr.id = feedback_actions.feedback_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_records fr
      WHERE fr.id = feedback_actions.feedback_id
    )
  );

CREATE POLICY "Authenticated users can delete feedback actions"
  ON feedback_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_records fr
      WHERE fr.id = feedback_actions.feedback_id
    )
  );