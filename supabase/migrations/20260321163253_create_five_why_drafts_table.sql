/*
  # Create five_why_drafts table

  ## Purpose
  Stores in-progress (partial) 5 Why analysis data so users can resume where they left off
  if they close or navigate away from the form before completing.

  ## New Tables
  - `five_why_drafts`
    - `id` (uuid, primary key)
    - `nonconformity_id` (uuid, FK to nonconformities, unique per user)
    - `user_id` (uuid, FK to auth.users)
    - `steps` (jsonb) - array of {question, answer} objects for completed steps
    - `current_question` (text) - the currently active AI-generated question
    - `summary` (text) - final summary if generated
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only access their own drafts
  - Auto-cleanup: draft is deleted after final save by the app
*/

CREATE TABLE IF NOT EXISTS five_why_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonconformity_id uuid NOT NULL REFERENCES nonconformities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steps jsonb NOT NULL DEFAULT '[]',
  current_question text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nonconformity_id, user_id)
);

ALTER TABLE five_why_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own five why drafts"
  ON five_why_drafts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own five why drafts"
  ON five_why_drafts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own five why drafts"
  ON five_why_drafts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own five why drafts"
  ON five_why_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
