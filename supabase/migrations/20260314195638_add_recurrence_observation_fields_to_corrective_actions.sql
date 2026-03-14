/*
  # Add recurrence observation fields to corrective_actions table

  ## Summary
  Adds two new checkbox + date fields for post-action observation results:
  - no_recurrence_observed: "Faaliyetten Sonra Uygunsuzluk Görülmemiştir"
  - recurrence_observed: "Düzeltici Faaliyet Sonrası Uygunsuzluk Tekrar Etmektedir"
  Each has a corresponding date field.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'no_recurrence_observed'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN no_recurrence_observed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'no_recurrence_date'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN no_recurrence_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'recurrence_observed'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN recurrence_observed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'recurrence_date'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN recurrence_date date;
  END IF;
END $$;
