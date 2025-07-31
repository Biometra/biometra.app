import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Zap, 
  Trophy, 
  Users, 
  Coins, 
  TrendingUp, 
  Calendar, 
  Award,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  CreditCard,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import MarketplaceChatModal from './MarketplaceChatModal';
import toast from 'react-hot-toast';

interface MarketplaceTransaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  usdt_amount: number;
  price_per_usdt: number;
  total_rupiah_paid: number;
  platform_commission: number;
  seller_received: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  payment_proof?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  buyer_username?: string;
  seller_username?: string;
}

function ProfilePage() {
  const { user } = useAuth();
  const { 
    oreBalance, 
    bioBalance, 
    usdtBalance, 
    level, 
    totalTaps, 
    tapPower, 
    multiplier, 
    energy, 
    maxEnergy, 
    referrals, 
    referralEarnings 
  } = useGame();

  const [activeTab, setActiveTab] = useState('overview');
  const [marketplaceTab, setMarketplaceTab] = useState('seller');
  const [sellerTransactions, setSellerTransactions] = useState<MarketplaceTransaction[]>([]);
  const [buyerTransactions, setBuyerTransactions] = useState<MarketplaceTransaction[]>([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<MarketplaceTransaction | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
  ];

  // Fetch marketplace transactions
  const fetchMarketplaceTransactions = async () => {
    if (!user || !isSupabaseConfigured()) return;

    setIsLoadingMarketplace(true);
    try {
      console.log('🔄 Fetching marketplace transactions for user:', user.id);

      // Fetch seller transactions
      const { data: sellerData, error: sellerError } = await supabase
        .from('marketplace_transactions')
        .select(`
          *,
          buyer:users!marketplace_transactions_buyer_id_fkey(username)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (sellerError) {
        console.error('❌ Error fetching seller transactions:', sellerError);
      } else {
        const processedSellerData = (sellerData || []).map(tx => ({
          ...tx,
          buyer_username: tx.buyer?.username || 'Unknown User'
        }));
        setSellerTransactions(processedSellerData);
        console.log('✅ Seller transactions loaded:', processedSellerData.length);
      }

      // Fetch buyer transactions
      const { data: buyerData, error: buyerError } = await supabase
        .from('marketplace_transactions')
        .select(`
          *,
          seller:users!marketplace_transactions_seller_id_fkey(username)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (buyerError) {
        console.error('❌ Error fetching buyer transactions:', buyerError);
      } else {
        const processedBuyerData = (buyerData || []).map(tx => ({
          ...tx,
          seller_username: tx.seller?.username || 'Unknown User'
        }));
        setBuyerTransactions(processedBuyerData);
        console.log('✅ Buyer transactions loaded:', processedBuyerData.length);
      }

    } catch (error) {
      console.error('❌ Error fetching marketplace transactions:', error);
    } finally {
      setIsLoadingMarketplace(false);
    }
  };

  // Handle transaction approval (seller)
  const handleApproveTransaction = async (transactionId: string) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const transaction = sellerTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      console.log('🔄 Approving transaction:', transactionId);

      // Step 1: Update transaction status to completed
      const { error: updateError } = await supabase
        .from('marketplace_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approval_notes: 'Payment confirmed by seller'
        })
        .eq('id', transactionId)
        .eq('seller_id', user.id); // Security check

      if (updateError) {
        console.error('Error approving transaction:', updateError);
        toast.error('Failed to approve transaction');
        return;
      }

      // Step 2: Add USDT to buyer's balance (minus platform commission)
      const platformCommissionRate = 0.05; // 5% commission
      const platformCommission = transaction.usdt_amount * platformCommissionRate;
      const buyerReceives = transaction.usdt_amount - platformCommission;
      
      console.log('💰 USDT transfer calculation:', {
        originalAmount: transaction.usdt_amount,
        platformCommission,
        buyerReceives
      });

      // First fetch current balance
      const { data: buyerData, error: fetchError } = await supabase
        .from('users')
        .select('usdt_balance')
        .eq('id', transaction.buyer_id)
        .single();

      if (fetchError) {
        console.error('Error fetching buyer balance:', fetchError);
        toast.error('Failed to fetch buyer balance');
        return;
      }

      const currentBalance = buyerData.usdt_balance || 0;
      const newBalance = currentBalance + buyerReceives;

      // Update with calculated balance
      const { error: transferError } = await supabase
        .from('users')
        .update({
          usdt_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.buyer_id);

      if (transferError) {
        console.error('Error transferring USDT:', transferError);
        toast.error('Failed to transfer USDT');
        return;
      }

      // Step 3: Update listing stock (deduct the purchased amount)
      // Note: Stock was already deducted when purchase was made
      // No need to deduct again on confirmation
      
      console.log('✅ Transaction approved successfully');
      toast.success(`✅ Payment confirmed! ${buyerReceives.toFixed(2)} USDT sent to buyer (${platformCommission.toFixed(2)} USDT platform fee).`);
      
      // Refresh transactions
      fetchMarketplaceTransactions();
      
      // Refresh marketplace and user data
      setTimeout(() => {
        window.dispatchEvent(new Event('marketplace-updated'));
      }, 1000);

    } catch (error) {
      console.error('Error approving transaction:', error);
      toast.error('Failed to approve transaction');
    }
  };

  // Handle transaction rejection (seller)
  const handleRejectTransaction = async (transactionId: string) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const transaction = sellerTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      console.log('🔄 Rejecting transaction:', transactionId);

      // Step 1: Update transaction status to cancelled
      const { error: updateError } = await supabase
        .from('marketplace_transactions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          approval_notes: 'Payment rejected by seller'
        })
        .eq('id', transactionId)
        .eq('seller_id', user.id); // Security check

      if (updateError) {
        console.error('Error rejecting transaction:', updateError);
        toast.error('Failed to reject transaction');
        return;
      }

      // Step 2: Return USDT stock to listing
      const usdtToReturn = transaction.usdt_amount; // Return the purchased amount
      
      console.log('📦 Returning stock to listing:', {
        listingId: transaction.listing_id,
        usdtToReturn
      });

      const { error: stockError } = await supabase.rpc('return_usdt_stock', {
        p_listing_id: transaction.listing_id,
        p_usdt_amount: usdtToReturn
      });

      if (stockError) {
        console.error('Error returning stock:', stockError);
        toast.error('Failed to return stock to listing');
        return;
      }

      console.log('✅ Transaction rejected successfully');
      toast.success(`❌ Transaction rejected. ${usdtToReturn} USDT returned to listing.`);
      
      // Refresh transactions
      fetchMarketplaceTransactions();
      
      // Refresh listings to show updated stock
      setTimeout(() => {
        window.dispatchEvent(new Event('marketplace-updated'));
      }, 1000);

    } catch (error) {
      console.error('Error rejecting transaction:', error);
      toast.error('Failed to reject transaction');
    }
  };

  // Load marketplace data when tab is selected
  useEffect(() => {
    if (activeTab === 'marketplace' && user) {
      fetchMarketplaceTransactions();
    }
  }, [activeTab, user]);

  // Listen for marketplace updates
  useEffect(() => {
    const handleMarketplaceUpdate = () => {
      if (activeTab === 'marketplace') {
        fetchMarketplaceTransactions();
      }
    };

    window.addEventListener('marketplace-updated', handleMarketplaceUpdate);
    return () => window.removeEventListener('marketplace-updated', handleMarketplaceUpdate);
  }, [activeTab]);

  if (!user) {
    return (
      <section className="flex flex-col justify-center min-h-full px-4 py-8">
        <div className="container mx-auto text-center">
          <div className="mobile-card p-8 max-w-md mx-auto">
            <User className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Profile</h3>
            <p className="text-gray-300">Login to view your profile</p>
          </div>
        </div>
      </section>
    );
  }

  const achievements = [
    { 
      id: 'first_tap', 
      name: 'First Tap', 
      description: 'Complete your first mining tap', 
      icon: '🎯', 
      unlocked: totalTaps > 0,
      progress: Math.min(totalTaps, 1),
      target: 1
    },
    { 
      id: 'hundred_taps', 
      name: 'Century Miner', 
      description: 'Complete 100 mining taps', 
      icon: '💯', 
      unlocked: totalTaps >= 100,
      progress: Math.min(totalTaps, 100),
      target: 100
    },
    { 
      id: 'thousand_taps', 
      name: 'Tap Master', 
      description: 'Complete 1,000 mining taps', 
      icon: '🏆', 
      unlocked: totalTaps >= 1000,
      progress: Math.min(totalTaps, 1000),
      target: 1000
    },
    { 
      id: 'first_referral', 
      name: 'Recruiter', 
      description: 'Invite your first friend', 
      icon: '👥', 
      unlocked: referrals > 0,
      progress: Math.min(referrals, 1),
      target: 1
    },
    { 
      id: 'level_5', 
      name: 'Rising Star', 
      description: 'Reach BIO-5 level', 
      icon: '⭐', 
      unlocked: level >= 5,
      progress: Math.min(level, 5),
      target: 5
    },
    { 
      id: 'level_10', 
      name: 'Expert Miner', 
      description: 'Reach BIO-10 level', 
      icon: '💎', 
      unlocked: level >= 10,
      progress: Math.min(level, 10),
      target: 10
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'cancelled':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">My Profile</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Track your mining progress, achievements, and account statistics
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-1 border border-purple-500/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Info */}
                <div className="mobile-card p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Account Information</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Username</span>
                      <span className="text-white font-semibold">{user.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Email</span>
                      <span className="text-white font-semibold">{user.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Member Since</span>
                      <span className="text-white font-semibold">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">BIO Level</span>
                      <span className="text-purple-400 font-bold text-xl">L{level}</span>
                    </div>
                  </div>
                </div>

                {/* Balance Overview */}
                <div className="mobile-card p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Balance Overview</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Zap className="w-6 h-6 text-yellow-400" />
                          <span className="text-yellow-300 font-semibold">ORE Balance</span>
                        </div>
                        <span className="text-2xl font-bold text-white">{oreBalance.toFixed(0)}</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-4 border border-cyan-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Coins className="w-6 h-6 text-cyan-400" />
                          <span className="text-cyan-300 font-semibold">BIO Balance</span>
                        </div>
                        <span className="text-2xl font-bold text-white">{bioBalance.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-6 h-6 text-green-400" />
                          <span className="text-green-300 font-semibold">USDT Balance</span>
                        </div>
                        <span className="text-2xl font-bold text-white">${usdtBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Total Taps', value: totalTaps.toLocaleString(), icon: Zap, color: 'from-yellow-500 to-orange-500' },
                  { label: 'Mining Power', value: tapPower.toString(), icon: Trophy, color: 'from-purple-500 to-pink-500' },
                  { label: 'Multiplier', value: `${multiplier.toFixed(1)}x`, icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
                  { label: 'Energy', value: `${energy}/${maxEnergy}`, icon: Zap, color: 'from-blue-500 to-cyan-500' },
                  { label: 'Referrals', value: referrals.toString(), icon: Users, color: 'from-rose-500 to-pink-500' },
                  { label: 'Referral Earnings', value: `${referralEarnings.toFixed(0)} ORE`, icon: Coins, color: 'from-indigo-500 to-purple-500' }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="mobile-card p-6 text-center"
                    >
                      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                      <div className="text-gray-300 text-sm">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className={`mobile-card p-6 ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30' 
                        : 'bg-gradient-to-r from-gray-900/30 to-gray-800/30 border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`text-4xl ${achievement.unlocked ? 'grayscale-0' : 'grayscale'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className={`text-lg font-bold ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
                            {achievement.name}
                          </h4>
                          {achievement.unlocked && (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <p className={`text-sm mb-3 ${achievement.unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                          {achievement.description}
                        </p>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              achievement.unlocked 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                : 'bg-gradient-to-r from-gray-500 to-gray-600'
                            }`}
                            style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {achievement.progress}/{achievement.target}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'marketplace' && (
              <div className="space-y-6">
                {/* Marketplace Tab Navigation */}
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-1 border border-purple-500/20">
                  <div className="grid grid-cols-2 gap-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMarketplaceTab('seller')}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all ${
                        marketplaceTab === 'seller'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span>Sales Transactions</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMarketplaceTab('buyer')}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all ${
                        marketplaceTab === 'buyer'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>Purchase History</span>
                    </motion.button>
                  </div>
                </div>

                {/* Marketplace Content */}
                {isLoadingMarketplace ? (
                  <div className="text-center py-12">
                    <div className="mobile-card p-8">
                      <ShoppingCart className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                      <div className="text-white text-xl font-bold">Loading Transactions...</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {marketplaceTab === 'seller' && (
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                          <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
                          Sales Transactions
                        </h3>
                        
                        {sellerTransactions.length === 0 ? (
                          <div className="mobile-card p-8 text-center">
                            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-xl font-bold text-white mb-2">No Sales Yet</h4>
                            <p className="text-gray-300">Your sales transactions will appear here</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {sellerTransactions.map((transaction) => (
                              <div key={transaction.id} className="mobile-card p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <div className="text-lg font-bold text-white mb-1">
                                      Sale to {transaction.buyer_username}
                                    </div>
                                    <div className="text-sm text-gray-300">
                                      {formatDate(transaction.created_at)}
                                    </div>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(transaction.status)}`}>
                                    {transaction.status.toUpperCase()}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <div className="text-sm text-gray-400">USDT Amount</div>
                                    <div className="text-xl font-bold text-white">${transaction.usdt_amount}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-400">Rupiah to Receive</div>
                                    <div className="text-xl font-bold text-green-400">
                                      Rp {transaction.seller_received.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-black/30 rounded-lg p-4 mb-4">
                                  <div className="text-sm font-bold text-white mb-2">Bank Transfer Details:</div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Bank:</span>
                                      <span className="text-white">{transaction.bank_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Account:</span>
                                      <span className="text-white">{transaction.bank_account_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Name:</span>
                                      <span className="text-white">{transaction.bank_account_name}</span>
                                    </div>
                                  </div>
                                </div>

                                {transaction.status === 'pending' && (
                                  <div className="flex space-x-3">
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleApproveTransaction(transaction.id)}
                                      className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white rounded-xl font-bold transition-all"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                      <span>Confirm Payment Received</span>
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleRejectTransaction(transaction.id)}
                                      className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white rounded-xl font-bold transition-all"
                                    >
                                      <XCircle className="w-5 h-5" />
                                      <span>Payment Not Received</span>
                                    </motion.button>
                                  </div>
                                )}

                                {/* Chat Button */}
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setShowChat(true);
                                  }}
                                  className="w-full flex items-center justify-center space-x-2 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white rounded-lg font-semibold transition-all mt-3"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>Chat with Buyer</span>
                                </motion.button>

                                {transaction.status === 'completed' && (
                                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 text-green-400 text-sm">
                                      <CheckCircle className="w-4 h-4" />
                                      <span>✅ Payment confirmed - USDT transferred to buyer</span>
                                    </div>
                                    {transaction.approved_at && (
                                      <div className="text-green-300 text-xs mt-1">
                                        Approved: {formatDate(transaction.approved_at)}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {transaction.status === 'cancelled' && (
                                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                                      <XCircle className="w-4 h-4" />
                                      <span>❌ Transaction cancelled - Stock returned to listing</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {marketplaceTab === 'buyer' && (
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                          <ShoppingCart className="w-6 h-6 mr-2 text-blue-400" />
                          Purchase History
                        </h3>
                        
                        {buyerTransactions.length === 0 ? (
                          <div className="mobile-card p-8 text-center">
                            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-xl font-bold text-white mb-2">No Purchases Yet</h4>
                            <p className="text-gray-300">Your purchase history will appear here</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {buyerTransactions.map((transaction) => (
                              <div key={transaction.id} className="mobile-card p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <div className="text-lg font-bold text-white mb-1">
                                      Purchase from {transaction.seller_username}
                                    </div>
                                    <div className="text-sm text-gray-300">
                                      {formatDate(transaction.created_at)}
                                    </div>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(transaction.status)}`}>
                                    {transaction.status.toUpperCase()}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <div className="text-sm text-gray-400">USDT Amount</div>
                                    <div className="text-xl font-bold text-white">${transaction.usdt_amount}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-400">Rupiah Paid</div>
                                    <div className="text-xl font-bold text-blue-400">
                                      Rp {transaction.total_rupiah_paid.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                {transaction.status === 'pending' && (
                                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                                    <div className="text-yellow-400 font-bold mb-2">💳 Transfer Instructions:</div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-300">Bank:</span>
                                        <span className="text-white font-bold">{transaction.bank_name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-300">Account Number:</span>
                                        <span className="text-white font-bold">{transaction.bank_account_number}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-300">Account Name:</span>
                                        <span className="text-white font-bold">{transaction.bank_account_name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-300">Amount to Transfer:</span>
                                        <span className="text-yellow-400 font-bold text-lg">
                                          Rp {transaction.total_rupiah_paid.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-yellow-500/30">
                                      <div className="flex items-center space-x-2 text-yellow-300 text-sm">
                                        <Clock className="w-4 h-4" />
                                        <span>Waiting for seller confirmation after your transfer</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Chat Button */}
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setShowChat(true);
                                  }}
                                  className="w-full flex items-center justify-center space-x-2 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white rounded-lg font-semibold transition-all mt-3"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>Chat with Seller</span>
                                </motion.button>

                                {transaction.status === 'completed' && (
                                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 text-green-400 text-sm mb-2">
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Transaction completed successfully!</span>
                                    </div>
                                    <div className="text-green-300 text-sm">
                                      ${transaction.usdt_amount} USDT has been added to your account.
                                    </div>
                                  </div>
                                )}

                                {transaction.status === 'cancelled' && (
                                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                                      <XCircle className="w-4 h-4" />
                                      <span>Transaction was cancelled by seller</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Mobile spacing for footer */}
      <div className="h-32 md:h-0"></div>

      {/* Chat Modal */}
      {selectedTransaction && (
        <MarketplaceChatModal
          isOpen={showChat}
          onClose={() => {
            setShowChat(false);
            setSelectedTransaction(null);
          }}
          transactionId={selectedTransaction.id}
          otherUserId={
            marketplaceTab === 'seller' 
              ? selectedTransaction.buyer_id 
              : selectedTransaction.seller_id
          }
          otherUsername={
            marketplaceTab === 'seller'
              ? selectedTransaction.buyer_username || 'Unknown Buyer'
              : selectedTransaction.seller_username || 'Unknown Seller'
          }
          transactionStatus={selectedTransaction.status}
        />
      )}
    </section>
  );
}

export default ProfilePage;