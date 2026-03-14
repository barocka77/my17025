/*
  # Add evaluation fields to corrective_actions table

  ## Summary
  Adds "Sonuçların Değerlendirilmesi" (Results Evaluation) fields to support
  the evaluation section that becomes editable when "İlgili Faaliyet Yerine
  Getirilmiştir" is checked.

  ## New Columns
  - `nonconformity_cost` (text) — Uygunsuzluk Maliyeti
  - `root_cause_processes` (text) — Kök Neden Prosesleri
  - `monitoring_period` (text) — Faaliyetin Etkinliğini İzleme Süresi
  - `closure_date` (date) — Faaliyet Kapatma Tarihi
  - `effectiveness_evaluation_date` (date) — Etkinlik Değerlendirme Tarihi
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'nonconformity_cost'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN nonconformity_cost text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'root_cause_processes'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN root_cause_processes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'monitoring_period'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN monitoring_period text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'closure_date'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN closure_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'effectiveness_evaluation_date'
  ) THEN
    ALTER TABLE corrective_actions ADD COLUMN effectiveness_evaluation_date date;
  END IF;
END $$;
