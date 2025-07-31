/*
  # Enhanced Referral System

  1. New Tables
    - `referral_commissions` - Track commissions from referral purchases
    - Enhanced `users` table with referral tracking
  
  2. New Columns
    - `referred_users` - Array of user IDs that were referred
    - `total_commission_earned` - Total commission from referrals
    - `referral_stats` - JSONB with detailed referral statistics
  
  3. Security
    - Enable RLS on new tables
    - Add policies for referral data access
*/

-- Add new columns to users table for enhanced referral tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_users text[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_commission_earned numeric DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_stats jsonb DEFAULT '{"total_referred": 0, "active_referrals": 0, "total_commission": 0, "referral_purchases": 0}'::jsonb;

-- Create referral commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  purchase_type text NOT NULL, -- 'upgrade', 'auto_tap', etc.
  purchase_amount numeric NOT NULL,
  commission_rate numeric DEFAULT 0.05, -- 5%
  commission_amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_commissions
CREATE POLICY "Users can read their own commission data"
  ON referral_commissions
  FOR SELECT
  TO public
  USING (referrer_id = auth.uid()::uuid OR referred_user_id = auth.uid()::uuid);

CREATE POLICY "System can insert commission records"
  ON referral_commissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_users_referred_users ON users USING GIN(referred_users);

-- Function to update referrer stats when commission is earned
CREATE OR REPLACE FUNCTION update_referrer_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Update referrer's total commission and stats
  UPDATE users 
  SET 
    total_commission_earned = total_commission_earned + NEW.commission_amount,
    referral_stats = jsonb_set(
      jsonb_set(
        referral_stats,
        '{total_commission}',
        to_jsonb((COALESCE((referral_stats->>'total_commission')::numeric, 0) + NEW.commission_amount))
      ),
      '{referral_purchases}',
      to_jsonb((COALESCE((referral_stats->>'referral_purchases')::integer, 0) + 1))
    ),
    updated_at = now()
  WHERE id = NEW.referrer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update referrer stats on commission
CREATE TRIGGER trigger_update_referrer_commission
  AFTER INSERT ON referral_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_commission();

-- Function to handle referral signup
CREATE OR REPLACE FUNCTION handle_referral_signup(
  new_user_id uuid,
  referral_code text
)
RETURNS boolean AS $$
DECLARE
  referrer_id uuid;
  referrer_record record;
BEGIN
  -- Find referrer by matching referral code pattern
  FOR referrer_record IN 
    SELECT id FROM users 
  LOOP
    -- Generate referral code for this user and check if it matches
    IF (UPPER(SUBSTRING(referrer_record.id::text, 1, 4) || SUBSTRING(referrer_record.id::text, -4))) = UPPER(referral_code) THEN
      referrer_id := referrer_record.id;
      EXIT;
    END IF;
  END LOOP;
  
  -- If referrer found, update both users
  IF referrer_id IS NOT NULL THEN
    -- Update new user with referrer info
    UPDATE users 
    SET 
      referred_by = referrer_id::text,
      referral_code_used = referral_code,
      ore_balance = ore_balance + 50, -- Bonus for using referral code
      updated_at = now()
    WHERE id = new_user_id;
    
    -- Update referrer stats
    UPDATE users 
    SET 
      referred_users = array_append(referred_users, new_user_id::text),
      referrals = referrals + 1,
      referral_earnings = referral_earnings + 25, -- Referrer bonus
      ore_balance = ore_balance + 25,
      referral_stats = jsonb_set(
        jsonb_set(
          referral_stats,
          '{total_referred}',
          to_jsonb((COALESCE((referral_stats->>'total_referred')::integer, 0) + 1))
        ),
        '{active_referrals}',
        to_jsonb((COALESCE((referral_stats->>'active_referrals')::integer, 0) + 1))
      ),
      updated_at = now()
    WHERE id = referrer_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;