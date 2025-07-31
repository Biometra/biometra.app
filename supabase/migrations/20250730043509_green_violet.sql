/*
  # Add Support Settings for Admin Control

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `category` (text)
      - `subject` (text)
      - `message` (text)
      - `priority` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Admin Settings
    - Add support_settings to admin_settings table
    - Include telegram, whatsapp, email, hours

  3. Security
    - Enable RLS on support_tickets table
    - Add policies for user access and admin management
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- Insert default support settings
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES (
  'support_settings',
  '{
    "telegram_username": "BiometraSupport",
    "whatsapp_number": "6281234567890",
    "email_address": "support@biometra.app",
    "support_hours": "Monday - Friday: 9:00 AM - 6:00 PM (UTC+7), Saturday: 10:00 AM - 4:00 PM (UTC+7), Sunday: Emergency support only"
  }'::jsonb
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();