/*
  # Add fulfillment fields to corrective_actions

  ## Changes
  - `action_fulfilled` (boolean, default false): Flags whether the action has been carried out
  - `fulfillment_date` (date, nullable): The date the action was fulfilled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'action_fulfilled'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN action_fulfilled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'fulfillment_date'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN fulfillment_date date;
  END IF;
END $$;
