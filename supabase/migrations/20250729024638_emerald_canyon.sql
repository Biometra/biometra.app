/*
  # Update Lucky Draw Settings

  1. Admin Settings
    - Add lucky_draw_settings configuration
    - Set default draw cost to 100 ORE
    - Enable daily cooldown (24 hours)

  2. Prize Updates
    - Update prizes to focus on mining equipment upgrades
    - Remove ORE prizes, focus on tap_power, multiplier, max_energy
    - Adjust probabilities for better balance
*/

-- Insert/Update lucky draw settings
INSERT INTO admin_settings (setting_key, setting_value)
VALUES (
  'lucky_draw_settings',
  '{
    "draw_cost": 100,
    "cooldown_hours": 24,
    "enabled": true
  }'::jsonb
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Clear existing prizes and add new equipment-focused prizes
DELETE FROM lucky_draw_prizes;

-- Insert new equipment upgrade prizes
INSERT INTO lucky_draw_prizes (name, type, value, rarity, probability, icon, color, is_active) VALUES
  ('+1 Tap Power', 'tap_power', 1, 'common', 0.30, '💪', 'from-blue-400 to-blue-600', true),
  ('+50 Max Energy', 'max_energy', 50, 'common', 0.25, '🔋', 'from-green-400 to-green-600', true),
  ('+0.5x Multiplier', 'multiplier', 0.5, 'rare', 0.20, '⚡', 'from-purple-400 to-purple-600', true),
  ('+2 Tap Power', 'tap_power', 2, 'rare', 0.15, '💎', 'from-pink-400 to-rose-500', true),
  ('+1.0x Multiplier', 'multiplier', 1.0, 'epic', 0.08, '🌟', 'from-yellow-400 to-orange-500', true),
  ('+3 Tap Power', 'tap_power', 3, 'legendary', 0.02, '👑', 'from-yellow-300 to-yellow-500', true);