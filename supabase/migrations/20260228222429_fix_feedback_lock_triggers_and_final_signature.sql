/*
  # Fix conflicting lock triggers on feedback_records

  1. Problem
    - Two BEFORE UPDATE triggers on feedback_records both check lock state and conflict:
      - `prevent_update_if_locked` blocks ALL updates when is_locked=true
      - `check_feedback_not_locked` blocks updates when both OLD and NEW is_locked=true
    - The AFTER INSERT trigger `lock_record_on_final_signature` on record_signatures tries to
      UPDATE feedback_records to lock it, but the BEFORE UPDATE triggers block that update
    - This causes the "Onayla ve Imzala" button to fail with a 500 error

  2. Fix
    - Drop both conflicting BEFORE UPDATE triggers and their functions
    - Create a single smart BEFORE UPDATE trigger that:
      - Allows locking transitions (is_locked: false -> true)
      - Allows unlocking transitions (is_locked: true -> false) for admin unlock
      - Blocks all other modifications when record is locked
    - Update `lock_record_on_final_signature` to also handle `feedback_records` module (closure)
      with status 'Kapali'

  3. Security
    - Locked records remain protected from unauthorized edits
    - Lock/unlock transitions are still permitted (controlled by edge function and admin unlock)
*/

DROP TRIGGER IF EXISTS trg_prevent_locked_update ON feedback_records;
DROP FUNCTION IF EXISTS prevent_update_if_locked();

DROP TRIGGER IF EXISTS trg_check_feedback_lock ON feedback_records;
DROP FUNCTION IF EXISTS check_feedback_not_locked();

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
    RAISE EXCEPTION 'Bu kayit imzali ve kilitlidir. Degisiklik yapilamaz.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_locked_feedback
  BEFORE UPDATE ON feedback_records
  FOR EACH ROW
  EXECUTE FUNCTION guard_locked_feedback();

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

  IF v_is_final = true AND NEW.module_key = 'feedback_records' THEN
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
