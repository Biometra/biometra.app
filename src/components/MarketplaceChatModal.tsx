import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface MarketplaceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  otherUserId: string;
  otherUsername: string;
  transactionStatus: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'system' | 'payment_proof';
  is_read: boolean;
  created_at: string;
  sender_username?: string;
}

interface Chat {
  id: string;
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  is_active: boolean;
}

function MarketplaceChatModal({ 
  isOpen, 
  onClose, 
  transactionId, 
  otherUserId, 
  otherUsername,
  transactionStatus 
}: MarketplaceChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch or create chat
  const fetchOrCreateChat = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      // Try to find existing chat
      const { data: existingChat, error: fetchError } = await supabase
        .from('marketplace_chats')
        .select('*')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching chat:', fetchError);
        return;
      }

      if (existingChat) {
        setChat(existingChat);
      } else {
        // Create new chat
        // Get transaction details first to determine buyer/seller
        const { data: transactionData, error: txError } = await supabase
          .from('marketplace_transactions')
          .select('buyer_id, seller_id')
          .eq('id', transactionId)
          .single();

        if (txError || !transactionData) {
          console.error('Error fetching transaction:', txError);
          return;
        }

        const { data: newChat, error: createError } = await supabase
          .from('marketplace_chats')
          .insert({
            transaction_id: transactionId,
            buyer_id: transactionData.buyer_id,
            seller_id: transactionData.seller_id,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating chat:', createError);
          return;
        }

        setChat(newChat);
      }
    } catch (error) {
      console.error('Error with chat:', error);
    }
  };

  // Fetch chat messages
  const fetchMessages = async () => {
    if (!chat || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_chat_messages')
        .select(`
          *,
          sender:users!marketplace_chat_messages_sender_id_fkey(username)
        `)
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const processedMessages = (data || []).map(msg => ({
        ...msg,
        sender_username: msg.sender?.username || 'Unknown User'
      }));

      setMessages(processedMessages);
      
      // Mark messages as read
      await supabase
        .from('marketplace_chat_messages')
        .update({ is_read: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', user.id);

    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || !user || !isSupabaseConfigured()) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('marketplace_chat_messages')
        .insert({
          chat_id: chat.id,
          sender_id: user.id,
          message: newMessage.trim(),
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      fetchOrCreateChat();
    }
  }, [isOpen, user, transactionId]);

  // Fetch messages when chat is ready
  useEffect(() => {
    if (chat) {
      fetchMessages();
      setIsLoading(false);
    }
  }, [chat]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time message updates
  useEffect(() => {
    if (!chat || !isSupabaseConfigured()) return;

    const subscription = supabase
      .channel(`chat_${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_chat_messages',
          filter: `chat_id=eq.${chat.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chat]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isTransactionCompleted = transactionStatus === 'completed' || transactionStatus === 'cancelled';

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-md h-[600px] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Chat with {otherUsername}</h3>
                  <p className="text-blue-300 text-sm">
                    {isTransactionCompleted ? '🔒 Transaction Completed' : '💬 Active Chat'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" />
                  <div className="text-white">Loading chat...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <div className="text-gray-400">No messages yet</div>
                  <div className="text-sm text-gray-500">Start the conversation!</div>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === user.id;
                    const isSystemMessage = message.message_type === 'system';
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        {isSystemMessage ? (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 max-w-xs">
                            <div className="text-yellow-400 text-sm text-center">
                              {message.message}
                            </div>
                            <div className="text-yellow-300 text-xs text-center mt-1">
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        ) : (
                          <div className={`max-w-xs ${isOwnMessage ? 'ml-12' : 'mr-12'}`}>
                            <div
                              className={`p-3 rounded-lg ${
                                isOwnMessage
                                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                                  : 'bg-black/30 border border-gray-500/30 text-white'
                              }`}
                            >
                              <div className="text-sm">{message.message}</div>
                            </div>
                            <div className={`text-xs text-gray-400 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {!isTransactionCompleted && chat?.is_active && (
              <div className="p-4 border-t border-purple-500/20">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isSending && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none text-sm"
                    disabled={isSending}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className={`p-2 rounded-lg transition-all ${
                      !newMessage.trim() || isSending
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}

            {/* Transaction completed notice */}
            {isTransactionCompleted && (
              <div className="p-4 border-t border-purple-500/20">
                <div className={`text-center p-3 rounded-lg ${
                  transactionStatus === 'completed' 
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {transactionStatus === 'completed' ? (
                    <>
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Transaction completed - Chat closed
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 inline mr-2" />
                      Transaction cancelled - Chat closed
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MarketplaceChatModal;