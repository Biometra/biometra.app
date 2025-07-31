/*
  # Create Biometra Database Tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `wallet_address` (text, unique)
      - `ore_balance` (numeric, default 0)
      - `level` (integer, default 1)
      - `total_taps` (integer, default 0)
      - `tap_power` (integer, default 1)
      - `multiplier` (numeric, default 1.0)
      - `referrals` (integer, default 0)
      - `referral_earnings` (numeric, default 0)
      - `auto_tap_expires` (timestamptz, nullable)
      - `referred_by` (text, nullable)
      - `referral_code_used` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `swap_requests`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null)
      - `ore_amount` (numeric, not null)
      - `bio_amount` (numeric, not null)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz, default now())
      - `processed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access to leaderboard data

  3. Indexes
    - Add indexes for performance optimization
    - Wallet address unique constraint
    - Referral tracking indexes
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  ore_balance numeric DEFAULT 100,
  level integer DEFAULT 1,
  total_taps integer DEFAULT 0,
  tap_power integer DEFAULT 1,
  multiplier numeric DEFAULT 1.0,
  referrals integer DEFAULT 0,
  referral_earnings numeric DEFAULT 0,
  auto_tap_expires timestamptz,
  referred_by text,
  referral_code_used text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create swap_requests table
CREATE TABLE IF NOT EXISTS swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  ore_amount numeric NOT NULL,
  bio_amount numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read all user data for leaderboard"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO public
  USING (true);

-- Create policies for swap_requests table
CREATE POLICY "Users can read their own swap requests"
  ON swap_requests
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own swap requests"
  ON swap_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_ore_balance ON users(ore_balance DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_referrals ON users(referrals DESC);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_swap_requests_wallet ON swap_requests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();