/*
  # Add last_notified_step to feedback_records and reset on unlock

  1. Modified Tables
    - `feedback_records`
      - `last_notified_step` (text, nullable) - tracks which signature step was last notified
        to prevent duplicate emails for the same step

  2. Modified Functions
    - `unlock_feedback_record` - now resets last_notified_step to NULL when a record
      is unlocked, allowing the notification workflow to restart from scratch

  3. Important Notes
    - Duplicate email prevention: if last_notified_step matches the current next_step,
      the edge function will skip sending
    - On unlock, last_notified_step is cleared so notifications can fire again
      as the signature workflow restarts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_records' AND column_name = 'last_notified_step'
  ) THEN
    ALTER TABLE feedback_records ADD COLUMN last_notified_step text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION unlock_feedback_record(p_record_id uuid, p_reason text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_locked boolean;
  v_user_name text;
BEGIN
  SELECT role::text INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
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

  SELECT COALESCE(full_name, email, 'Bilinmeyen') INTO v_user_name
  FROM profiles
  WHERE id = auth.uid();

  UPDATE feedback_records
  SET is_locked = false,
      locked_at = null,
      locked_by = null,
      unlocked_at = now(),
      unlocked_by = auth.uid(),
      unlock_reason = trim(p_reason),
      status = 'Açık',
      last_notified_step = null
  WHERE id = p_record_id;

  INSERT INTO record_signatures (
    module_key, record_id, signer_role, signer_name, signer_id,
    signature_type, signed_at, user_id
  ) VALUES (
    'feedback_unlock', p_record_id, 'Kilit Acan',
    v_user_name, auth.uid(), 'unlock', now(), auth.uid()
  );

  DELETE FROM signature_notifications WHERE record_id = p_record_id;

  RETURN json_build_object('success', true, 'message', 'Kayit kilidi basariyla acildi.');
END;
$$;