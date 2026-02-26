/*
  # Create Personal Notes Table

  1. New Tables
    - `personal_notes`
      - `id` (uuid, primary key) - Unique identifier for each note
      - `user_id` (uuid, foreign key) - Links to auth.users
      - `title` (text) - Note title
      - `content` (text) - Note content
      - `created_at` (timestamptz) - When the note was created
      - `updated_at` (timestamptz) - When the note was last updated

  2. Security
    - Enable RLS on `personal_notes` table
    - Add policies for users to manage only their own notes:
      - Users can view their own notes
      - Users can create their own notes
      - Users can update their own notes
      - Users can delete their own notes
*/

-- Create personal_notes table
CREATE TABLE IF NOT EXISTS personal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT '',
  content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can view only their own notes
CREATE POLICY "Users can view own notes"
  ON personal_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for INSERT: Users can create their own notes
CREATE POLICY "Users can create own notes"
  ON personal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update only their own notes
CREATE POLICY "Users can update own notes"
  ON personal_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete only their own notes
CREATE POLICY "Users can delete own notes"
  ON personal_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_id ON personal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_updated_at ON personal_notes(updated_at DESC);