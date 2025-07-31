/*
  # Add referral_code column to users table

  1. New Columns
    - `referral_code` (text, unique) - User's unique referral code
    - `referred_by_user_id` (uuid, nullable) - ID of user who referred this user

  2. Security
    - Add unique constraint on referral_code
    - Add foreign key constraint for referred_by_user_id

  3. Data Migration
    - Generate referral codes for existing users
    - Add indexes for performance
*/

-- Add referral_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code text;
  END IF;
END $$;

-- Add referred_by_user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by_user_id uuid;
  END IF;
END $$;

-- Generate referral codes for existing users who don't have one
UPDATE users 
SET referral_code = UPPER(SUBSTRING(id::text, 1, 4) || SUBSTRING(id::text, -4))
WHERE referral_code IS NULL;

-- Add unique constraint on referral_code if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_referral_code_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Add foreign key constraint for referred_by_user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_referred_by_user_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_referred_by_user_id_fkey 
    FOREIGN KEY (referred_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users(referred_by_user_id);