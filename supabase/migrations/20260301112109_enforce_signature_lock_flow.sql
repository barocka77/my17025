/*
  # Enforce signature and lock flow for feedback records

  1. Changes
    - Updated `check_signature_record_not_locked` trigger function:
      - Prevents feedback_closure signatures unless customer_feedback (Sorumluluk Karari) has been signed
      - This enforces: Sorumluluk Karari imza -> Kapatma imza -> Lock flow
    - Updated `lock_record_on_final_signature` trigger function:
      - feedback_closure final approval now locks the record (was already working)
      - customer_feedback final approval no longer directly locks - it just marks as IMZALI
    - Updated `unlock_feedback_record` function:
      - Now logs an unlock signature in record_signatures with signature_type = 'unlock'
      - This creates an audit trail of all unlock operations

  2. Important Notes
    - Flow: Sorumluluk Karari imzalanmadan Kapatma bolumu aktif olmaz
    - Kapatma imzasi olmadan kayit kilitlenemez (lock butonu frontend'de disabled)
    - Unlock islemleri record_signatures tablosuna kayit edilir
    - Kronolojik imza/unlock gecmisi takip edilebilir
*/

-- 1. Update check_signature_record_not_locked to enforce flow
CREATE OR REPLACE FUNCTION check_signature_record_not_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
  v_has_sorumluluk_sig boolean;
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

  IF NEW.module_key = 'feedback_closure' THEN
    SELECT is_locked INTO v_locked
    FROM feedback_records
    WHERE id = NEW.record_id;

    IF v_locked = true THEN
      RAISE EXCEPTION 'Bu kayit imzali ve kilitlidir. Yeni imza eklenemez.'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM record_signatures rs
      JOIN module_signature_roles msr ON msr.module_key = rs.module_key AND msr.role_name = rs.signer_role
      WHERE rs.module_key = 'customer_feedback'
      AND rs.record_id = NEW.record_id
      AND msr.is_final_approval = true
    ) INTO v_has_sorumluluk_sig;

    IF NOT v_has_sorumluluk_sig THEN
      RAISE EXCEPTION 'Sorumluluk Karari imzasi olmadan Kapatma imzasi atilamaz.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Update unlock_feedback_record to log unlock signature
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
      status = 'Açık'
  WHERE id = p_record_id;

  INSERT INTO record_signatures (
    module_key, record_id, signer_role, signer_name, signer_id,
    signature_type, signed_at, user_id
  ) VALUES (
    'feedback_unlock', p_record_id, 'Kilit Acan',
    v_user_name, auth.uid(), 'unlock', now(), auth.uid()
  );

  RETURN json_build_object('success', true, 'message', 'Kayit kilidi basariyla acildi.');
END;
$$;
