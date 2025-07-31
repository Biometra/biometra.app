import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Send, ExternalLink, Phone, Mail, Clock, HelpCircle, Bug, CreditCard, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupportTicket {
  category: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

interface SupportSettings {
  telegram_username: string;
  whatsapp_number: string;
  email_address: string;
  support_hours: string;
}

function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [activeTab, setActiveTab] = useState('contact');
  const [ticket, setTicket] = useState<SupportTicket>({
    category: 'general',
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportSettings, setSupportSettings] = useState<SupportSettings>({
    telegram_username: 'BiometraSupport',
    whatsapp_number: '6281234567890',
    email_address: 'support@biometra.app',
    support_hours: 'Mon-Fri: 9AM-6PM (UTC+7)'
  });

  // Fetch support settings from admin
  useEffect(() => {
    const fetchSupportSettings = async () => {
      if (!isSupabaseConfigured()) return;
      
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'support_settings')
          .single();
        
        if (data?.setting_value) {
          setSupportSettings(prev => ({ ...prev, ...data.setting_value }));
        }
      } catch (error) {
        console.error('Error fetching support settings:', error);
      }
    };

    if (isOpen) {
      fetchSupportSettings();
    }
  }, [isOpen]);

  const supportCategories = [
    { id: 'general', label: 'General Question', icon: HelpCircle },
    { id: 'technical', label: 'Technical Issue', icon: Bug },
    { id: 'payment', label: 'Payment Problem', icon: CreditCard },
    { id: 'referral', label: 'Referral Issue', icon: Users }
  ];

  const handleSubmitTicket = async () => {
    if (!ticket.subject.trim() || !ticket.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isSupabaseConfigured()) {
        // Save ticket to database (you can create a support_tickets table)
        const { error } = await supabase
          .from('support_tickets')
          .insert({
            category: ticket.category,
            subject: ticket.subject,
            message: ticket.message,
            priority: ticket.priority,
            status: 'open',
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error saving ticket:', error);
        }
      }
      
      // Simulate ticket submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Support ticket submitted! We\'ll respond within 24 hours.');
      setTicket({
        category: 'general',
        subject: '',
        message: '',
        priority: 'medium'
      });
      onClose();
    } catch (error) {
      toast.error('Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTelegram = () => {
    window.open(`https://t.me/${supportSettings.telegram_username}`, '_blank');
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Hello, I need help with Biometra platform.');
    window.open(`https://wa.me/${supportSettings.whatsapp_number}?text=${message}`, '_blank');
  };

  const openEmail = () => {
    window.open(`mailto:${supportSettings.email_address}?subject=Biometra Support Request`, '_blank');
  };

  const tabs = [
    { id: 'contact', label: 'Contact', icon: MessageCircle },
    { id: 'ticket', label: 'Ticket', icon: Send },
    { id: 'faq', label: 'FAQ', icon: HelpCircle }
  ];

  const faqs = [
    {
      question: 'How do I start mining ORE tokens?',
      answer: 'Simply tap the mining core on the Mine page. Each tap consumes 1 energy and gives you ORE based on your mining power.'
    },
    {
      question: 'How does the referral system work?',
      answer: 'Share your referral code with friends. When they sign up, you get +25 ORE and they get +50 ORE bonus. You also earn 5% commission on their purchases.'
    },
    {
      question: 'How can I withdraw my BIO tokens?',
      answer: 'You need to reach BIO-5 level to withdraw. Go to Profile > Wallet and submit a withdrawal request. Admin approval is required.'
    },
    {
      question: 'What is the difference between ORE and BIO tokens?',
      answer: 'ORE is the mining token you earn by tapping. BIO is the main project token that you can withdraw to your wallet. You can swap ORE to BIO at level 3.'
    },
    {
      question: 'How do I upgrade my mining power?',
      answer: 'Go to Upgrade section and use USDT to upgrade your tap power, multiplier, and energy capacity.'
    },
    {
      question: 'Why is my energy not refilling?',
      answer: 'Energy refills automatically at 1 point every 30 seconds. Make sure you\'re not at maximum capacity. If issues persist, contact support.'
    }
  ];

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
            className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-lg max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Customer Support</h3>
                  <p className="text-blue-300 text-sm">We're here to help!</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="px-4 pt-3">
              <div className="flex bg-black/30 rounded-xl p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-2 rounded-lg transition-all text-sm ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {activeTab === 'contact' && (
                <div className="space-y-4">
                  {/* Quick Contact Options */}
                  <div className="grid grid-cols-1 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openTelegram}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl hover:border-blue-400/50 transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-semibold text-sm">Telegram Support</div>
                        <div className="text-blue-300 text-sm">@{supportSettings.telegram_username}</div>
                        <div className="text-blue-200 text-xs">Response: 2-4 hours</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openWhatsApp}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl hover:border-green-400/50 transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-semibold text-sm">WhatsApp Support</div>
                        <div className="text-green-300 text-sm">+{supportSettings.whatsapp_number}</div>
                        <div className="text-green-200 text-xs">Response: 1-2 hours</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-green-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openEmail}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl hover:border-purple-400/50 transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-semibold text-sm">Email Support</div>
                        <div className="text-purple-300 text-sm">{supportSettings.email_address}</div>
                        <div className="text-purple-200 text-xs">Response: 24-48 hours</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                    </motion.button>
                  </div>

                  {/* Support Hours */}
                  <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Clock className="w-5 h-5 text-orange-400" />
                      <div className="text-white font-semibold">Support Hours</div>
                    </div>
                    <div className="text-orange-300 text-sm">
                      {supportSettings.support_hours}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ticket' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-blue-300 mb-2 text-sm">Category</label>
                    <select
                      value={ticket.category}
                      onChange={(e) => setTicket(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/50 border border-blue-500/30 rounded-lg text-white text-sm"
                    >
                      {supportCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-blue-300 mb-2 text-sm">Priority</label>
                    <select
                      value={ticket.priority}
                      onChange={(e) => setTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-black/50 border border-blue-500/30 rounded-lg text-white text-sm"
                    >
                      <option value="low">Low - General inquiry</option>
                      <option value="medium">Medium - Account issue</option>
                      <option value="high">High - Payment/Security issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-blue-300 mb-2 text-sm">Subject</label>
                    <input
                      type="text"
                      value={ticket.subject}
                      onChange={(e) => setTicket(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of your issue"
                      className="w-full px-3 py-2 bg-black/50 border border-blue-500/30 rounded-lg text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-300 mb-2 text-sm">Message</label>
                    <textarea
                      value={ticket.message}
                      onChange={(e) => setTicket(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Please describe your issue in detail..."
                      rows={4}
                      className="w-full px-3 py-2 bg-black/50 border border-blue-500/30 rounded-lg text-white text-sm resize-none"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitTicket}
                    disabled={isSubmitting || !ticket.subject.trim() || !ticket.message.trim()}
                    className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                      isSubmitting || !ticket.subject.trim() || !ticket.message.trim()
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  </motion.button>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="text-yellow-400 text-sm font-semibold mb-2">💡 Before submitting:</div>
                    <div className="text-yellow-300 text-xs space-y-1">
                      <div>• Check FAQ section for common solutions</div>
                      <div>• Include your username and detailed steps</div>
                      <div>• For payment issues, include transaction details</div>
                      <div>• Screenshots help us understand the problem</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-black/30 border border-purple-500/20 rounded-lg p-3"
                    >
                      <div className="text-white font-semibold mb-2 text-sm">{faq.question}</div>
                      <div className="text-gray-300 text-xs leading-relaxed">{faq.answer}</div>
                    </motion.div>
                  ))}

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
                    <div className="text-blue-400 font-semibold mb-2 text-sm">Still need help?</div>
                    <div className="text-blue-300 text-xs mb-3">
                      Can't find the answer you're looking for? Our support team is ready to help!
                    </div>
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Contact Support
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SupportModal;