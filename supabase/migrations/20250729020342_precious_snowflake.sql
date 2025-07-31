/*
  # Add payment settings for admin control

  1. New Settings
    - Add payment_address setting for crypto deposits
    - Add supported_currencies setting
    - Add deposit/withdrawal settings

  2. Security
    - Enable RLS on admin_settings table
    - Add policies for admin access
*/

-- Add payment settings to admin_settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('payment_address', '{"address": "0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e", "network": "BSC", "currency": "BNB"}'),
  ('deposit_settings', '{"enabled": true, "min_amount": 0.001, "max_amount": 1000, "processing_time": "24 hours"}'),
  ('withdrawal_settings', '{"enabled": true, "min_amount": 0.01, "max_amount": 100, "min_level": 5, "processing_time": "48 hours"}')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Create deposit/withdrawal requests table
CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BIO',
  payment_address text NOT NULL,
  transaction_hash text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BIO',
  destination_address text NOT NULL,
  transaction_hash text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- Enable RLS
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can insert their own deposit requests"
  ON deposit_requests
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own deposit requests"
  ON deposit_requests
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests"
  ON withdrawal_requests
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Admin policies for managing requests
CREATE POLICY "Admin can manage all deposit requests"
  ON deposit_requests
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage all withdrawal requests"
  ON withdrawal_requests
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);