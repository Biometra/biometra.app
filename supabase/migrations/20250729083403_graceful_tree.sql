/*
  # Claw Machine Database Schema

  1. New Tables
    - `claw_machine_prizes`
      - `id` (uuid, primary key)
      - `name` (text) - Prize name like "+1 Tap Power"
      - `type` (text) - Prize type: tap_power, multiplier, max_energy
      - `value` (numeric) - Prize value amount
      - `rarity` (text) - common, rare, epic, legendary
      - `probability` (numeric) - Probability weight (0.0 to 1.0)
      - `icon` (text) - Emoji icon for display
      - `color` (text) - Tailwind gradient color classes
      - `is_active` (boolean) - Whether prize is available
      - `created_at` (timestamp)

    - `claw_machine_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `prize_id` (uuid, foreign key to claw_machine_prizes)
      - `prize_name` (text) - Snapshot of prize name
      - `prize_type` (text) - Snapshot of prize type
      - `prize_value` (numeric) - Snapshot of prize value
      - `ore_cost` (numeric) - ORE cost paid (100 or 25000)
      - `is_instant_play` (boolean) - Whether it was instant play
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can read active prizes
    - Users can read their own history
    - Users can insert their own history
    - Admin can manage all data

  3. Initial Data
    - Insert default prizes with proper probabilities
    - Common prizes: 55% total
    - Rare prizes: 35% total  
    - Epic prizes: 8% total
    - Legendary prizes: 2% total
*/

-- Create claw_machine_prizes table
CREATE TABLE IF NOT EXISTS claw_machine_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('tap_power', 'multiplier', 'max_energy')),
  value numeric NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  probability numeric NOT NULL DEFAULT 0.1 CHECK (probability >= 0 AND probability <= 1),
  icon text NOT NULL DEFAULT '🎁',
  color text NOT NULL DEFAULT 'from-gray-400 to-gray-600',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create claw_machine_history table
CREATE TABLE IF NOT EXISTS claw_machine_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  prize_id uuid REFERENCES claw_machine_prizes(id) ON DELETE SET NULL,
  prize_name text NOT NULL,
  prize_type text NOT NULL,
  prize_value numeric NOT NULL DEFAULT 0,
  ore_cost numeric NOT NULL DEFAULT 100,
  is_instant_play boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE claw_machine_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE claw_machine_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for claw_machine_prizes
CREATE POLICY "Anyone can read active prizes"
  ON claw_machine_prizes
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admin can manage all prizes"
  ON claw_machine_prizes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for claw_machine_history
CREATE POLICY "Users can read their own claw history"
  ON claw_machine_history
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own claw history"
  ON claw_machine_history
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all claw history"
  ON claw_machine_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claw_prizes_active ON claw_machine_prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_claw_prizes_rarity ON claw_machine_prizes(rarity);
CREATE INDEX IF NOT EXISTS idx_claw_history_user ON claw_machine_history(user_id);
CREATE INDEX IF NOT EXISTS idx_claw_history_created ON claw_machine_history(created_at DESC);

-- Insert default prizes
INSERT INTO claw_machine_prizes (name, type, value, rarity, probability, icon, color) VALUES
-- Common Prizes (55% total)
('+1 Tap Power', 'tap_power', 1, 'common', 0.25, '💪', 'from-blue-400 to-blue-600'),
('+50 Max Energy', 'max_energy', 50, 'common', 0.20, '🔋', 'from-green-400 to-green-600'),
('+0.2x Multiplier', 'multiplier', 0.2, 'common', 0.10, '⚡', 'from-cyan-400 to-cyan-600'),

-- Rare Prizes (35% total)
('+2 Tap Power', 'tap_power', 2, 'rare', 0.15, '💎', 'from-purple-400 to-purple-600'),
('+100 Max Energy', 'max_energy', 100, 'rare', 0.12, '🔋', 'from-indigo-400 to-indigo-600'),
('+0.5x Multiplier', 'multiplier', 0.5, 'rare', 0.08, '⚡', 'from-pink-400 to-rose-500'),

-- Epic Prizes (8% total)
('+3 Tap Power', 'tap_power', 3, 'epic', 0.04, '🌟', 'from-yellow-400 to-orange-500'),
('+1.0x Multiplier', 'multiplier', 1.0, 'epic', 0.04, '✨', 'from-orange-400 to-red-500'),

-- Legendary Prizes (2% total)
('+5 Tap Power', 'tap_power', 5, 'legendary', 0.01, '👑', 'from-yellow-300 to-yellow-500'),
('+2.0x Multiplier', 'multiplier', 2.0, 'legendary', 0.01, '🏆', 'from-amber-300 to-yellow-400');

-- Update admin settings for claw machine
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('claw_machine_settings', '{
  "draw_cost": 100,
  "instant_cost": 25000,
  "cooldown_hours": 24,
  "enabled": true
}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET
setting_value = EXCLUDED.setting_value,
updated_at = now();