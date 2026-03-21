/*
  # Drop conflicting nc_number trigger and fix existing record

  ## Problem
  Two BEFORE INSERT triggers on `nonconformities` fire in alphabetical order:
  1. `trg_generate_nc_number` → runs `generate_nc_number()` which produces `YYMMDD + seq` (no prefix)
  2. `trg_set_nc_number` → runs `set_nc_number()` which calls `generate_record_number('NC')` for `NC + YYMMDD + seq`

  Since `trg_generate_nc_number` fires first and sets `nc_number` to a non-null value,
  `trg_set_nc_number` skips because it only acts when `nc_number IS NULL OR ''`.

  ## Fix
  - Drop `trg_generate_nc_number` so only the correct `trg_set_nc_number` fires.
  - Update the mis-numbered record(s) that were created without the NC prefix.
*/

DROP TRIGGER IF EXISTS trg_generate_nc_number ON nonconformities;

UPDATE nonconformities
SET nc_number = 'NC' || nc_number
WHERE nc_number ~ '^[0-9]{8}$';
