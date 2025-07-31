import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Clock, Star, TrendingUp, DollarSign, Users, Gift, Crown, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface PresaleEvent {
  id: string;
  event_number: number;
  price_per_bio: number;
  total_bio_available: number;
  bio_sold: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

function PresaleSection() {
  const { user } = useAuth();
  const { usdtBalance, refreshUserData } = useGame();
  const [currentEvent, setCurrentEvent] = useState<PresaleEvent | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [userPurchases, setUserPurchases] = useState<any[]>([]);
  const [presaleSettings, setPresaleSettings] = useState<any>({});
  const [realTimeSettings, setRealTimeSettings] = useState<any>({});

  // Fetch current presale event
  const fetchCurrentEvent = async () => {
    try {
      if (!isSupabaseConfigured()) {
        // Mock data for demo
        const mockEvent = {
          id: '1',
          event_number: 1,
          price_per_bio: 0.001,
          total_bio_available: 1000000,
          bio_sold: 150000,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        };
        setCurrentEvent(mockEvent);
        setIsLoading(false);
        return;
      }

      // Check if presale is enabled first
      const { data: presaleSettings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'presale_enabled')
        .maybeSingle();
      
      if (presaleSettings?.setting_value?.enabled === false) {
        setCurrentEvent(null);
        setIsLoading(false);
        return;
      }

      // Get active presale event from database
      const { data: activeEvents, error } = await supabase
        .from('presale_events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active presale event:', error);
        // Create default event if none exists
        const defaultEvent = {
          id: 'default',
          event_number: 1,
          price_per_bio: 0.001,
          total_bio_available: 1000000,
          bio_sold: 0,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        };
        setCurrentEvent(defaultEvent);
      } else if (activeEvents && activeEvents.length > 0) {
        setCurrentEvent(activeEvents[0]);
      } else {
        // Create default event if none exists
        const defaultEvent = {
          id: 'default',
          event_number: 1,
          price_per_bio: 0.001,
          total_bio_available: 1000000,
          bio_sold: 0,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        };
        setCurrentEvent(defaultEvent);
      }
    } catch (error) {
      console.error('Error fetching presale event:', error);
      // Fallback to default event
      const defaultEvent = {
        id: 'default',
        event_number: 1,
        price_per_bio: 0.001,
        total_bio_available: 1000000,
        bio_sold: 0,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };
      setCurrentEvent(defaultEvent);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time settings update listener
  const handleSettingsUpdate = async () => {
    console.log('🔄 Presale settings updated, refreshing...');
    await fetchCurrentEvent();
    
    // Update real-time settings for immediate UI response
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'presale_settings')
          .maybeSingle();
        
        if (data?.setting_value) {
          setRealTimeSettings(data.setting_value);
          
          // Update current event with new settings
          if (currentEvent) {
            setCurrentEvent(prev => prev ? {
              ...prev,
              price_per_bio: parseFloat(data.setting_value.price_per_bio) || prev.price_per_bio,
              total_bio_available: parseInt(data.setting_value.total_bio_available) || prev.total_bio_available,
              bio_sold: parseInt(data.setting_value.bio_sold) || prev.bio_sold
            } : null);
          }
        }
      } catch (error) {
        console.error('Error updating real-time settings:', error);
      }
    }
  };

  // Fetch user's purchase history
  const fetchUserPurchases = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      // Get user's purchase history from energy_purchases table
      const { data, error } = await supabase
        .from('energy_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('purchase_type', 'presale')
        .order('purchased_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching purchase history:', error);
        setUserPurchases([]);
      } else {
        setUserPurchases(data || []);
      }
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      setUserPurchases([]);
    }
  };

  // Update countdown timer
  useEffect(() => {
    if (!currentEvent || !currentEvent.is_active) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(currentEvent.end_date).getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentEvent]);

  // Load data on mount
  useEffect(() => {
    fetchCurrentEvent();
    if (user) {
      fetchUserPurchases();
    }

    // Listen for admin settings updates with real-time refresh
    window.addEventListener('presale-settings-updated', handleSettingsUpdate);
    window.addEventListener('presale-data-updated', handleSettingsUpdate);
    window.addEventListener('admin-settings-changed', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('presale-settings-updated', handleSettingsUpdate);
      window.removeEventListener('presale-data-updated', handleSettingsUpdate);
      window.removeEventListener('admin-settings-changed', handleSettingsUpdate);
    };
  }, [user, currentEvent]);

  // Handle purchase
  const handlePurchase = async () => {
    if (!user || !currentEvent) {
      toast.error('Please login first');
      return;
    }

    const amount = parseFloat(purchaseAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter valid purchase amount');
      return;
    }

    const totalCost = amount * currentEvent.price_per_bio;
    if (totalCost > usdtBalance) {
      toast.error('Insufficient USDT balance');
      return;
    }

    if (amount > (currentEvent.total_bio_available - currentEvent.bio_sold)) {
      toast.error('Not enough BIO tokens available');
      return;
    }

    setIsPurchasing(true);

    try {
      if (isSupabaseConfigured()) {
        // Use the presale purchase function
        const { data, error } = await supabase.rpc('process_presale_purchase', {
          p_user_id: user.id,
          p_bio_amount: amount,
          p_usdt_cost: totalCost
          });

        if (error) {
          console.error('Error processing purchase:', error);
          toast.error('Failed to process purchase');
          return;
        }

        if (data.success) {
          toast.success(`Successfully purchased ${amount} BIO tokens for $${totalCost.toFixed(2)} USDT!`);
          
          // Update current event display
          setCurrentEvent(prev => prev ? {
            ...prev,
            bio_sold: prev.bio_sold + amount
          } : null);
        } else {
          toast.error(data.message || 'Purchase failed');
          return;
        }
      }

      setPurchaseAmount('');
      
      // Refresh data
      setTimeout(() => {
        refreshUserData();
        fetchCurrentEvent();
        fetchUserPurchases();
      }, 1000);

    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Use real-time settings for calculations if available
  const activeSettings = realTimeSettings.price_per_bio ? realTimeSettings : (currentEvent || {});
  const currentPrice = parseFloat(activeSettings.price_per_bio) || 0.001;
  const currentSupply = parseInt(activeSettings.total_bio_available) || 1000000;
  const currentSold = parseInt(activeSettings.bio_sold) || 0;
  
  const progressPercentage = currentSupply > 0
    ? (currentSold / currentSupply) * 100 
    : 0;

  const bioAmount = parseFloat(purchaseAmount || '0');
  const totalCost = bioAmount * currentPrice;
  const remainingSupply = currentSupply - currentSold;

  if (isLoading) {
    return (
      <section className="min-h-full px-4 py-8 overflow-y-auto">
        <div className="container mx-auto text-center">
          <div className="mobile-card p-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <div className="text-white text-xl font-bold">Loading Presale...</div>
          </div>
        </div>
      </section>
    );
  }

  if (!currentEvent || !currentEvent.is_active) {
    return (
      <section className="min-h-full px-4 py-8 overflow-y-auto">
        <div className="container mx-auto text-center">
          <div className="mobile-card p-8 max-w-md mx-auto">
            <Coins className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse-glow" />
            <h3 className="text-xl font-bold text-white mb-2">🚀 Presale Coming Soon</h3>
            <p className="text-gray-300 mb-4">Presale event is being prepared by admin.</p>
            <div className="text-sm text-orange-300">
              Follow our announcements for presale launch!
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mb-4 neon-glow animate-pulse-glow">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">🚀 $BIO Token Presale</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Get exclusive early access to $BIO tokens at special presale prices. Limited time and quantity available!
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Presale Info */}
            <div className="space-y-6">
              {/* Event Info */}
              <div className="mobile-card p-8 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500/50">
                <div className="text-center mb-6">
                  <div className="text-3xl font-black text-white mb-2">
                    Presale Event #{currentEvent.event_number}
                  </div>
                  <div className="text-purple-300 font-bold">Exclusive Early Access</div>
                </div>

                {/* Countdown Timer */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { value: timeLeft.days, label: 'Days', color: 'from-purple-500 to-pink-500' },
                    { value: timeLeft.hours, label: 'Hours', color: 'from-cyan-500 to-blue-500' },
                    { value: timeLeft.minutes, label: 'Minutes', color: 'from-green-500 to-emerald-500' },
                    { value: timeLeft.seconds, label: 'Seconds', color: 'from-yellow-500 to-orange-500' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className={`mobile-card p-3 text-center bg-gradient-to-br ${item.color}/20 border-2 border-current/30`}
                    >
                      <motion.div 
                        className="text-2xl font-black text-white mb-1"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {String(item.value).padStart(2, '0')}
                      </motion.div>
                      <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">
                        {item.label}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-300 font-bold">Progress</span>
                    <span className="text-white font-bold">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                    <motion.div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full neon-glow"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>{currentSold.toLocaleString()} sold</span>
                    <span>{currentSupply.toLocaleString()} total</span>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl p-4 text-center border border-green-500/30">
                    <div className="text-2xl font-black text-white mb-1">${currentPrice.toFixed(3)}</div>
                    <div className="text-green-300 text-sm font-bold">Price per BIO</div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl p-4 text-center border border-blue-500/30">
                    <div className="text-2xl font-black text-white mb-1">
                      {remainingSupply.toLocaleString()}
                    </div>
                    <div className="text-blue-300 text-sm font-bold">BIO Available</div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="mobile-card p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-400" />
                  Presale Benefits
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: '🎯', title: 'Early Access', desc: 'Get BIO tokens before public launch' },
                    { icon: '💰', title: 'Discounted Price', desc: 'Lower price than future market value' },
                    { icon: '🔒', title: 'Guaranteed Allocation', desc: 'Secure your tokens now' },
                    { icon: '📈', title: 'Investment Potential', desc: 'Potential for price appreciation' }
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-3 bg-black/30 rounded-lg border border-purple-500/20"
                    >
                      <div className="text-2xl">{benefit.icon}</div>
                      <div>
                        <div className="text-white font-semibold text-sm">{benefit.title}</div>
                        <div className="text-gray-300 text-xs">{benefit.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Purchase Interface */}
            <div className="space-y-6">
              {/* USDT Balance */}
              <div className="mobile-card p-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-500/50">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="w-6 h-6 text-green-400 mr-2" />
                    <span className="text-green-300 font-bold">Your USDT Balance</span>
                  </div>
                  <div className="text-4xl font-black text-white mb-2">${usdtBalance.toFixed(2)}</div>
                  <div className="text-sm text-green-300">Available for presale</div>
                </div>
              </div>

              {/* Purchase Form */}
              <div className="mobile-card p-8">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">💎 Purchase BIO Tokens</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-purple-300 mb-2 font-bold">BIO Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        placeholder="Enter BIO amount"
                        step="0.01"
                        min="0"
                        max={remainingSupply}
                        className="w-full px-4 py-4 bg-black/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none text-lg font-bold"
                      />
                      <button
                        onClick={() => {
                          const maxAffordable = Math.floor(usdtBalance / currentPrice);
                          const maxAvailable = remainingSupply;
                          const maxPurchase = Math.min(maxAffordable, maxAvailable);
                          setPurchaseAmount(maxPurchase.toString());
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 text-sm font-bold bg-purple-500/20 px-3 py-1 rounded-lg"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Max available: {remainingSupply.toLocaleString()} BIO
                    </div>
                  </div>

                  {/* Cost Calculation */}
                  {bioAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-xl p-4 border border-cyan-500/30"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Total Cost:</span>
                        <span className="text-white font-bold text-xl">${totalCost.toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">{bioAmount} BIO × ${currentPrice.toFixed(3)}</span>
                        <span className={`font-bold ${totalCost <= usdtBalance ? 'text-green-400' : 'text-red-400'}`}>
                          {totalCost <= usdtBalance ? '✅ Affordable' : '❌ Insufficient funds'}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePurchase}
                    disabled={isPurchasing || !bioAmount || totalCost > usdtBalance || bioAmount > remainingSupply}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      isPurchasing || !bioAmount || totalCost > usdtBalance || bioAmount > remainingSupply
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white neon-glow'
                    }`}
                  >
                    {isPurchasing ? 'Processing Purchase...' : 
                     !bioAmount ? 'Enter BIO Amount' :
                     totalCost > usdtBalance ? 'Insufficient USDT' :
                     bioAmount > remainingSupply ? 'Exceeds Available' :
                     `Purchase ${bioAmount} BIO for $${totalCost.toFixed(2)}`}
                  </motion.button>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-yellow-400 text-sm font-semibold mb-2">⚠️ Important Notes</div>
                    <div className="text-yellow-300 text-xs space-y-1">
                      <div>• Presale purchases are final and non-refundable</div>
                      <div>• BIO tokens will be credited to your account immediately</div>
                      <div>• Withdrawal available after reaching BIO-5 level</div>
                      <div>• Limited quantity - first come, first served</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div className="mobile-card p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-purple-400" />
                  Your Purchases
                </h4>
                
                {userPurchases.length === 0 ? (
                  <div className="text-center py-6">
                    <Coins className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-400 text-sm">No purchases yet</div>
                    <div className="text-xs text-gray-500">Your presale purchases will appear here</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userPurchases.map((purchase, index) => (
                      <div key={index} className="bg-black/30 rounded-lg p-3 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold text-sm">{purchase.purchase_number} BIO</div>
                            <div className="text-xs text-gray-400">
                              {new Date(purchase.purchased_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold text-sm">${purchase.cost_usd}</div>
                            <div className="text-xs text-purple-300">Presale Purchase</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile spacing for footer */}
      <div className="h-32 md:h-0"></div>
    </section>
  );
}

export default PresaleSection;