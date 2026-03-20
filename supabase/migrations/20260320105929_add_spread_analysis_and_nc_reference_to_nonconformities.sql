/*
  # Add Spread Analysis and NC Reference fields to nonconformities

  ## Summary
  Adds two new text columns to the `nonconformities` table to support:

  1. New Columns
    - `spread_analysis` (text) — Yayılım Analizi (KAPLAM): Free-text field for documenting
      the spread/scope analysis of the nonconformity, describing how far the issue may
      have propagated and what scope it covers.
    - `nc_reference` (text) — Uygunsuzluk Referansı: Free-text field for referencing related
      documents, standards, clauses, or other nonconformity records associated with this NC.

  ## Notes
  - Both columns are nullable text fields with no default value
  - No RLS changes required — existing policies on the nonconformities table already cover these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'spread_analysis'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN spread_analysis text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'nc_reference'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN nc_reference text;
  END IF;
END $$;
