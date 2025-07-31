import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award, Users, Zap, Coins, Crown, Star, Gift } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import toast from 'react-hot-toast';

interface LeaderboardUser {
  id: string;
  username: string;
  lifetime_ore_earned: number;
  ore_balance: number;
  level: number;
  total_taps: number;
  referrals: number;
  badges: string[];
}

interface RewardBadge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

function LeaderboardSection() {
  const { user } = useAuth();
  const { refreshUserData } = useGame();
  const [activeTab, setActiveTab] = useState('lifetime');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRewards, setShowRewards] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMiners: 0,
    oreMinedTotal: 0,
    bioMined: 0
  });
  const [rewardsEnabled, setRewardsEnabled] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const rewardBadges: RewardBadge[] = [
    { id: 'top1', name: 'Champion', icon: '👑', color: 'from-yellow-400 to-yellow-600', description: 'Rank #1 Miner' },
    { id: 'top2', name: 'Elite', icon: '🥈', color: 'from-gray-300 to-gray-500', description: 'Rank #2 Miner' },
    { id: 'top3', name: 'Expert', icon: '🥉', color: 'from-orange-400 to-orange-600', description: 'Rank #3 Miner' },
    { id: 'top5', name: 'Pro', icon: '⭐', color: 'from-purple-400 to-purple-600', description: 'Top 5 Miner' },
    { id: 'top10', name: 'Rising Star', icon: '🌟', color: 'from-blue-400 to-blue-600', description: 'Top 10 Miner' }
  ];

  const getRewardForRank = (rank: number) => {
    if (rank === 1) return { badge: 'top1', ore: 5000, title: 'Champion' };
    if (rank === 2) return { badge: 'top2', ore: 3000, title: 'Elite' };
    if (rank === 3) return { badge: 'top3', ore: 2000, title: 'Expert' };
    if (rank <= 5) return { badge: 'top5', ore: 1000, title: 'Pro' };
    if (rank <= 10) return { badge: 'top10', ore: 500, title: 'Rising Star' };
    return null;
  };

  // Fetch leaderboard data from database
  const fetchLeaderboardData = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data with usernames
      setLeaderboardData([
        { 
          id: '1', 
          username: 'CryptoMaster', 
          lifetime_ore_earned: 15420, 
          ore_balance: 8420,
          level: 8, 
          total_taps: 15420, 
          referrals: 12,
          badges: ['top1', 'top3']
        },
        { 
          id: '2', 
          username: 'MiningKing', 
          lifetime_ore_earned: 12350, 
          ore_balance: 5350,
          level: 7, 
          total_taps: 12350, 
          referrals: 8,
          badges: ['top2']
        },
        { 
          id: '3', 
          username: 'TapExpert', 
          lifetime_ore_earned: 9870, 
          ore_balance: 2870,
          level: 6, 
          total_taps: 9870, 
          referrals: 5,
          badges: ['top5']
        }
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          lifetime_ore_earned,
          ore_balance,
          level,
          total_taps,
          referrals,
          badges,
          created_at
        `)
        .order('lifetime_ore_earned', { ascending: false })
        .limit(50);

      if (error) {
        console.log('Error fetching leaderboard:', error);
        setLeaderboardData([]);
      } else {
        const processedUsers = (users || []).map(user => ({
          ...user,
          username: user.username || `User${user.id?.slice(-4) || '0000'}`,
          lifetime_ore_earned: parseFloat(user.lifetime_ore_earned) || 0,
          ore_balance: parseFloat(user.ore_balance) || 0,
          level: parseInt(user.level) || 1,
          total_taps: parseInt(user.total_taps) || 0,
          referrals: parseInt(user.referrals) || 0,
          badges: user.badges || []
        }));
        setLeaderboardData(processedUsers);
      }
    } catch (error) {
      console.log('Network error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for available rewards
  const checkAvailableRewards = async () => {
    if (!user || !isSupabaseConfigured() || !rewardsEnabled) return;

    try {
      // Check if rewards are currently enabled
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'leaderboard_rewards_enabled')
        .single();
      
      if (!settings || !settings.setting_value.enabled) {
        setAvailableRewards([]);
        return;
      }

      // Find user's current rank
      const userRank = leaderboardData.findIndex(u => u.id === user.id) + 1;
      if (userRank === 0) return; // User not in leaderboard

      const reward = getRewardForRank(userRank);
      if (!reward) return;

      // Get current active period
      const { data: activePeriod } = await supabase
        .from('leaderboard_periods')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (!activePeriod) return;
      
      // Check if user already claimed reward for this period
      const { data: existingReward } = await supabase
        .from('leaderboard_rewards')
        .select('id')
        .eq('user_id', user.id)
        .eq('reward_type', 'period')
        .gte('period_start', activePeriod.start_time)
        .lte('period_end', activePeriod.end_time)
        .limit(1);

      if (!existingReward || existingReward.length === 0) {
        setAvailableRewards([{
          rank: userRank,
          ...reward
        }]);
      }
    } catch (error) {
      console.log('Error checking rewards:', error);
    }
  };

  // Fetch admin settings and current period
  const fetchAdminSettings = async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('*');
      
      if (settings) {
        const rewardsEnabled = settings.find(s => s.setting_key === 'leaderboard_rewards_enabled');
        const currentPeriodSetting = settings.find(s => s.setting_key === 'current_leaderboard_period');
        
        if (rewardsEnabled) {
          setRewardsEnabled(rewardsEnabled.setting_value.enabled);
        }
        
        if (currentPeriodSetting && currentPeriodSetting.setting_value.period_id) {
          const { data: period } = await supabase
            .from('leaderboard_periods')
            .select('*')
            .eq('id', currentPeriodSetting.setting_value.period_id)
            .single();
          
          if (period && period.is_active) {
            setCurrentPeriod(period);
          }
        }
      }
    } catch (error) {
      console.log('Error fetching admin settings:', error);
    }
  };

  // Update countdown timer
  React.useEffect(() => {
    if (currentPeriod && currentPeriod.is_active) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(currentPeriod.end_time).getTime();
        const difference = end - now;
        
        if (difference > 0) {
          const hours = Math.floor(difference / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          setTimeLeft({ hours, minutes, seconds });
        } else {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
          setCurrentPeriod(null);
          setRewardsEnabled(false);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentPeriod]);

  // Claim reward
  const claimReward = async (reward: any) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      if (!currentPeriod) {
        toast.error('No active reward period');
        return;
      }

      // Add reward to database
      const { error: rewardError } = await supabase
        .from('leaderboard_rewards')
        .insert({
          user_id: user.id,
          rank_position: reward.rank,
          reward_type: 'period',
          badge_earned: reward.badge,
          ore_reward: reward.ore,
          period_start: currentPeriod.start_time,
          period_end: currentPeriod.end_time
        });

      if (rewardError) {
        toast.error('Failed to claim reward');
        return;
      }

      // Update user's badges and ORE balance
      const currentUser = leaderboardData.find(u => u.id === user.id);
      const newBadges = [...(currentUser?.badges || [])];
      if (!newBadges.includes(reward.badge)) {
        newBadges.push(reward.badge);
      }

      // Get current ORE balance and calculate new balance
      const currentOreBalance = currentUser?.ore_balance || 0;
      const newOreBalance = currentOreBalance + reward.ore;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          badges: newBadges,
          ore_balance: newOreBalance,
          last_reward_claim: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        toast.error('Failed to update user data');
        return;
      }

      toast.success(`🎉 Claimed ${reward.title} reward! +${reward.ore} ORE + ${reward.badge.toUpperCase()} badge!`);
      setAvailableRewards([]);
      setShowRewards(false);
      
      // Refresh user data
      setTimeout(() => {
        refreshUserData();
        fetchLeaderboardData();
      }, 1000);

    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    }
  };

  // Fetch platform statistics
  const fetchPlatformStats = async () => {
    if (!isSupabaseConfigured()) {
      setStats({
        totalMiners: leaderboardData.length || 0,
        oreMinedTotal: leaderboardData.reduce((sum, user) => sum + user.lifetime_ore_earned, 0),
        bioMined: 154.2
      });
      return;
    }

    try {
      const { count: totalMiners } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { data: allUsers } = await supabase
        .from('users')
        .select('lifetime_ore_earned, bio_balance');

      let oreMinedTotal = 0;
      let bioMined = 0;
      
      if (allUsers) {
        oreMinedTotal = allUsers.reduce((sum: number, user: any) => {
          return sum + (parseFloat(user.lifetime_ore_earned) || 0);
        }, 0);
        
        bioMined = allUsers.reduce((sum: number, user: any) => {
          return sum + (parseFloat(user.bio_balance) || 0);
        }, 0);
      }

      setStats({
        totalMiners: totalMiners || 0,
        oreMinedTotal: Math.floor(oreMinedTotal),
        bioMined: parseFloat(bioMined.toFixed(2))
      });

    } catch (error) {
      console.log('Error fetching platform stats:', error);
      setStats({
        totalMiners: leaderboardData.length || 0,
        oreMinedTotal: leaderboardData.reduce((sum, user) => sum + user.lifetime_ore_earned, 0),
        bioMined: 0
      });
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchPlatformStats();
      fetchAdminSettings();
      checkAvailableRewards();
    }
  }, [isLoading, leaderboardData, user]);

  useEffect(() => {
    const sortedData = [...leaderboardData].sort((a, b) => {
      switch (activeTab) {
        case 'lifetime':
          return b.lifetime_ore_earned - a.lifetime_ore_earned;
        case 'current':
          return b.ore_balance - a.ore_balance;
        case 'level':
          return b.level - a.level;
        case 'referrals':
          return b.referrals - a.referrals;
        default:
          return b.lifetime_ore_earned - a.lifetime_ore_earned;
      }
    });
    setLeaderboardData(sortedData);
  }, [activeTab]);

  const tabs = [
    { id: 'lifetime', label: 'Lifetime ORE', icon: Crown },
    { id: 'current', label: 'Current ORE', icon: Zap },
    { id: 'level', label: 'BIO Level', icon: Award },
    { id: 'referrals', label: 'Referrals', icon: Users }
  ];

  const getRankIcon = (index: number) => {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'from-yellow-400 to-yellow-600';
    if (index === 1) return 'from-gray-300 to-gray-500';
    if (index === 2) return 'from-orange-400 to-orange-600';
    if (index < 5) return 'from-purple-400 to-purple-600';
    if (index < 10) return 'from-blue-400 to-blue-600';
    return 'from-gray-500 to-gray-700';
  };

  const getBadgeInfo = (badgeId: string) => {
    return rewardBadges.find(b => b.id === badgeId);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 pt-4 pb-2 px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl mb-4 neon-glow animate-float">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Mining Leaderboard</h2>
            <p className="text-purple-300 text-sm font-medium">Compete globally and earn rewards!</p>
          </div>
        </div>

        {/* Countdown Timer */}
        {rewardsEnabled && currentPeriod && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4"
          >
            <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/50 rounded-2xl p-4 neon-glow">
              <div className="text-center">
                <div className="text-white font-bold mb-2">🏆 Reward Period Active</div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="text-xs text-purple-300">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
                    <div className="text-xs text-purple-300">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
                    <div className="text-xs text-purple-300">Seconds</div>
                  </div>
                </div>
                <div className="text-purple-300 text-sm">Time remaining to claim rewards</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rewards Notification */}
        {availableRewards.length > 0 && rewardsEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4"
          >
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-2xl p-4 neon-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Gift className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-white font-bold">🎉 Reward Available!</div>
                    <div className="text-yellow-300 text-sm">Rank #{availableRewards[0].rank} - Claim your prize!</div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRewards(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-sm neon-glow"
                >
                  Claim
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex-shrink-0 px-4 mb-4">
          <div className="bg-black/30 backdrop-blur-2xl rounded-2xl p-1 border border-white/20 neon-glow">
            <div className="grid grid-cols-2 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 text-sm ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white neon-glow'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="mobile-card p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="text-white text-xl font-bold">Loading Rankings...</div>
              </div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="mobile-card p-8 text-center">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-white text-xl font-bold mb-2">No Miners Yet</div>
                <div className="text-gray-400">Be the first to start mining!</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`mobile-card p-4 transition-all hover:scale-102 ${
                    index < 3 ? 'neon-glow' : ''
                  } ${user.id === user?.id ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl font-black text-lg bg-gradient-to-r ${getRankColor(index)} text-white neon-glow`}>
                      {getRankIcon(index)}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="text-white font-bold text-lg">{user.username}</div>
                        {user.id === user?.id && (
                          <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-300 text-xs font-bold">
                            YOU
                          </div>
                        )}
                      </div>
                      
                      {/* Badges */}
                      {user.badges && user.badges.length > 0 && (
                        <div className="flex items-center space-x-1 mb-1">
                          {user.badges.slice(0, 3).map((badgeId, badgeIndex) => {
                            const badge = getBadgeInfo(badgeId);
                            return badge ? (
                              <div
                                key={badgeIndex}
                                className={`px-2 py-1 bg-gradient-to-r ${badge.color} rounded-full text-white text-xs font-bold flex items-center space-x-1`}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.name}</span>
                              </div>
                            ) : null;
                          })}
                          {user.badges.length > 3 && (
                            <div className="text-gray-400 text-xs">+{user.badges.length - 3}</div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-sm text-purple-300 font-medium">
                        Level {user.level} • {user.total_taps.toLocaleString()} taps • {user.referrals} refs
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-xl font-black text-white">
                        {activeTab === 'lifetime' && `${user.lifetime_ore_earned.toFixed(0)}`}
                        {activeTab === 'current' && `${user.ore_balance.toFixed(0)}`}
                        {activeTab === 'level' && `L${user.level}`}
                        {activeTab === 'referrals' && `${user.referrals}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {activeTab === 'lifetime' && 'Total ORE'}
                        {activeTab === 'current' && 'Current ORE'}
                        {activeTab === 'level' && 'BIO Level'}
                        {activeTab === 'referrals' && 'Referrals'}
                      </div>
                      {index < 10 && (
                        <div className="text-xs text-yellow-400 font-bold mt-1">
                          🏆 Top {index < 3 ? '3' : index < 5 ? '5' : '10'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Platform Statistics */}
              <div className="mt-8 space-y-4">
                <h3 className="text-2xl font-bold text-white text-center mb-6">📊 Platform Stats</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="mobile-card p-6 text-center">
                    <Medal className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <div className="text-3xl font-black text-white mb-2">{stats.totalMiners.toLocaleString()}</div>
                    <div className="text-purple-300 font-medium">Total Miners</div>
                  </div>

                  <div className="mobile-card p-6 text-center">
                    <Zap className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <div className="text-3xl font-black text-white mb-2">
                      {stats.oreMinedTotal > 1000000 
                        ? `${(stats.oreMinedTotal / 1000000).toFixed(1)}M` 
                        : stats.oreMinedTotal > 1000 
                          ? `${(stats.oreMinedTotal / 1000).toFixed(1)}K` 
                          : stats.oreMinedTotal.toLocaleString()
                      }
                    </div>
                    <div className="text-cyan-300 font-medium">Total ORE Mined</div>
                  </div>

                  <div className="mobile-card p-6 text-center">
                    <Coins className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <div className="text-3xl font-black text-white mb-2">
                      {stats.bioMined > 1000 
                        ? `${(stats.bioMined / 1000).toFixed(1)}K` 
                        : stats.bioMined.toLocaleString()
                      }
                    </div>
                    <div className="text-green-300 font-medium">Total BIO Mined</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rewards Modal */}
      <AnimatePresence>
        {showRewards && availableRewards.length > 0 && (
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
              className="mobile-card p-8 w-full max-w-md text-center"
            >
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 neon-glow animate-pulse-glow">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">🎉 Congratulations!</h3>
                <p className="text-purple-300">You've earned a ranking reward!</p>
              </div>

              {availableRewards.map((reward, index) => (
                <div key={index} className="mb-6">
                  <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl p-6 border border-purple-500/30 mb-4">
                    <div className="text-4xl mb-2">{getRankIcon(reward.rank - 1)}</div>
                    <div className="text-xl font-bold text-white mb-2">Rank #{reward.rank}</div>
                    <div className="text-purple-300 mb-4">{reward.title} Badge</div>
                    <div className="text-3xl font-black text-yellow-400 mb-2">+{reward.ore} ORE</div>
                    <div className="text-sm text-gray-300">Period ranking reward</div>
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowRewards(false)}
                      className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-all"
                    >
                      Later
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => claimReward(reward)}
                      className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white rounded-xl font-bold transition-all neon-glow"
                    >
                      Claim Reward
                    </motion.button>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default LeaderboardSection;