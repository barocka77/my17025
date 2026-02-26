/*
  # Rename equipment name column

  1. Changes
    - Rename `name` column to `device_name` in equipment_hardware table
    - This aligns with the FR.35 form structure
  
  2. Notes
    - Uses ALTER TABLE to rename the column
    - All existing data is preserved
*/

ALTER TABLE equipment_hardware 
RENAME COLUMN name TO device_name;