/*
  # Implement Record Lock System for Multi-Signature Workflow

  1. Modified Tables
    - `feedback_records`
      - `is_locked` (boolean, default false) - whether record is locked by final approval signature
      - `locked_at` (timestamptz) - when the record was locked
      - `locked_by` (uuid, FK to auth.users) - who applied the final approval signature
      - `unlocked_at` (timestamptz) - when an admin last unlocked the record
      - `unlocked_by` (uuid, FK to auth.users) - which admin unlocked the record
      - `unlock_reason` (text) - mandatory reason provided by admin when unlocking

  2. New Functions
    - `lock_record_on_final_signature()` - trigger function that auto-locks when a final approval role signs
    - `unlock_record(record_id, reason)` - admin-only RPC to unlock a locked record
    - `check_record_not_locked()` - trigger that prevents UPDATE on locked feedback_records

  3. New Triggers
    - `trg_lock_on_final_signature` on record_signatures AFTER INSERT
    - `trg_check_feedback_lock` on feedback_records BEFORE UPDATE

  4. Security
    - Backend-enforced lock: UPDATE trigger on feedback_records rejects changes when is_locked = true
    - Backend-enforced signature block: INSERT trigger on record_signatures rejects when record is locked
    - Admin unlock requires mandatory reason
    - Unlock does NOT delete previous signatures
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN is_locked boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN locked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'locked_by'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN locked_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'unlocked_at'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN unlocked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'unlocked_by'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN unlocked_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'unlock_reason'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN unlock_reason text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION lock_record_on_final_signature()
RETURNS TRIGGER AS $$
DECLARE
  v_is_final boolean;
BEGIN
  SELECT is_final_approval INTO v_is_final
  FROM module_signature_roles
  WHERE module_key = NEW.module_key
    AND role_name = NEW.signer_role
  LIMIT 1;

  IF v_is_final = true THEN
    UPDATE feedback_records
    SET is_locked = true,
        locked_at = now(),
        locked_by = NEW.signer_id,
        status = 'IMZALI'
    WHERE id = NEW.record_id
      AND NEW.module_key = 'customer_feedback';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_on_final_signature ON record_signatures;
CREATE TRIGGER trg_lock_on_final_signature
  AFTER INSERT ON record_signatures
  FOR EACH ROW
  EXECUTE FUNCTION lock_record_on_final_signature();

CREATE OR REPLACE FUNCTION check_feedback_not_locked()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true AND NEW.is_locked = true THEN
    RAISE EXCEPTION 'Bu kayit imzali ve kilitlidir. Degisiklik yapilamaz.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_feedback_lock ON feedback_records;
CREATE TRIGGER trg_check_feedback_lock
  BEFORE UPDATE ON feedback_records
  FOR EACH ROW
  EXECUTE FUNCTION check_feedback_not_locked();

CREATE OR REPLACE FUNCTION check_signature_record_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  v_locked boolean;
BEGIN
  IF NEW.module_key = 'customer_feedback' THEN
    SELECT is_locked INTO v_locked
    FROM feedback_records
    WHERE id = NEW.record_id;

    IF v_locked = true THEN
      RAISE EXCEPTION 'Bu kayit imzali ve kilitlidir. Yeni imza eklenemez.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_signature_record_lock ON record_signatures;
CREATE TRIGGER trg_check_signature_record_lock
  BEFORE INSERT ON record_signatures
  FOR EACH ROW
  EXECUTE FUNCTION check_signature_record_not_locked();

CREATE OR REPLACE FUNCTION unlock_feedback_record(p_record_id uuid, p_reason text)
RETURNS json AS $$
DECLARE
  v_role text;
  v_locked boolean;
BEGIN
  SELECT role::text INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'Bu islemi sadece admin kullanicilar yapabilir.'
      USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Kilit acma nedeni zorunludur.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT is_locked INTO v_locked
  FROM feedback_records
  WHERE id = p_record_id;

  IF v_locked IS NULL THEN
    RAISE EXCEPTION 'Kayit bulunamadi.'
      USING ERRCODE = 'P0003';
  END IF;

  IF v_locked = false THEN
    RETURN json_build_object('success', true, 'message', 'Kayit zaten acik.');
  END IF;

  UPDATE feedback_records
  SET is_locked = false,
      locked_at = null,
      locked_by = null,
      unlocked_at = now(),
      unlocked_by = auth.uid(),
      unlock_reason = trim(p_reason),
      status = 'Açık'
  WHERE id = p_record_id;

  RETURN json_build_object('success', true, 'message', 'Kayit kilidi basariyla acildi.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
