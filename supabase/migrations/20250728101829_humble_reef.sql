/*
  # Add BIO balance column to users table

  1. Schema Changes
    - Add `bio_balance` column to `users` table
    - Set default value to 0
    - Add index for performance

  2. Data Migration
    - All existing users will have bio_balance = 0
    - New users will start with 0 BIO balance

  3. Performance
    - Index on bio_balance for leaderboard queries
*/

-- Add bio_balance column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN bio_balance numeric DEFAULT 0;
  END IF;
END $$;

-- Add index for bio_balance queries
CREATE INDEX IF NOT EXISTS idx_users_bio_balance 
ON users (bio_balance DESC);

-- Update existing users to have 0 BIO balance if column was just added
UPDATE users SET bio_balance = 0 WHERE bio_balance IS NULL;