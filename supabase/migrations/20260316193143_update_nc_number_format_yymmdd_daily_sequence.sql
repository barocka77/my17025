/*
  # Update NC Number Format to YYMMDD + Daily Sequence

  ## Summary
  Changes the NC number generation format from NC-YYYY-NNN to YYMMDDNN,
  where the last two digits are a daily counter starting from 01 each new day.

  ## Changes
  - Drops and recreates the generate_nc_number() trigger function
  - New format: YYMMDDNN (e.g., 260316 + 01 = 26031601)
  - Sequence resets to 01 each new calendar day
  - Renumbers existing external_audit nonconformities (detection_date 2026-03-06) sequentially from 01

  ## New Format
  - YY = 2-digit year (e.g., 26)
  - MM = 2-digit month (e.g., 03)
  - DD = 2-digit day (e.g., 06)
  - NN = 2-digit sequence number per day (01, 02, ...)

  ## Important Notes
  - Existing records with the NC-YYYY-NNN format will be updated for external_audit records
  - The trigger applies to all new inserts going forward
*/

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_generate_nc_number ON nonconformities;
DROP FUNCTION IF EXISTS generate_nc_number();

-- Step 2: Create new trigger function with YYMMDD + 2-digit daily sequence
CREATE OR REPLACE FUNCTION generate_nc_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  date_prefix text;
  next_seq int;
BEGIN
  IF NEW.nc_number IS NULL OR NEW.nc_number = '' THEN
    date_prefix := to_char(now(), 'YYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(nc_number FROM 7) AS int)), 0) + 1
      INTO next_seq
      FROM nonconformities
      WHERE nc_number LIKE date_prefix || '%'
        AND LENGTH(nc_number) = 8
        AND nc_number ~ ('^' || date_prefix || '[0-9]{2}$');
    NEW.nc_number := date_prefix || LPAD(next_seq::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Step 3: Re-create trigger
CREATE TRIGGER trg_generate_nc_number
  BEFORE INSERT ON nonconformities
  FOR EACH ROW EXECUTE FUNCTION generate_nc_number();

-- Step 4: Renumber existing external_audit NCs (detection_date 2026-03-06)
-- First temporarily disable unique constraint by using a temp prefix
DO $$
DECLARE
  rec RECORD;
  seq_num int := 1;
BEGIN
  FOR rec IN
    SELECT id FROM nonconformities
    WHERE source = 'external_audit'
      AND detection_date = '2026-03-06'
    ORDER BY created_at
  LOOP
    UPDATE nonconformities
    SET nc_number = 'TEMP_' || seq_num
    WHERE id = rec.id;
    seq_num := seq_num + 1;
  END LOOP;

  seq_num := 1;
  FOR rec IN
    SELECT id FROM nonconformities
    WHERE nc_number LIKE 'TEMP_%'
    ORDER BY CAST(SUBSTRING(nc_number FROM 6) AS int)
  LOOP
    UPDATE nonconformities
    SET nc_number = '26030' || LPAD(seq_num::text, 2, '0')
    WHERE id = rec.id;
    seq_num := seq_num + 1;
  END LOOP;
END $$;
