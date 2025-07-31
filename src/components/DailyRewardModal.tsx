import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Gift, Zap, Star, Crown, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import toast from 'react-hot-toast';

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DailyRewardStatus {
  can_claim: boolean;
  is_new_day: boolean;
  current_day: number;
  ore_reward: number;
  consecutive_days: number;
  last_reward_date: string | null;
}

function DailyRewardModal({ isOpen, onClose }: DailyRewardModalProps) {
  const { user } = useAuth();
  const { refreshUserData } = useGame();
  const [rewardStatus, setRewardStatus] = useState<DailyRewardStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check daily reward status
  const checkDailyReward = async () => {
    if (!user || !isSupabaseConfigured()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_daily_login_reward', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking daily reward:', error);
        return;
      }

      setRewardStatus(data);
    } catch (error) {
      console.error('Error checking daily reward:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Claim daily reward
  const claimDailyReward = async () => {
    if (!user || !isSupabaseConfigured() || !rewardStatus?.can_claim) return;

    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_login_reward', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error claiming daily reward:', error);
        toast.error('Failed to claim daily reward');
        return;
      }

      if (data.success) {
        setShowCelebration(true);
        toast.success(`🎉 Day ${data.day_number} reward claimed! +${data.ore_reward} ORE!`);
        
        // Update reward status
        setRewardStatus(prev => prev ? { ...prev, can_claim: false } : null);
        
        // Refresh user data
        setTimeout(() => {
          refreshUserData();
        }, 1000);
      } else {
        toast.error(data.message || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      toast.error('Failed to claim daily reward');
    } finally {
      setIsClaiming(false);
    }
  };

  // Check reward status when modal opens
  useEffect(() => {
    if (isOpen && user) {
      checkDailyReward();
    }
  }, [isOpen, user]);

  // Generate calendar grid for 30 days
  const generateCalendarDays = () => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      const isCompleted = rewardStatus && i <= rewardStatus.consecutive_days;
      const isCurrent = rewardStatus && i === rewardStatus.current_day && rewardStatus.can_claim;
      const oreReward = i * 100;
      
      days.push({
        day: i,
        oreReward,
        isCompleted,
        isCurrent,
        isAvailable: rewardStatus && i <= rewardStatus.current_day
      });
    }
    return days;
  };

  const getDayIcon = (day: number) => {
    if (day === 7 || day === 14 || day === 21 || day === 28) return Crown;
    if (day % 5 === 0) return Star;
    return Gift;
  };

  const getDayColor = (day: number, isCompleted: boolean, isCurrent: boolean) => {
    if (isCurrent) return 'from-yellow-400 to-orange-500';
    if (isCompleted) return 'from-green-400 to-emerald-500';
    if (day === 7 || day === 14 || day === 21 || day === 28) return 'from-purple-400 to-pink-500';
    if (day % 5 === 0) return 'from-cyan-400 to-blue-500';
    return 'from-gray-400 to-gray-600';
  };

  if (!rewardStatus && !isLoading) return null;

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
            className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center neon-glow">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">📅 Daily Login Rewards</h3>
                  <p className="text-purple-300">Login setiap hari untuk mendapatkan ORE!</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-white text-xl font-bold">Loading Daily Rewards...</div>
                </div>
              ) : (
                <>
                  {/* Current Status */}
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl p-6 border border-purple-500/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-3xl font-black text-white mb-2">
                            {rewardStatus?.consecutive_days || 0}
                          </div>
                          <div className="text-purple-300 text-sm font-medium">Consecutive Days</div>
                        </div>
                        <div>
                          <div className="text-3xl font-black text-white mb-2">
                            Day {rewardStatus?.current_day || 1}
                          </div>
                          <div className="text-cyan-300 text-sm font-medium">Current Day</div>
                        </div>
                        <div>
                          <div className="text-3xl font-black text-white mb-2">
                            {rewardStatus?.ore_reward || 0}
                          </div>
                          <div className="text-yellow-300 text-sm font-medium">Today's Reward</div>
                        </div>
                      </div>
                      
                      {rewardStatus?.can_claim && (
                        <div className="mt-6 text-center">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={claimDailyReward}
                            disabled={isClaiming}
                            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                              isClaiming
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white neon-glow'
                            }`}
                          >
                            {isClaiming ? 'Claiming...' : `🎁 Claim ${rewardStatus.ore_reward} ORE`}
                          </motion.button>
                        </div>
                      )}
                      
                      {!rewardStatus?.can_claim && rewardStatus?.last_reward_date && (
                        <div className="mt-6 text-center">
                          <div className="px-6 py-3 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 inline-block">
                            ✅ Today's reward already claimed!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="mb-8">
                    <h4 className="text-xl font-bold text-white mb-6 text-center">📊 30-Day Reward Calendar</h4>
                    <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-3">
                      {generateCalendarDays().map((dayData) => {
                        const Icon = getDayIcon(dayData.day);
                        const colorClass = getDayColor(dayData.day, dayData.isCompleted, dayData.isCurrent);
                        
                        return (
                          <motion.div
                            key={dayData.day}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: dayData.day * 0.02 }}
                            className={`relative p-3 rounded-xl border-2 text-center ${
                              dayData.isCurrent
                                ? 'border-yellow-400 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 neon-glow animate-pulse-glow'
                                : dayData.isCompleted
                                  ? 'border-green-400 bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                                  : dayData.isAvailable
                                    ? 'border-purple-400 bg-gradient-to-br from-purple-500/20 to-cyan-500/20'
                                    : 'border-gray-500 bg-gradient-to-br from-gray-500/10 to-gray-600/10'
                            }`}
                          >
                            {/* Day Icon */}
                            <div className={`w-8 h-8 bg-gradient-to-r ${colorClass} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                              {dayData.isCompleted ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : (
                                <Icon className="w-4 h-4 text-white" />
                              )}
                            </div>
                            
                            {/* Day Number */}
                            <div className={`text-sm font-bold mb-1 ${
                              dayData.isCurrent ? 'text-yellow-400' :
                              dayData.isCompleted ? 'text-green-400' :
                              dayData.isAvailable ? 'text-white' : 'text-gray-400'
                            }`}>
                              Day {dayData.day}
                            </div>
                            
                            {/* Reward Amount */}
                            <div className={`text-xs font-bold ${
                              dayData.isCurrent ? 'text-yellow-300' :
                              dayData.isCompleted ? 'text-green-300' :
                              dayData.isAvailable ? 'text-purple-300' : 'text-gray-500'
                            }`}>
                              {dayData.oreReward} ORE
                            </div>
                            
                            {/* Special Day Indicator */}
                            {(dayData.day === 7 || dayData.day === 14 || dayData.day === 21 || dayData.day === 28) && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Crown className="w-2 h-2 text-white" />
                              </div>
                            )}
                            
                            {dayData.day % 5 === 0 && dayData.day !== 7 && dayData.day !== 14 && dayData.day !== 21 && dayData.day !== 28 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                                <Star className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reward Rules */}
                  <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                    <h4 className="text-lg font-bold text-white mb-4">📋 Reward Rules</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="text-blue-300">
                          <strong>🎯 Daily Rewards:</strong>
                          <ul className="mt-1 space-y-1 text-blue-200">
                            <li>• Day 1: 100 ORE</li>
                            <li>• Day 2: 200 ORE</li>
                            <li>• Day 3: 300 ORE</li>
                            <li>• Pattern: Day × 100 ORE</li>
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-purple-300">
                          <strong>⚡ Special Rules:</strong>
                          <ul className="mt-1 space-y-1 text-purple-200">
                            <li>• Login setiap hari untuk streak</li>
                            <li>• Skip 1 hari = reset ke Day 1</li>
                            <li>• Bonus untuk milestone days</li>
                            <li>• Maksimal 30 hari cycle</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Celebration Animation */}
            <AnimatePresence>
              {showCelebration && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                  onAnimationComplete={() => {
                    setTimeout(() => setShowCelebration(false), 2000);
                  }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ 
                        rotate: [0, 360],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity
                      }}
                      className="text-8xl mb-4"
                    >
                      🎉
                    </motion.div>
                    <div className="text-4xl font-black text-white mb-2">Reward Claimed!</div>
                    <div className="text-xl text-yellow-400">+{rewardStatus?.ore_reward} ORE</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DailyRewardModal;