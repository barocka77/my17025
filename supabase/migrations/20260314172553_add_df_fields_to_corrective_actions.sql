/*
  # Add DF (Düzeltici Faaliyet) fields to corrective_actions table

  1. Changes
    - Add `df_customer_affected` boolean column: tracks if there is an affected customer
    - Add `df_customer_notified` boolean column: tracks if the customer was notified
    - Add `df_report_recall` boolean column: tracks if a report recall is needed

  2. Notes
    - All new columns default to false to preserve existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'df_customer_affected'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN df_customer_affected boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'df_customer_notified'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN df_customer_notified boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'df_report_recall'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN df_report_recall boolean NOT NULL DEFAULT false;
  END IF;
END $$;
