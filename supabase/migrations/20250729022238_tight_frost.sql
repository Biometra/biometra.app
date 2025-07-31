/*
  # Add USDT balance column to users table

  1. New Columns
    - `usdt_balance` (numeric, default 0) - stores user's USDT balance

  2. Changes
    - Add usdt_balance column to users table with default value 0
    - Update existing users to have 0 USDT balance
*/

-- Add usdt_balance column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'usdt_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN usdt_balance numeric DEFAULT 0;
  END IF;
END $$;