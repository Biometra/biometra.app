/*
  # Daily Login Rewards System

  1. New Tables
    - `daily_login_rewards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `day_number` (integer, consecutive day)
      - `ore_reward` (integer, ORE amount received)
      - `claimed_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `daily_login_rewards` table
    - Add policy for users to manage their own daily rewards

  3. Functions
    - Function to calculate consecutive days
    - Function to check and award daily rewards
*/

-- Create daily_login_rewards table if not exists
CREATE TABLE IF NOT EXISTS daily_login_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  ore_reward integer NOT NULL,
  claimed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user ON daily_login_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_claimed ON daily_login_rewards(claimed_at);

-- Enable RLS
ALTER TABLE daily_login_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own daily rewards"
  ON daily_login_rewards
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add daily login tracking columns to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'consecutive_days'
  ) THEN
    ALTER TABLE users ADD COLUMN consecutive_days integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_daily_reward'
  ) THEN
    ALTER TABLE users ADD COLUMN last_daily_reward timestamptz;
  END IF;
END $$;

-- Function to check and award daily login reward
CREATE OR REPLACE FUNCTION check_daily_login_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record users%ROWTYPE;
  v_current_day integer;
  v_ore_reward integer;
  v_last_reward_date date;
  v_today date;
  v_can_claim boolean := false;
  v_is_new_day boolean := false;
BEGIN
  -- Get user data
  SELECT * INTO v_user_record
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Get current date
  v_today := CURRENT_DATE;
  v_last_reward_date := DATE(v_user_record.last_daily_reward);
  
  -- Check if user can claim today's reward
  IF v_user_record.last_daily_reward IS NULL THEN
    -- First time login
    v_current_day := 1;
    v_can_claim := true;
    v_is_new_day := true;
  ELSIF v_last_reward_date = v_today THEN
    -- Already claimed today
    v_current_day := v_user_record.consecutive_days;
    v_can_claim := false;
  ELSIF v_last_reward_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_day := v_user_record.consecutive_days + 1;
    v_can_claim := true;
    v_is_new_day := true;
  ELSE
    -- Streak broken, reset to day 1
    v_current_day := 1;
    v_can_claim := true;
    v_is_new_day := true;
  END IF;
  
  -- Calculate ORE reward (Day 1: 100, Day 2: 200, etc.)
  v_ore_reward := v_current_day * 100;
  
  -- Return status without claiming
  RETURN jsonb_build_object(
    'success', true,
    'can_claim', v_can_claim,
    'is_new_day', v_is_new_day,
    'current_day', v_current_day,
    'ore_reward', v_ore_reward,
    'consecutive_days', v_user_record.consecutive_days,
    'last_reward_date', v_last_reward_date
  );
END;
$$;

-- Function to claim daily login reward
CREATE OR REPLACE FUNCTION claim_daily_login_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record users%ROWTYPE;
  v_current_day integer;
  v_ore_reward integer;
  v_last_reward_date date;
  v_today date;
  v_new_ore_balance numeric;
BEGIN
  -- Get user data
  SELECT * INTO v_user_record
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Get current date
  v_today := CURRENT_DATE;
  v_last_reward_date := DATE(v_user_record.last_daily_reward);
  
  -- Check if user can claim today's reward
  IF v_last_reward_date = v_today THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today');
  END IF;
  
  -- Calculate consecutive days
  IF v_user_record.last_daily_reward IS NULL THEN
    -- First time login
    v_current_day := 1;
  ELSIF v_last_reward_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_day := v_user_record.consecutive_days + 1;
  ELSE
    -- Streak broken, reset to day 1
    v_current_day := 1;
  END IF;
  
  -- Calculate ORE reward
  v_ore_reward := v_current_day * 100;
  v_new_ore_balance := v_user_record.ore_balance + v_ore_reward;
  
  -- Update user record
  UPDATE users
  SET 
    consecutive_days = v_current_day,
    last_daily_reward = now(),
    ore_balance = v_new_ore_balance,
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Record the reward
  INSERT INTO daily_login_rewards (user_id, day_number, ore_reward)
  VALUES (p_user_id, v_current_day, v_ore_reward);
  
  RETURN jsonb_build_object(
    'success', true,
    'day_number', v_current_day,
    'ore_reward', v_ore_reward,
    'new_ore_balance', v_new_ore_balance,
    'message', 'Daily reward claimed successfully'
  );
END;
$$;