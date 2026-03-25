/*
  # Add notlar column to document_master_list

  ## Change
  Adds an optional free-text `notlar` (notes) column to the document_master_list table.

  ## Details
  - `notlar` (text, nullable, default empty string) — allows admins to attach notes to any document
  - No RLS changes needed; existing policies already cover all columns on this table
*/

ALTER TABLE document_master_list
  ADD COLUMN IF NOT EXISTS notlar text NOT NULL DEFAULT '';
