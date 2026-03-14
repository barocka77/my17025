/*
  # Add Impact Analysis Fields to Nonconformities

  ## Changes
  Adds four boolean fields to the nonconformities table for the "Uygunsuzluğun Etkisi" section:

  1. `impact_inappropriate_calibration` — Uygunsuz kalibrasyon işi mi? (Hayır/Evet)
  2. `impact_requires_stoppage` — Kalibrasyon durdurulması gerekiyor mu? (Hayır/Evet)
  3. `impact_recurrence_possible` — Tekrarlanma ihtimali var mı? (Hayır/Evet)
  4. `impact_requires_extended_analysis` — Kök neden/düzeltici faaliyet genişletilmesi gerekiyor mu? (Hayır/Evet)

  All fields default to false (Hayır).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'impact_inappropriate_calibration'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN impact_inappropriate_calibration boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'impact_requires_stoppage'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN impact_requires_stoppage boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'impact_recurrence_possible'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN impact_recurrence_possible boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nonconformities' AND column_name = 'impact_requires_extended_analysis'
  ) THEN
    ALTER TABLE nonconformities ADD COLUMN impact_requires_extended_analysis boolean DEFAULT false;
  END IF;
END $$;
