import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Gift, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReferral: (code: string) => void;
  onSkip: () => void;
}

function ReferralModal({ isOpen, onClose, onSubmitReferral, onSkip }: ReferralModalProps) {
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReferral(referralCode.trim().toUpperCase());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

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
            className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-md p-8"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Biometra!</h2>
              <p className="text-gray-300">Do you have a referral code?</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-purple-300 mb-2">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none uppercase"
                  maxLength={8}
                />
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-400 text-sm mb-2">
                  <Gift className="w-4 h-4" />
                  <span className="font-semibold">Referral Bonus</span>
                </div>
                <div className="text-green-300 text-sm">
                  • Get +50 ORE bonus when using a referral code<br/>
                  • Referrer gets +25 ORE for each successful referral
                </div>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                >
                  Skip
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    isSubmitting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 text-white'
                  }`}
                >
                  {isSubmitting ? 'Applying...' : 'Apply Code'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReferralModal;