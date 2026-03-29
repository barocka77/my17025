/*
  # Add action assignee and action status to corrective_actions

  ## Summary
  Adds two new columns to support tracking the responsible person and current status
  of the main decided action ("Karar Verilen Faaliyet") independently from the
  overall corrective action record status.

  ## New Columns
  - `action_assignee_id` (uuid, nullable, FK → auth.users) — the person responsible
    for executing the main decided action ("Sorumlu Kişi")
  - `action_status` (text, default 'Açık') — the current status of the main action,
    separate from the overall CA workflow status

  ## Notes
  - No RLS changes needed; existing policies cover all columns on this table.
  - Default value of 'Açık' matches existing status vocabulary in the application.
*/

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS action_assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_status text NOT NULL DEFAULT 'Açık';
