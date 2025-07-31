/*
  # Recreate users table with complete schema

  1. New Tables
    - `users` (recreated)
      - `id` (uuid, primary key)
      - `email` (text, unique, not null) - for authentication
      - `username` (text, not null) - display name
      - `password_hash` (text, not null) - encrypted password
      - `ore_balance` (numeric, default 100) - game currency
      - `level` (integer, default 1) - user level
      - `total_taps` (integer, default 0) - tap counter
      - `tap_power` (integer, default 1) - mining power
      - `multiplier` (numeric, default 1.0) - earnings multiplier
      - `referrals` (integer, default 0) - referral count
      - `referral_earnings` (numeric, default 0) - earnings from referrals
      - `auto_tap_expires` (timestamptz, nullable) - auto-tap expiration
      - `referred_by` (text, nullable) - referrer info
      - `referral_code_used` (text, nullable) - used referral code
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `users` table
    - Add policies for public access (needed for auth and leaderboard)
    - Add indexes for performance

  3. Triggers
    - Auto-update `updated_at` column on changes
</*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Create the trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table with complete schema
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  ore_balance numeric DEFAULT 100,
  level integer DEFAULT 1,
  total_taps integer DEFAULT 0,
  tap_power integer DEFAULT 1,
  multiplier numeric DEFAULT 1.0,
  referrals integer DEFAULT 0,
  referral_earnings numeric DEFAULT 0,
  auto_tap_expires timestamptz DEFAULT NULL,
  referred_by text DEFAULT NULL,
  referral_code_used text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (needed for auth and leaderboard)
CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read all user data for leaderboard"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_ore_balance ON users (ore_balance DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON users (level DESC);
CREATE INDEX IF NOT EXISTS idx_users_referrals ON users (referrals DESC);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();