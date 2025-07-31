/*
  # Admin Leaderboard Control System

  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique)
      - `setting_value` (jsonb)
      - `updated_at` (timestamp)
    - `leaderboard_periods`
      - `id` (uuid, primary key)
      - `period_name` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `is_active` (boolean)
      - `rewards_distributed` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access and admin write access
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaderboard_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT false,
  rewards_distributed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_periods ENABLE ROW LEVEL SECURITY;

-- Policies for admin_settings
CREATE POLICY "Anyone can read admin settings"
  ON admin_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin can manage settings"
  ON admin_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Policies for leaderboard_periods
CREATE POLICY "Anyone can read leaderboard periods"
  ON leaderboard_periods
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin can manage leaderboard periods"
  ON leaderboard_periods
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('leaderboard_rewards_enabled', '{"enabled": false}'),
  ('current_leaderboard_period', '{"period_id": null, "countdown_end": null}')
ON CONFLICT (setting_key) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings (setting_key);
CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_active ON leaderboard_periods (is_active);
CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_time ON leaderboard_periods (start_time, end_time);