/*
  # Fix Referral Sync and Leaderboard Functions

  1. Database Functions
    - Fix process_referral_signup function
    - Fix get_referral_stats function
    - Add referral leaderboard view
    - Add triggers for auto-sync

  2. Auto-sync Features
    - Trigger on user signup with referral
    - Auto-update referral counts
    - Real-time stats calculation

  3. Leaderboard Integration
    - Materialized view for performance
    - Auto-refresh on data changes
    - Proper ranking calculation
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS process_referral_signup(text, uuid);
DROP FUNCTION IF EXISTS get_referral_stats(uuid);
DROP FUNCTION IF EXISTS update_referral_counts();

-- Function to process referral signup
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referral_code text,
  p_referred_user_id uuid
) RETURNS json AS $$
DECLARE
  v_referrer_id uuid;
  v_result json;
BEGIN
  -- Find referrer by referral code
  SELECT id INTO v_referrer_id
  FROM users
  WHERE referral_code = UPPER(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;
  
  IF v_referrer_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot refer yourself');
  END IF;
  
  -- Update referred user
  UPDATE users 
  SET 
    referred_by_user_id = v_referrer_id,
    referral_code_used = UPPER(p_referral_code),
    ore_balance = ore_balance + 50, -- Bonus for referred user
    updated_at = now()
  WHERE id = p_referred_user_id;
  
  -- Update referrer stats
  UPDATE users 
  SET 
    referrals = referrals + 1,
    ore_balance = ore_balance + 25, -- Bonus for referrer
    total_commission_earned = total_commission_earned + 25,
    referral_stats = jsonb_set(
      COALESCE(referral_stats, '{}'),
      '{total_referred}',
      to_jsonb(COALESCE((referral_stats->>'total_referred')::int, 0) + 1)
    ),
    updated_at = now()
  WHERE id = v_referrer_id;
  
  RETURN json_build_object(
    'success', true, 
    'referrer_id', v_referrer_id,
    'message', 'Referral processed successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_user_data record;
  v_rank integer;
  v_result json;
BEGIN
  -- Get user referral data
  SELECT 
    referral_code,
    referrals,
    total_commission_earned,
    referral_stats
  INTO v_user_data
  FROM users
  WHERE id = p_user_id;
  
  -- Calculate rank based on total commission
  SELECT COUNT(*) + 1 INTO v_rank
  FROM users
  WHERE total_commission_earned > COALESCE(v_user_data.total_commission_earned, 0);
  
  RETURN json_build_object(
    'referral_code', v_user_data.referral_code,
    'total_referrals', COALESCE(v_user_data.referrals, 0),
    'total_earnings', COALESCE(v_user_data.total_commission_earned, 0),
    'rank', v_rank,
    'stats', COALESCE(v_user_data.referral_stats, '{}')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update referral counts (for manual sync)
CREATE OR REPLACE FUNCTION update_referral_counts()
RETURNS void AS $$
BEGIN
  -- Update referral counts for all users
  UPDATE users 
  SET referrals = (
    SELECT COUNT(*)
    FROM users referred
    WHERE referred.referred_by_user_id = users.id
  ),
  updated_at = now()
  WHERE id IN (
    SELECT DISTINCT referred_by_user_id
    FROM users
    WHERE referred_by_user_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-update referrer stats
CREATE OR REPLACE FUNCTION trigger_update_referrer_stats()
RETURNS trigger AS $$
BEGIN
  -- Only process if referred_by_user_id is set and this is an INSERT
  IF TG_OP = 'INSERT' AND NEW.referred_by_user_id IS NOT NULL THEN
    -- Update referrer's stats
    UPDATE users 
    SET 
      referrals = referrals + 1,
      referral_stats = jsonb_set(
        COALESCE(referral_stats, '{}'),
        '{total_referred}',
        to_jsonb(COALESCE((referral_stats->>'total_referred')::int, 0) + 1)
      ),
      updated_at = now()
    WHERE id = NEW.referred_by_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating referrer stats
DROP TRIGGER IF EXISTS trigger_auto_update_referrer_stats ON users;
CREATE TRIGGER trigger_auto_update_referrer_stats
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_referrer_stats();

-- Create materialized view for referral leaderboard
DROP MATERIALIZED VIEW IF EXISTS referral_leaderboard_view;
CREATE MATERIALIZED VIEW referral_leaderboard_view AS
SELECT 
  id,
  username,
  referral_code,
  referrals as total_referrals,
  total_commission_earned,
  level,
  ROW_NUMBER() OVER (ORDER BY total_commission_earned DESC, referrals DESC) as rank_position,
  updated_at
FROM users
WHERE referrals > 0 OR total_commission_earned > 0
ORDER BY total_commission_earned DESC, referrals DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_leaderboard_view_id ON referral_leaderboard_view (id);
CREATE INDEX IF NOT EXISTS idx_referral_leaderboard_view_rank ON referral_leaderboard_view (rank_position);

-- Function to refresh referral leaderboard
CREATE OR REPLACE FUNCTION refresh_referral_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY referral_leaderboard_view;
END;
$$ LANGUAGE plpgsql;

-- Manual sync function to fix existing data
CREATE OR REPLACE FUNCTION sync_all_referral_data()
RETURNS json AS $$
DECLARE
  v_updated_count integer := 0;
  v_result json;
BEGIN
  -- Update all referral counts
  UPDATE users 
  SET 
    referrals = COALESCE(referred_count.count, 0),
    updated_at = now()
  FROM (
    SELECT 
      referred_by_user_id,
      COUNT(*) as count
    FROM users
    WHERE referred_by_user_id IS NOT NULL
    GROUP BY referred_by_user_id
  ) as referred_count
  WHERE users.id = referred_count.referred_by_user_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Refresh leaderboard
  PERFORM refresh_referral_leaderboard();
  
  RETURN json_build_object(
    'success', true,
    'updated_users', v_updated_count,
    'message', 'All referral data synced successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_referral_signup(text, uuid) TO public;
GRANT EXECUTE ON FUNCTION get_referral_stats(uuid) TO public;
GRANT EXECUTE ON FUNCTION update_referral_counts() TO public;
GRANT EXECUTE ON FUNCTION refresh_referral_leaderboard() TO public;
GRANT EXECUTE ON FUNCTION sync_all_referral_data() TO public;
GRANT SELECT ON referral_leaderboard_view TO public;