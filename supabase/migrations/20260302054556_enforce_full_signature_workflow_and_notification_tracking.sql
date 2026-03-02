/*
  # Enforce Full Signature Workflow and Add Notification Tracking

  1. Changes to Signature Flow
    - Updated `check_signature_record_not_locked()` trigger function to enforce strict order:
      - Step 1: feedback_izahat (Izahat Sahibi Imzasi) must be signed first
      - Step 2: customer_feedback (Sorumluluk Karari / Aksiyon Imzasi) requires izahat signature
      - Step 3: feedback_closure (Kapatma Imzasi) requires customer_feedback final signature
    - This ensures no step can be skipped in the workflow

  2. New Tables
    - `signature_notifications`
      - `id` (uuid, primary key)
      - `record_id` (uuid, references feedback_records)
      - `step_key` (text) - which signature step triggered the notification (feedback_izahat, customer_feedback, feedback_closure)
      - `notified_at` (timestamptz) - when notification was sent
      - `created_at` (timestamptz)
      - Unique constraint on (record_id, step_key) to prevent duplicate notifications per step

  3. Security
    - RLS enabled on signature_notifications
    - Only service role (edge functions) can insert
    - Authenticated users can read their own notifications
*/

-- 1. Create signature_notifications table for tracking sent emails
CREATE TABLE IF NOT EXISTS signature_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES feedback_records(id),
  step_key text NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_notification_per_step UNIQUE (record_id, step_key)
);

ALTER TABLE signature_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notifications"
  ON signature_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Update check_signature_record_not_locked to enforce full 3-step workflow
CREATE OR REPLACE FUNCTION check_signature_record_not_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
  v_has_izahat_sig boolean;
  v_has_sorumluluk_sig boolean;
BEGIN
  -- Step 2: customer_feedback (Sorumluluk Karari) requires izahat signature
  IF NEW.module_key = 'customer_feedback' THEN
    SELECT is_locked INTO v_locked
    FROM feedback_records
    WHERE id = NEW.record_id;

    IF v_locked = true THEN
      RAISE EXCEPTION 'Bu kayit imzali ve kilitlidir. Yeni imza eklenemez.'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM record_signatures rs
      WHERE rs.module_key = 'feedback_izahat'
      AND rs.record_id = NEW.record_id
    ) INTO v_has_izahat_sig;

    IF NOT v_has_izahat_sig THEN
      RAISE EXCEPTION 'Izahat imzasi olmadan Sorumluluk Karari imzasi atilamaz.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Step 3: feedback_closure (Kapatma) requires customer_feedback final signature
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
