import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Copy, Check, Gift, Share2, TrendingUp, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import {
  getReferralStats,
  getReferredUsers,
  getReferralTransactions,
  createReferralLink,
  updateReferralRankings,
  ReferralStats,
  ReferralUser,
  ReferralTransaction
} from '../lib/referral';
import toast from 'react-hot-toast';

function ReferralSection() {
  const { user } = useAuth();
  const { refreshUserData } = useGame();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    referralCode: '',
    rank: 0
  });
  const [referredUsers, setReferredUsers] = useState<ReferralUser[]>([]);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const referralLink = `https://biometra.app?ref=${referralStats.referralCode}`;

  // Manual sync function for debugging
  const handleManualSync = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Manual sync triggered...');
      
      // Import sync function
      const { syncAllReferralData } = await import('../lib/referral');
      const success = await syncAllReferralData();
      
      if (success) {
        toast.success('✅ Referral data synced successfully!');
        // Refresh data after sync
        await fetchReferralData();
      } else {
        toast.error('❌ Failed to sync referral data');
      }
    } catch (error) {
      console.error('Error in manual sync:', error);
      toast.error('❌ Sync failed');
    }
  };

  // Fetch all referral data
  const fetchReferralData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Fetching referral data for user:', user.id);
      
      // Create referral link if doesn't exist
      const referralCode = await createReferralLink(user.id);
      
      // Fetch all data in parallel
      const [stats, users, txns] = await Promise.all([
        getReferralStats(user.id),
        getReferredUsers(user.id),
        getReferralTransactions(user.id)
      ]);
      
      // Update rankings
      try {
        await updateReferralRankings();
      } catch (error) {
        console.log('Rankings update failed (non-critical):', error);
      }
      
      setReferralStats({ ...stats, referralCode });
      setReferredUsers(users);
      setTransactions(txns);
      setLastRefresh(new Date());
      
      console.log('✅ Referral data loaded:', {
        totalReferrals: stats.totalReferrals,
        totalEarnings: stats.totalEarnings,
        referredUsersCount: users.length,
        transactionsCount: txns.length
      });
      
    } catch (error) {
      console.error('❌ Error fetching referral data:', error);
      // Don't show error toast for initial load failures
      console.log('Referral data load failed, using fallback');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchReferralData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Biometra - Tap the Future!',
          text: 'Start mining ORE tokens and earn $BIO! Use my referral code for bonus rewards.',
          url: referralLink,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyReferralLink();
    }
  };

  const handleManualRefresh = () => {
    fetchReferralData();
    refreshUserData();
    toast.success('Data refreshed!');
  };

  if (!user) {
    return (
      <section className="flex flex-col justify-center min-h-full px-4 py-8">
        <div className="container mx-auto text-center">
          <div className="mobile-card p-8 max-w-md mx-auto">
            <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Referral System</h3>
            <p className="text-gray-300">Login to access referral features</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Referral Program</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Invite friends to join Biometra and earn rewards together. Both you and your friends get bonus ORE!
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Referral Stats */}
            <div className="space-y-6">
              <div className="mobile-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Your Referral Stats</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleManualRefresh}
                      disabled={isLoading}
                      className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleManualSync}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      title="Force sync all data"
                    >
                      <RefreshCw className="w-4 h-4 text-white" />
                    </button>
                    <div className="text-xs text-gray-400">
                      {lastRefresh.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl p-4 text-center neon-glow">
                    <div className="text-4xl font-black text-white mb-2">
                      {isLoading ? '...' : referralStats.totalReferrals}
                    </div>
                    <div className="text-purple-300 text-sm font-medium">Total Referrals</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl p-4 text-center neon-glow">
                    <div className="text-4xl font-black text-white mb-2">
                      {isLoading ? '...' : referralStats.totalEarnings.toFixed(0)}
                    </div>
                    <div className="text-green-300 text-sm font-medium">ORE Earned</div>
                  </div>
                </div>

                {referralStats.rank > 0 && (
                  <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl p-4 text-center mb-6 neon-glow">
                    <div className="text-2xl font-black text-white mb-2">#{referralStats.rank}</div>
                    <div className="text-yellow-300 text-sm font-medium">Leaderboard Rank</div>
                  </div>
                )}

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-yellow-400 text-sm mb-2">
                    <Gift className="w-4 h-4" />
                    <span className="font-semibold">Referral Rewards</span>
                  </div>
                  <div className="text-yellow-300 text-sm">
                    • Earn +25 ORE for each successful referral<br/>
                    • Your friends get +50 ORE bonus when they join<br/>
                    • Earn 5% commission on their purchases<br/>
                    • Unlimited referrals, unlimited rewards!
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-500/30">
                    <button
                      onClick={handleManualSync}
                      className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      🔄 Sync Referral Data
                    </button>
                    <div className="text-xs text-yellow-200 mt-1 text-center">
                      Click if data not updating
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Tools */}
            <div className="space-y-6">
              <div className="mobile-card p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Share Your Code</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-purple-300 mb-2">Your Referral Code</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 px-4 py-4 bg-black/50 border border-purple-500/30 rounded-2xl text-white font-mono text-xl font-black text-center neon-glow">
                        {referralStats.referralCode || 'Loading...'}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={copyReferralLink}
                        className="p-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 rounded-2xl transition-all neon-glow"
                      >
                        {copied ? <Check className="w-6 h-6 text-white" /> : <Copy className="w-6 h-6 text-white" />}
                      </motion.button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-purple-300 mb-2">Referral Link</label>
                    <div className="px-4 py-4 bg-black/50 border border-purple-500/30 rounded-2xl text-white text-sm break-all font-medium">
                      {referralLink}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={copyReferralLink}
                      className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 text-white rounded-2xl font-bold transition-all neon-glow"
                    >
                      <Copy className="w-5 h-5" />
                      <span>Copy Link</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={shareReferralLink}
                      className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white rounded-2xl font-bold transition-all neon-glow"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Referred Users List */}
              <div className="mobile-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Your Referrals</h3>
                  <div className="text-sm text-purple-300">
                    {referredUsers.length} users
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="text-gray-400">Loading referral data...</div>
                  </div>
                ) : referredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-400">No referrals yet</div>
                    <div className="text-sm text-gray-500">Share your link to get started!</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {referredUsers.map((referredUser) => (
                      <div key={referredUser.id} className="bg-black/30 rounded-lg p-3 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold">{referredUser.username}</div>
                            <div className="text-sm text-purple-300">
                              Level {referredUser.level} • {referredUser.total_taps.toLocaleString()} taps
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-400 font-bold">{referredUser.ore_balance.toFixed(0)} ORE</div>
                            <div className="text-xs text-gray-400">
                              {new Date(referredUser.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commission History */}
              <div className="mobile-card p-8">
                <h3 className="text-xl font-bold text-white mb-6">Recent Commissions</h3>
                
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-400">No commissions yet</div>
                    <div className="text-sm text-gray-500">Commissions appear when referrals make purchases</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-lg p-3 border border-green-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold">
                              {transaction.referred_user.username}
                            </div>
                            <div className="text-sm text-green-300">
                              {transaction.transaction_type} • {transaction.transaction_amount.toFixed(0)} ORE
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">+{transaction.commission_amount.toFixed(1)} ORE</div>
                            <div className="text-xs text-gray-400">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 neon-glow">
                <h4 className="text-lg font-bold text-white mb-3">💡 Referral Tips</h4>
                <div className="space-y-2 text-sm text-blue-300">
                  <div>• Share on social media for maximum reach</div>
                  <div>• Explain the benefits of mining ORE tokens</div>
                  <div>• Help your friends get started with mining</div>
                  <div>• Track your earnings in real-time</div>
                  <div>• Earn commissions on all their purchases</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile spacing for footer */}
          <div className="h-32 md:h-0"></div>
        </div>
      </div>
    </section>
  );
}

export default ReferralSection;