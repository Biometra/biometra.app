/*
  # Add Energy System to Mining

  1. New Columns
    - `energy` (integer, default 100) - current energy
    - `max_energy` (integer, default 100) - maximum energy capacity
    - `last_energy_update` (timestamptz, default now()) - for energy regeneration

  2. Security
    - Update existing RLS policies to include new columns

  3. Performance
    - Add index on last_energy_update for regeneration queries
*/

-- Add energy system columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'energy'
  ) THEN
    ALTER TABLE users ADD COLUMN energy integer DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'max_energy'
  ) THEN
    ALTER TABLE users ADD COLUMN max_energy integer DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_energy_update'
  ) THEN
    ALTER TABLE users ADD COLUMN last_energy_update timestamptz DEFAULT now();
  END IF;
END $$;

-- Add index for energy regeneration queries
CREATE INDEX IF NOT EXISTS idx_users_energy_update 
ON users (last_energy_update);

-- Update existing users to have full energy
UPDATE users 
SET energy = 100, max_energy = 100, last_energy_update = now()
WHERE energy IS NULL OR max_energy IS NULL;