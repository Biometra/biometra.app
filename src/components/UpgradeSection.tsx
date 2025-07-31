import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Zap, Target, Clock, Crown, DollarSign } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

function UpgradeSection() {
  const { user } = useAuth();
  const { usdtBalance, oreBalance, level, tapPower, multiplier, maxEnergy, autoTapActive, refreshUserData } = useGame();
  const [upgradePrices, setUpgradePrices] = React.useState({
    tap_power: 5.0,
    multiplier: 10.0,
    level: 15.0,
    max_energy: 3.0
  });
  const [autoTapPrices, setAutoTapPrices] = React.useState({
    1: 25.0,
    24: 250.0,
    168: 1250.0
  });
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch prices from admin settings
  React.useEffect(() => {
    const fetchPrices = async () => {
      if (!isSupabaseConfigured()) return;
      
      try {
        const { data: upgradeSettings } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'upgrade_prices')
          .maybeSingle();
        
        if (upgradeSettings?.setting_value) {
          setUpgradePrices(upgradeSettings.setting_value);
        }
        
        const { data: autoTapSettings } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'auto_tap_prices')
          .maybeSingle();
        
        if (autoTapSettings?.setting_value) {
          setAutoTapPrices(autoTapSettings.setting_value);
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };
    
    fetchPrices();
  }, []);

  const upgrades = [
    {
      id: 'tap_power',
      title: 'Mining Power',
      description: 'Increase ORE per tap',
      currentLevel: tapPower,
      cost: upgradePrices.tap_power,
      icon: Zap,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'multiplier',
      title: 'ORE Multiplier',
      description: 'Boost all ORE gains',
      currentLevel: multiplier.toFixed(1),
      cost: upgradePrices.multiplier,
      icon: Target,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'level',
      title: 'BIO Level',
      description: 'Unlock new features',
      currentLevel: level,
      cost: upgradePrices.level,
      icon: Crown,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'max_energy',
      title: 'Energy Capacity',
      description: 'Increase maximum energy',
      currentLevel: maxEnergy,
      cost: upgradePrices.max_energy,
      icon: Zap,
      color: 'from-cyan-500 to-blue-500'
    }
  ];

  const autoTapPackages = [
    { duration: 1, cost: autoTapPrices[1], label: '1 Hour' },
    { duration: 24, cost: autoTapPrices[24], label: '24 Hours' },
    { duration: 168, cost: autoTapPrices[168], label: '1 Week' }
  ];

  const handleUpgrade = async (upgradeType: string, costUSDT: number) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    
    if (usdtBalance < costUSDT) {
      toast.error('Insufficient USDT balance');
      return;
    }
    
    if (!isSupabaseConfigured()) {
      toast.error('Database not configured');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get current user data from database
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!userData) {
        toast.error('User data not found');
        return;
      }
      
      // Calculate new values
      let updateData: any = {
        usdt_balance: userData.usdt_balance - costUSDT,
        updated_at: new Date().toISOString()
      };
      
      if (upgradeType === 'tap_power') {
        updateData.tap_power = userData.tap_power + 1;
      } else if (upgradeType === 'multiplier') {
        updateData.multiplier = parseFloat(userData.multiplier) + 0.1;
      } else if (upgradeType === 'level') {
        updateData.level = userData.level + 1;
      } else if (upgradeType === 'max_energy') {
        updateData.max_energy = userData.max_energy + 20;
        updateData.energy = Math.min(userData.energy + 20, userData.max_energy + 20);
      }
      
      // Update database
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) {
        console.error('Error upgrading:', error);
        toast.error('Upgrade failed');
        return;
      }
      
      toast.success(`${upgradeType.replace('_', ' ')} upgraded successfully!`);
      refreshUserData();
      
    } catch (error) {
      console.error('Error upgrading:', error);
      toast.error('Upgrade failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTapPurchase = async (duration: number, costUSDT: number) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    
    if (usdtBalance < costUSDT) {
      toast.error('Insufficient USDT balance');
      return;
    }
    
    if (!isSupabaseConfigured()) {
      toast.error('Database not configured');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get current user data from database
      const { data: userData } = await supabase
        .from('users')
        .select('usdt_balance, auto_tap_expires')
        .eq('id', user.id)
        .single();
      
      if (!userData) {
        toast.error('User data not found');
        return;
      }
      
      // Calculate expiry time
      const now = new Date();
      const currentExpiry = userData.auto_tap_expires ? new Date(userData.auto_tap_expires) : now;
      const startTime = currentExpiry > now ? currentExpiry : now;
      const expiresAt = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      
      // Update database
      const { error } = await supabase
        .from('users')
        .update({
          usdt_balance: userData.usdt_balance - costUSDT,
          auto_tap_expires: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error purchasing auto-tap:', error);
        toast.error('Purchase failed');
        return;
      }
      
      toast.success(`Auto-tap activated for ${duration} hours!`);
      refreshUserData();
      
    } catch (error) {
      console.error('Error purchasing auto-tap:', error);
      toast.error('Purchase failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Upgrade Your Mining</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Enhance your mining capabilities with USDT payments. All upgrades are permanent and boost your mining power.
          </p>
        </div>

        {/* USDT Balance Display */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30 text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="w-6 h-6 text-green-400 mr-2" />
              <span className="text-green-300 font-bold">USDT Balance</span>
            </div>
            <div className="text-3xl font-black text-white mb-2">${usdtBalance.toFixed(2)}</div>
            <div className="text-sm text-green-300">Available for upgrades</div>
          </div>
        </div>

        {/* Upgrade Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {upgrades.map((upgradeItem, index) => {
            const Icon = upgradeItem.icon;
            const canAfford = usdtBalance >= upgradeItem.cost;
            
            return (
              <motion.div
                key={upgradeItem.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${upgradeItem.color} rounded-lg mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{upgradeItem.title}</h3>
                <p className="text-gray-300 text-sm mb-4">{upgradeItem.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-purple-300">Current Level</span>
                  <span className="text-white font-bold">{upgradeItem.currentLevel}</span>
                </div>
                
                <div className="flex justify-between items-center mb-6">
                  <span className="text-purple-300">Upgrade Cost</span>
                  <span className="text-green-400 font-bold">${upgradeItem.cost} USDT</span>
                </div>
                
                <motion.button
                  whileHover={{ scale: canAfford ? 1.02 : 1 }}
                  whileTap={{ scale: canAfford ? 0.98 : 1 }}
                  onClick={() => handleUpgrade(upgradeItem.id, upgradeItem.cost)}
                  disabled={!canAfford || isLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                    canAfford && !isLoading
                      ? `bg-gradient-to-r ${upgradeItem.color} hover:opacity-90 text-white`
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>{isLoading ? 'Processing...' : 'Upgrade'}</span>
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Auto-Tap Section */}
        <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Auto-Tap Mining</h3>
            <p className="text-gray-300 max-w-md mx-auto">
              Activate automated mining to earn ORE even when you're offline. Pay with USDT for premium mining.
            </p>
            {autoTapActive && (
              <div className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 inline-block">
                ⚡ Auto-Tap Currently Active
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {autoTapPackages.map((pkg, index) => (
              <motion.div
                key={pkg.duration}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 text-center"
              >
                <div className="text-2xl font-bold text-white mb-2">{pkg.label}</div>
                <div className="text-purple-300 mb-4">Auto-Mining</div>
                <div className="text-3xl font-bold text-green-400 mb-6">${pkg.cost} USDT</div>
                
                <motion.button
                  whileHover={{ scale: oreBalance >= pkg.cost ? 1.02 : 1 }}
                  whileTap={{ scale: oreBalance >= pkg.cost ? 0.98 : 1 }}
                  onClick={() => handleAutoTapPurchase(pkg.duration, pkg.cost)}
                  disabled={usdtBalance < pkg.cost || autoTapActive || isLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    usdtBalance >= pkg.cost && !autoTapActive && !isLoading
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Processing...' : autoTapActive ? '⚡ Active' : 'Purchase'}
                </motion.button>
              </motion.div>
            ))}
          </div>
          
          {/* Payment Info */}
          <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
            <h4 className="text-lg font-bold text-white mb-3">💳 Payment Information</h4>
            <div className="space-y-2 text-sm text-blue-300">
              <div>• All upgrades are paid with USDT</div>
              <div>• Prices can be adjusted by admin</div>
              <div>• All upgrades are permanent</div>
              <div>• Auto-tap time stacks if already active</div>
            </div>
          </div>
        </div>
        
        {/* Mobile spacing for footer */}
        <div className="h-32 md:h-0"></div>
      </div>
    </section>
  );
}

export default UpgradeSection;