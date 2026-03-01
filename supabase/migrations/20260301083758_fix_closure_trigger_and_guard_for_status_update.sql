/*
  # Fix closure trigger and guard to allow status update on locked records

  1. Problem
    - The closure signature uses module_key = 'feedback_closure' but the lock trigger
      only checks 'feedback_records', so status stays 'IMZALI' instead of 'Kapalı'
    - The guard trigger blocks status updates on already-locked records

  2. Fix
    - Update guard_locked_feedback to allow status changes from 'IMZALI' to 'Kapalı'
      when record stays locked
    - Update lock_record_on_final_signature to handle 'feedback_closure' module_key
    - Fix existing records with wrong status

  3. Security
    - No RLS changes
    - Guard still prevents unauthorized edits to locked records
*/

CREATE OR REPLACE FUNCTION guard_locked_feedback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_locked = true AND NEW.is_locked = false THEN
    RETURN NEW;
  END IF;

  IF OLD.is_locked = false AND NEW.is_locked = true THEN
    RETURN NEW;
  END IF;

  IF OLD.is_locked = true AND NEW.is_locked = true THEN
    IF OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'Kapalı'
       AND OLD.locked_by IS NOT DISTINCT FROM NEW.locked_by
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Bu kayit imzali ve kilitlidir. Degisiklik yapilamaz.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION lock_record_on_final_signature()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_final boolean;
BEGIN
  SELECT is_final_approval INTO v_is_final
  FROM module_signature_roles
  WHERE module_key = NEW.module_key
    AND role_name = NEW.signer_role
  LIMIT 1;

  IF v_is_final = true AND NEW.module_key = 'customer_feedback' THEN
    UPDATE feedback_records
    SET is_locked = true,
        locked_at = now(),
        locked_by = NEW.signer_id,
        status = 'IMZALI'
    WHERE id = NEW.record_id;
  END IF;

  IF v_is_final = true AND (NEW.module_key = 'feedback_records' OR NEW.module_key = 'feedback_closure') THEN
    UPDATE feedback_records
    SET is_locked = true,
        locked_at = now(),
        locked_by = NEW.signer_id,
        status = 'Kapalı'
    WHERE id = NEW.record_id;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE feedback_records
SET status = 'Kapalı'
WHERE id IN (
  SELECT DISTINCT rs.record_id
  FROM record_signatures rs
  JOIN module_signature_roles msr
    ON msr.module_key = rs.module_key AND msr.role_name = rs.signer_role
  WHERE rs.module_key = 'feedback_closure'
    AND msr.is_final_approval = true
)
AND status != 'Kapalı';