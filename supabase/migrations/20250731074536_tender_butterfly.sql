/*
  # Fix Marketplace Chat RLS Schema

  1. Security Updates
    - Fix RLS policies for marketplace_chats table
    - Fix RLS policies for marketplace_chat_messages table
    - Allow proper access for authenticated users
    - Ensure chat participants can access their chats

  2. Policy Changes
    - Remove overly restrictive policies
    - Add proper participant-based access control
    - Enable chat creation for transaction participants
    - Allow message access for chat participants
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to create chats" ON marketplace_chats;
DROP POLICY IF EXISTS "Allow authenticated users to read chats" ON marketplace_chats;
DROP POLICY IF EXISTS "Allow authenticated users to update chats" ON marketplace_chats;
DROP POLICY IF EXISTS "Allow authenticated users to send messages" ON marketplace_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON marketplace_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to update messages" ON marketplace_chat_messages;

-- Create proper RLS policies for marketplace_chats
CREATE POLICY "Users can create chats for their transactions"
  ON marketplace_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

CREATE POLICY "Users can read their own chats"
  ON marketplace_chats
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

CREATE POLICY "Users can update their own chats"
  ON marketplace_chats
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  )
  WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

-- Create proper RLS policies for marketplace_chat_messages
CREATE POLICY "Users can send messages in their chats"
  ON marketplace_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_chats
      WHERE id = chat_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

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

CREATE POLICY "Users can update messages in their chats"
  ON marketplace_chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_chats
      WHERE id = chat_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_chats
      WHERE id = chat_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Ensure RLS is enabled
ALTER TABLE marketplace_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_chat_messages ENABLE ROW LEVEL SECURITY;