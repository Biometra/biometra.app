/*
  # Add leaderboard rewards system

  1. New Tables
    - `leaderboard_rewards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `rank_position` (integer)
      - `reward_type` (text: 'daily', 'weekly', 'monthly')
      - `badge_earned` (text)
      - `ore_reward` (numeric)
      - `claimed_at` (timestamp)
      - `period_start` (timestamp)
      - `period_end` (timestamp)

  2. New Columns
    - Add `lifetime_ore_earned` to users table for persistent ranking
    - Add `badges` jsonb array to users table
    - Add `last_reward_claim` timestamp to users table

  3. Security
    - Enable RLS on `leaderboard_rewards` table
    - Add policies for users to read their own rewards
    - Add policies for reward claiming
*/

-- Add new columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'lifetime_ore_earned'
  ) THEN
    ALTER TABLE users ADD COLUMN lifetime_ore_earned numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'badges'
  ) THEN
    ALTER TABLE users ADD COLUMN badges jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_reward_claim'
  ) THEN
    ALTER TABLE users ADD COLUMN last_reward_claim timestamptz DEFAULT null;
  END IF;
END $$;

-- Create leaderboard_rewards table
CREATE TABLE IF NOT EXISTS leaderboard_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rank_position integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'daily',
  badge_earned text NOT NULL,
  ore_reward numeric NOT NULL DEFAULT 0,
  claimed_at timestamptz DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leaderboard_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaderboard_rewards
CREATE POLICY "Users can read their own rewards"
  ON leaderboard_rewards
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert reward claims"
  ON leaderboard_rewards
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_lifetime_ore ON users(lifetime_ore_earned DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_user ON leaderboard_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_period ON leaderboard_rewards(period_start, period_end);

-- Function to update lifetime ORE when user earns ORE
CREATE OR REPLACE FUNCTION update_lifetime_ore()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lifetime_ore_earned when ore_balance increases
  IF NEW.ore_balance > OLD.ore_balance THEN
    NEW.lifetime_ore_earned = COALESCE(OLD.lifetime_ore_earned, 0) + (NEW.ore_balance - OLD.ore_balance);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update lifetime ORE
DROP TRIGGER IF EXISTS trigger_update_lifetime_ore ON users;
CREATE TRIGGER trigger_update_lifetime_ore
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_lifetime_ore();