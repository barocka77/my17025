/*
  # Add customer impact fields to nonconformities

  ## Summary
  Moves the three customer impact assessment checkboxes from the corrective
  actions (DF) form into the nonconformity impact assessment section.
  This allows the fields to be edited directly from the "Uygunsuzluk Etki" tab
  of the NonconformityDetailDrawer.

  ## Modified Tables
  - `nonconformities`
    - `customer_affected` (boolean, default false) — nonconformity affects a customer
    - `customer_notified` (boolean, default false) — customer was notified
    - `report_recall` (boolean, default false) — report recall is required

  ## Notes
  - All three columns are nullable booleans defaulting to false
  - Previous values stored on corrective_actions.df_customer_* are not migrated
    (they were UI-only fields not yet widely populated)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'customer_affected'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN customer_affected boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'customer_notified'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN customer_notified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'report_recall'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN report_recall boolean DEFAULT false;
  END IF;
END $$;
