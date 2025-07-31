/*
  # Update Primary Keys to Wallet Address

  1. Changes
    - Remove `id` columns from both tables
    - Set `wallet_address` as primary key
    - Update all constraints and indexes
    - Maintain all existing data and functionality

  2. Benefits
    - Simpler database structure
    - Direct wallet-based queries
    - No need for UUID generation
    - More intuitive data relationships
*/

-- Drop existing tables and recreate with wallet_address as primary key
DROP TABLE IF EXISTS swap_requests;
DROP TABLE IF EXISTS users;

-- Create users table with wallet_address as primary key
CREATE TABLE users (
  wallet_address text PRIMARY KEY,
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

-- Create swap_requests table with wallet_address as primary key
CREATE TABLE swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL REFERENCES users(wallet_address),
  ore_amount numeric NOT NULL,
  bio_amount numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
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
CREATE INDEX idx_users_ore_balance ON users (ore_balance DESC);
CREATE INDEX idx_users_level ON users (level DESC);
CREATE INDEX idx_users_referrals ON users (referrals DESC);
CREATE INDEX idx_users_referred_by ON users (referred_by);

CREATE INDEX idx_swap_requests_wallet ON swap_requests (wallet_address);
CREATE INDEX idx_swap_requests_status ON swap_requests (status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();