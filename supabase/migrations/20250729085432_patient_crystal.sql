/*
  # Create Referral System Database Schema

  1. New Tables
    - `referral_links`
      - `id` (uuid, primary key)
      - `referrer_id` (uuid, foreign key to users)
      - `referral_code` (text, unique)
      - `total_referrals` (integer)
      - `total_earnings` (numeric)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `referral_signups`
      - `id` (uuid, primary key)
      - `referrer_id` (uuid, foreign key to users)
      - `referred_user_id` (uuid, foreign key to users)
      - `referral_code` (text)
      - `signup_bonus` (numeric)
      - `referrer_bonus` (numeric)
      - `status` (text)
      - `created_at` (timestamp)
    
    - `referral_transactions`
      - `id` (uuid, primary key)
      - `referrer_id` (uuid, foreign key to users)
      - `referred_user_id` (uuid, foreign key to users)
      - `transaction_type` (text)
      - `transaction_amount` (numeric)
      - `commission_rate` (numeric)
      - `commission_amount` (numeric)
      - `status` (text)
      - `created_at` (timestamp)
    
    - `referral_leaderboard`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `total_referrals` (integer)
      - `total_commission` (numeric)
      - `rank_position` (integer)
      - `last_updated` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to read their own data
    - Add policies for public leaderboard access

  3. Functions
    - Function to update referral stats
    - Function to calculate commissions
    - Function to update leaderboard rankings
*/

-- Create referral_links table
CREATE TABLE IF NOT EXISTS referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referral_code text UNIQUE NOT NULL,
  total_referrals integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create referral_signups table
CREATE TABLE IF NOT EXISTS referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  signup_bonus numeric DEFAULT 50,
  referrer_bonus numeric DEFAULT 25,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Create referral_transactions table
CREATE TABLE IF NOT EXISTS referral_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  transaction_amount numeric NOT NULL,
  commission_rate numeric DEFAULT 0.05,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Create referral_leaderboard table
CREATE TABLE IF NOT EXISTS referral_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_referrals integer DEFAULT 0,
  total_commission numeric DEFAULT 0,
  rank_position integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer ON referral_links(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code ON referral_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_signups_referrer ON referral_signups(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_referred ON referral_signups(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer ON referral_transactions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referred ON referral_transactions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_leaderboard_rank ON referral_leaderboard(rank_position);
CREATE INDEX IF NOT EXISTS idx_referral_leaderboard_commission ON referral_leaderboard(total_commission DESC);

-- Enable RLS
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_links
CREATE POLICY "Users can read their own referral links"
  ON referral_links
  FOR SELECT
  TO public
  USING (referrer_id = auth.uid());

CREATE POLICY "Users can insert their own referral links"
  ON referral_links
  FOR INSERT
  TO public
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Users can update their own referral links"
  ON referral_links
  FOR UPDATE
  TO public
  USING (referrer_id = auth.uid());

-- RLS Policies for referral_signups
CREATE POLICY "Users can read their referral signups"
  ON referral_signups
  FOR SELECT
  TO public
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "System can insert referral signups"
  ON referral_signups
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for referral_transactions
CREATE POLICY "Users can read their referral transactions"
  ON referral_transactions
  FOR SELECT
  TO public
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "System can insert referral transactions"
  ON referral_transactions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for referral_leaderboard
CREATE POLICY "Anyone can read referral leaderboard"
  ON referral_leaderboard
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage referral leaderboard"
  ON referral_leaderboard
  FOR ALL
  TO public
  USING (true);

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update referral_links stats
  UPDATE referral_links 
  SET 
    total_referrals = (
      SELECT COUNT(*) 
      FROM referral_signups 
      WHERE referrer_id = NEW.referrer_id
    ),
    total_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0) 
      FROM referral_transactions 
      WHERE referrer_id = NEW.referrer_id
    ),
    updated_at = now()
  WHERE referrer_id = NEW.referrer_id;
  
  -- Update referral_leaderboard
  INSERT INTO referral_leaderboard (user_id, total_referrals, total_commission, last_updated)
  VALUES (
    NEW.referrer_id,
    (SELECT COUNT(*) FROM referral_signups WHERE referrer_id = NEW.referrer_id),
    (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_transactions WHERE referrer_id = NEW.referrer_id),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = (SELECT COUNT(*) FROM referral_signups WHERE referrer_id = NEW.referrer_id),
    total_commission = (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_transactions WHERE referrer_id = NEW.referrer_id),
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and update leaderboard rankings
CREATE OR REPLACE FUNCTION update_referral_rankings()
RETURNS void AS $$
BEGIN
  -- Update rank positions based on total commission
  UPDATE referral_leaderboard 
  SET rank_position = ranked.new_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_commission DESC, total_referrals DESC) as new_rank
    FROM referral_leaderboard
  ) ranked
  WHERE referral_leaderboard.user_id = ranked.user_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_referral_stats_signup
  AFTER INSERT ON referral_signups
  FOR EACH ROW EXECUTE FUNCTION update_referral_stats();

CREATE TRIGGER trigger_update_referral_stats_transaction
  AFTER INSERT ON referral_transactions
  FOR EACH ROW EXECUTE FUNCTION update_referral_stats();

-- Function to process referral signup
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referral_code text,
  p_referred_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_referrer_id uuid;
  v_result json;
BEGIN
  -- Find referrer by code
  SELECT referrer_id INTO v_referrer_id
  FROM referral_links
  WHERE referral_code = UPPER(p_referral_code) AND is_active = true;
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;
  
  -- Insert referral signup record
  INSERT INTO referral_signups (referrer_id, referred_user_id, referral_code)
  VALUES (v_referrer_id, p_referred_user_id, UPPER(p_referral_code));
  
  -- Update referrer's balance
  UPDATE users 
  SET 
    ore_balance = ore_balance + 25,
    referrals = referrals + 1,
    referral_earnings = referral_earnings + 25,
    updated_at = now()
  WHERE id = v_referrer_id;
  
  -- Update referred user's balance
  UPDATE users 
  SET 
    ore_balance = ore_balance + 50,
    referred_by_user_id = v_referrer_id,
    referral_code_used = UPPER(p_referral_code),
    updated_at = now()
  WHERE id = p_referred_user_id;
  
  RETURN json_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$ LANGUAGE plpgsql;

-- Function to process referral commission
CREATE OR REPLACE FUNCTION process_referral_commission(
  p_referred_user_id uuid,
  p_transaction_type text,
  p_transaction_amount numeric
)
RETURNS json AS $$
DECLARE
  v_referrer_id uuid;
  v_commission_rate numeric := 0.05;
  v_commission_amount numeric;
BEGIN
  -- Find referrer
  SELECT referred_by_user_id INTO v_referrer_id
  FROM users
  WHERE id = p_referred_user_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No referrer found');
  END IF;
  
  -- Calculate commission
  v_commission_amount := p_transaction_amount * v_commission_rate;
  
  -- Insert transaction record
  INSERT INTO referral_transactions (
    referrer_id, 
    referred_user_id, 
    transaction_type, 
    transaction_amount, 
    commission_rate, 
    commission_amount
  )
  VALUES (
    v_referrer_id, 
    p_referred_user_id, 
    p_transaction_type, 
    p_transaction_amount, 
    v_commission_rate, 
    v_commission_amount
  );
  
  -- Update referrer's balance
  UPDATE users 
  SET 
    ore_balance = ore_balance + v_commission_amount,
    referral_earnings = referral_earnings + v_commission_amount,
    updated_at = now()
  WHERE id = v_referrer_id;
  
  RETURN json_build_object('success', true, 'commission_amount', v_commission_amount);
END;
$$ LANGUAGE plpgsql;