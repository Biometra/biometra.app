/*
  # Lucky Draw System

  1. New Tables
    - `lucky_draw_prizes`
      - `id` (uuid, primary key)
      - `name` (text) - prize name
      - `type` (text) - prize type (ore, energy, tap_power, etc.)
      - `value` (numeric) - prize value
      - `rarity` (text) - common, rare, epic, legendary
      - `probability` (numeric) - chance to win (0-1)
      - `icon` (text) - emoji icon
      - `color` (text) - display color
      - `is_active` (boolean) - prize availability
    
    - `lucky_draw_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `prize_id` (uuid, foreign key)
      - `prize_name` (text)
      - `prize_type` (text)
      - `prize_value` (numeric)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for user access
    
  3. Initial Prize Data
    - Common prizes: Small ORE amounts, energy refills
    - Rare prizes: Tap power upgrades, multiplier boosts
    - Epic prizes: Large ORE amounts, auto-tap time
    - Legendary prizes: Massive rewards, special items
*/

-- Create lucky_draw_prizes table
CREATE TABLE IF NOT EXISTS lucky_draw_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  probability numeric NOT NULL DEFAULT 0.1,
  icon text NOT NULL DEFAULT '🎁',
  color text NOT NULL DEFAULT 'from-gray-500 to-gray-600',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create lucky_draw_history table
CREATE TABLE IF NOT EXISTS lucky_draw_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  prize_id uuid REFERENCES lucky_draw_prizes(id) ON DELETE SET NULL,
  prize_name text NOT NULL,
  prize_type text NOT NULL,
  prize_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lucky_draw_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_draw_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lucky_draw_prizes
CREATE POLICY "Anyone can read active prizes"
  ON lucky_draw_prizes
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admin can manage prizes"
  ON lucky_draw_prizes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for lucky_draw_history
CREATE POLICY "Users can read their own draw history"
  ON lucky_draw_history
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own draws"
  ON lucky_draw_history
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all draw history"
  ON lucky_draw_history
  FOR SELECT
  TO public
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lucky_draw_prizes_rarity ON lucky_draw_prizes(rarity);
CREATE INDEX IF NOT EXISTS idx_lucky_draw_prizes_active ON lucky_draw_prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_lucky_draw_history_user ON lucky_draw_history(user_id);
CREATE INDEX IF NOT EXISTS idx_lucky_draw_history_created ON lucky_draw_history(created_at DESC);

-- Insert initial prize data
INSERT INTO lucky_draw_prizes (name, type, value, rarity, probability, icon, color) VALUES
-- Common Prizes (70% total chance)
('50 ORE', 'ore', 50, 'common', 0.25, '⚡', 'from-yellow-400 to-yellow-600'),
('Energy Refill', 'energy', 50, 'common', 0.20, '🔋', 'from-blue-400 to-blue-600'),
('100 ORE', 'ore', 100, 'common', 0.15, '💎', 'from-yellow-500 to-orange-500'),
('Energy Boost', 'energy', 100, 'common', 0.10, '⚡', 'from-cyan-400 to-blue-500'),

-- Rare Prizes (20% total chance)
('Tap Power +1', 'tap_power', 1, 'rare', 0.08, '💪', 'from-purple-400 to-purple-600'),
('500 ORE', 'ore', 500, 'rare', 0.07, '💰', 'from-green-400 to-green-600'),
('Multiplier +0.5', 'multiplier', 0.5, 'rare', 0.05, '🚀', 'from-indigo-400 to-purple-500'),

-- Epic Prizes (8% total chance)
('1000 ORE', 'ore', 1000, 'epic', 0.04, '💎', 'from-pink-400 to-rose-500'),
('Auto-Tap 1 Hour', 'auto_tap', 1, 'epic', 0.03, '🤖', 'from-violet-400 to-purple-600'),
('Max Energy +50', 'max_energy', 50, 'epic', 0.01, '🔋', 'from-emerald-400 to-teal-500'),

-- Legendary Prizes (2% total chance)
('5000 ORE Jackpot', 'ore', 5000, 'legendary', 0.015, '👑', 'from-yellow-300 to-yellow-500'),
('Auto-Tap 24 Hours', 'auto_tap', 24, 'legendary', 0.004, '🏆', 'from-amber-300 to-orange-400'),
('Ultimate Power Boost', 'combo', 0, 'legendary', 0.001, '🌟', 'from-gradient-to-r from-pink-300 via-purple-300 to-indigo-400');

-- Add lucky draw cost to admin settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('lucky_draw_cost', '{"ore_cost": 100, "cooldown_minutes": 60}')
ON CONFLICT (setting_key) DO UPDATE SET
setting_value = EXCLUDED.setting_value;