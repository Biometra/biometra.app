/*
  # Update Marketplace Schema - Buyer Pays Fee

  1. Schema Changes
    - Update marketplace transactions to reflect buyer pays fee
    - Add chat system for buyer-seller communication
    - Add transaction chat messages table

  2. New Tables
    - `marketplace_chats` - Chat conversations between buyers and sellers
    - `marketplace_chat_messages` - Individual chat messages

  3. Security
    - Enable RLS on new tables
    - Add policies for buyer-seller communication
    - Ensure only transaction participants can access chat
*/

-- Create marketplace chats table
CREATE TABLE IF NOT EXISTS marketplace_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create marketplace chat messages table
CREATE TABLE IF NOT EXISTS marketplace_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'payment_proof')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_chats_transaction_id_fkey'
  ) THEN
    ALTER TABLE marketplace_chats 
    ADD CONSTRAINT marketplace_chats_transaction_id_fkey 
    FOREIGN KEY (transaction_id) REFERENCES marketplace_transactions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_chats_buyer_id_fkey'
  ) THEN
    ALTER TABLE marketplace_chats 
    ADD CONSTRAINT marketplace_chats_buyer_id_fkey 
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_chats_seller_id_fkey'
  ) THEN
    ALTER TABLE marketplace_chats 
    ADD CONSTRAINT marketplace_chats_seller_id_fkey 
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_chat_messages_chat_id_fkey'
  ) THEN
    ALTER TABLE marketplace_chat_messages 
    ADD CONSTRAINT marketplace_chat_messages_chat_id_fkey 
    FOREIGN KEY (chat_id) REFERENCES marketplace_chats(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_chat_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE marketplace_chat_messages 
    ADD CONSTRAINT marketplace_chat_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_transaction ON marketplace_chats(transaction_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_buyer ON marketplace_chats(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_seller ON marketplace_chats(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_active ON marketplace_chats(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_messages_chat ON marketplace_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_messages_sender ON marketplace_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_messages_created ON marketplace_chat_messages(created_at);

-- Enable RLS
ALTER TABLE marketplace_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_chats
CREATE POLICY "Users can read their own chats"
  ON marketplace_chats
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can insert chats for their transactions"
  ON marketplace_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can update their own chats"
  ON marketplace_chats
  FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- RLS Policies for marketplace_chat_messages
CREATE POLICY "Users can read messages in their chats"
  ON marketplace_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_chats 
      WHERE id = chat_id 
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON marketplace_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_chats 
      WHERE id = chat_id 
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Update marketplace_transactions to reflect new fee structure
DO $$
BEGIN
  -- Update existing transactions to reflect buyer pays fee
  UPDATE marketplace_transactions 
  SET 
    platform_commission = 0.15,
    seller_received = total_rupiah_paid
  WHERE platform_commission != 0.15;
END $$;