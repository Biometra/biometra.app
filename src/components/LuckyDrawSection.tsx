import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Clock, Trophy, Zap, Battery, Crown, Star, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Prize {
  id: string;
  name: string;
  type: string;
  value: number;
  rarity: string;
  probability: number;
  icon: string;
  color: string;
}

interface DrawHistory {
  id: string;
  prize_name: string;
  prize_type: string;
  prize_value: number;
  created_at: string;
}

function LuckyDrawSection() {
  const { user } = useAuth();
  const { oreBalance, refreshUserData } = useGame();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [drawHistory, setDrawHistory] = useState<DrawHistory[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [drawCost, setDrawCost] = useState(100);
  const [lastDrawTime, setLastDrawTime] = useState<Date | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clawPosition, setClawPosition] = useState({ x: 50, y: 20 });
  const [selectedPrizeIndex, setSelectedPrizeIndex] = useState(0);
  const [totalDraws, setTotalDraws] = useState(0);
  const [totalOreWon, setTotalOreWon] = useState(0);
  const [machineState, setMachineState] = useState<'idle' | 'moving' | 'grabbing' | 'lifting' | 'dropping'>('idle');
  const [instantDrawCost, setInstantDrawCost] = useState(25000); // 25,000 ORE for instant draw

  // Fetch prizes and settings
  const fetchPrizesAndSettings = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data for demo
      setPrizes([
        { id: '1', name: '+1 Tap Power', type: 'tap_power', value: 1, rarity: 'common', probability: 0.30, icon: '💪', color: 'from-blue-400 to-blue-600' },
        { id: '2', name: '+50 Max Energy', type: 'max_energy', value: 50, rarity: 'common', probability: 0.25, icon: '🔋', color: 'from-green-400 to-green-600' },
        { id: '3', name: '+0.5x Multiplier', type: 'multiplier', value: 0.5, rarity: 'rare', probability: 0.20, icon: '⚡', color: 'from-purple-400 to-purple-600' },
        { id: '4', name: '+2 Tap Power', type: 'tap_power', value: 2, rarity: 'rare', probability: 0.15, icon: '💎', color: 'from-pink-400 to-rose-500' },
        { id: '5', name: '+1.0x Multiplier', type: 'multiplier', value: 1.0, rarity: 'epic', probability: 0.08, icon: '🌟', color: 'from-yellow-400 to-orange-500' },
        { id: '6', name: '+3 Tap Power', type: 'tap_power', value: 3, rarity: 'legendary', probability: 0.02, icon: '👑', color: 'from-yellow-300 to-yellow-500' }
      ]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch prizes
      const { data: prizesData, error: prizesError } = await supabase
        .from('claw_machine_prizes')
        .select('*')
        .eq('is_active', true)
        .order('probability', { ascending: false });

      if (prizesError) {
        console.error('Error fetching prizes:', prizesError);
      } else {
        setPrizes(prizesData || []);
      }

      // Fetch draw cost from admin settings
      const { data: settingsData } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'claw_machine_settings')
        .single();

      if (settingsData?.setting_value) {
        setDrawCost(settingsData.setting_value.draw_cost || 100);
        setInstantDrawCost(settingsData.setting_value.instant_cost || 25000);
      }

      // Fetch user's last draw time from database
      if (user) {
        // Always check localStorage first for immediate response
        const storedLastDraw = localStorage.getItem(`lastDraw_${user.id}`);
        if (storedLastDraw) {
          setLastDrawTime(new Date(storedLastDraw));
        }
        
        const { data: historyData } = await supabase
          .from('claw_machine_history')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (historyData && historyData.length > 0) {
          const dbLastDrawTime = new Date(historyData[0].created_at);
          setLastDrawTime(dbLastDrawTime);
          
          // Update localStorage with database time
          localStorage.setItem(`lastDraw_${user.id}`, dbLastDrawTime.toISOString());
        }
      }
    } catch (error) {
      console.error('Error fetching claw machine data:', error);
    }
    
    setIsLoading(false);
  };

  // Fetch draw history and stats
  const fetchDrawHistory = async () => {
    if (!user) {
      return;
    }

    if (!isSupabaseConfigured()) {
      // Mock data for demo
      const mockHistory = [
        { id: '1', prize_name: '+1 Tap Power', prize_type: 'tap_power', prize_value: 1, created_at: new Date().toISOString() },
        { id: '2', prize_name: '+50 Max Energy', prize_type: 'max_energy', prize_value: 50, created_at: new Date(Date.now() - 86400000).toISOString() }
      ];
      setDrawHistory(mockHistory);
      setTotalDraws(mockHistory.length);
      setTotalOreWon(300);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('claw_machine_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching draw history:', error);
      } else {
        setDrawHistory(data || []);
        setTotalDraws(data?.length || 0);
        
        // Calculate total ORE equivalent won
        const totalOre = (data || []).reduce((sum, draw) => {
          if (draw.prize_type === 'tap_power') return sum + (draw.prize_value * 100);
          if (draw.prize_type === 'multiplier') return sum + (draw.prize_value * 200);
          if (draw.prize_type === 'max_energy') return sum + (draw.prize_value * 2);
          return sum + (draw.prize_value || 0);
        }, 0);
        setTotalOreWon(totalOre);
      }
    } catch (error) {
      console.error('Error fetching draw history:', error);
      setDrawHistory([]);
      setTotalDraws(0);
    }
  };

  // Persistent cooldown timer (24 hours)
  useEffect(() => {
    if (!lastDrawTime || !user) return;

    const updateCooldown = () => {
      const now = new Date();
      const timeSinceLastDraw = now.getTime() - lastDrawTime.getTime();
      const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
      const remaining = Math.max(0, cooldownMs - timeSinceLastDraw);
      
      setCooldownRemaining(Math.ceil(remaining / 1000));
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastDrawTime, user]);

  // Load data on mount
  useEffect(() => {
    fetchPrizesAndSettings();
    if (user) {
      fetchDrawHistory();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDrawHistory();
    }
  }, [user, isSupabaseConfigured]);

  // Weighted random selection
  const selectRandomPrize = (): { prize: Prize; index: number } => {
    const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
    let random = Math.random() * totalProbability;
    
    for (let i = 0; i < prizes.length; i++) {
      random -= prizes[i].probability;
      if (random <= 0) {
        return { prize: prizes[i], index: i };
      }
    }
    
    return { prize: prizes[0], index: 0 }; // Fallback
  };

  // Handle claw machine play with animation sequence
  const handleClawMachine = async (isInstantDraw = false) => {
    const requiredCost = isInstantDraw ? instantDrawCost : drawCost;
    
    if (!user) {
      toast.error('Please login first');
      return;
    }
    
    if (oreBalance < requiredCost) {
      toast.error(`Insufficient ORE balance (need ${requiredCost.toLocaleString()} ORE)`);
      return;
    }
    
    if (cooldownRemaining > 0 && !isInstantDraw) {
      const hours = Math.floor(cooldownRemaining / 3600);
      const minutes = Math.floor((cooldownRemaining % 3600) / 60);
      toast.error(`Daily cooldown active! Wait ${hours}h ${minutes}m`);
      return;
    }

    setIsPlaying(true);

    try {
      // Deduct cost first
      if (isSupabaseConfigured()) {
        const { error: deductError } = await supabase
          .from('users')
          .update({ 
            ore_balance: oreBalance - requiredCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (deductError) {
          toast.error('Failed to process play');
          setIsPlaying(false);
          return;
        }
      }

      // Select prize and target position
      const { prize: selectedPrize, index } = selectRandomPrize();
      setSelectedPrizeIndex(index);
      
      // Calculate target position for claw
      const cols = 3;
      const rows = Math.ceil(prizes.length / cols);
      const col = index % cols;
      const row = Math.floor(index / cols);
      const targetX = 20 + (col * 25); // 20%, 45%, 70%
      const targetY = 30 + (row * 20); // 30%, 50%, 70%

      // Claw machine animation sequence
      setMachineState('moving');
      setClawPosition({ x: targetX, y: 20 });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Move to position
      
      setMachineState('grabbing');
      setClawPosition({ x: targetX, y: targetY });
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Grab prize
      
      setMachineState('lifting');
      setClawPosition({ x: targetX, y: 20 });
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Lift up
      
      setMachineState('dropping');
      setClawPosition({ x: 50, y: 20 }); // Move to drop zone
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Move to drop

      setWonPrize(selectedPrize);

      // Apply prize to user equipment
      await applyPrizeToUser(selectedPrize);

      // Record in history and update last draw time
      const drawTime = new Date();
      if (isSupabaseConfigured()) {
        const { error: historyError } = await supabase
          .from('claw_machine_history')
          .insert({
            user_id: user.id,
            prize_id: selectedPrize.id,
            prize_name: selectedPrize.name,
            prize_type: selectedPrize.type,
            prize_value: selectedPrize.value,
            ore_cost: requiredCost,
            is_instant_play: isInstantDraw
          });
        
        if (historyError) {
          console.error('Error recording draw history:', historyError);
        }
      }

      // Update last draw time in state and localStorage
      if (!isInstantDraw) {
        setLastDrawTime(drawTime);
        localStorage.setItem(`lastDraw_${user.id}`, drawTime.toISOString());
      }
      
      setShowResult(true);
      setMachineState('idle');
      
      // Refresh user data and history
      setTimeout(() => {
        refreshUserData();
        fetchDrawHistory();
      }, 1000);

    } catch (error) {
      console.error('Error processing claw machine:', error);
      toast.error('Claw machine failed');
      setMachineState('idle');
    } finally {
      setIsPlaying(false);
    }
  };

  // Handle instant play (skip cooldown for 25,000 ORE)
  const handleInstantPlay = async () => {
    await handleClawMachine(true); // Pass true for instant play
  };

  // Apply prize directly to user's mining equipment
  const applyPrizeToUser = async (prize: Prize) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      // Get current user stats
      const { data: currentUser } = await supabase
        .from('users')
        .select('tap_power, multiplier, max_energy, energy')
        .eq('id', user.id)
        .single();

      if (!currentUser) return;

      let updateData: any = { updated_at: new Date().toISOString() };

      switch (prize.type) {
        case 'tap_power':
          updateData.tap_power = (currentUser.tap_power || 1) + prize.value;
          toast.success(`🎉 Mining Power Upgraded! +${prize.value} Tap Power!`);
          break;
        case 'multiplier':
          updateData.multiplier = (currentUser.multiplier || 1.0) + prize.value;
          toast.success(`🎉 Multiplier Boosted! +${prize.value}x Multiplier!`);
          break;
        case 'max_energy':
          const newMaxEnergy = (currentUser.max_energy || 100) + prize.value;
          updateData.max_energy = newMaxEnergy;
          updateData.energy = Math.min((currentUser.energy || 100) + prize.value, newMaxEnergy);
          toast.success(`🎉 Energy Capacity Increased! +${prize.value} Max Energy!`);
          break;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error applying prize:', error);
        toast.error('Failed to apply prize');
      }
    } catch (error) {
      console.error('Error applying prize:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-purple-400 to-purple-600';
      case 'epic': return 'from-pink-400 to-rose-500';
      case 'legendary': return 'from-yellow-300 to-yellow-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const formatCooldown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  if (!user) {
    return (
      <section className="flex flex-col justify-center min-h-full px-4 py-8">
        <div className="container mx-auto text-center">
          <div className="mobile-card p-8 max-w-md mx-auto">
            <Gift className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Claw Machine</h3>
            <p className="text-gray-300">Login to play the claw machine!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">🎮 Claw Machine</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Play the claw machine daily to grab mining equipment upgrades! Each play costs {drawCost} ORE.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Claw Machine */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">🎯 Grab a Prize!</h3>
              
              {/* Claw Machine Container */}
              <div className="relative bg-gradient-to-b from-red-600 via-red-700 to-red-800 rounded-3xl p-8 border-4 border-yellow-400 shadow-2xl overflow-hidden">
                {/* Machine Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-red-900/40 rounded-3xl"></div>
                
                {/* Glass Front */}
                <div className="absolute inset-4 bg-gradient-to-br from-cyan-100/10 to-blue-200/5 rounded-2xl border-2 border-cyan-300/30 backdrop-blur-sm"></div>
                
                {/* Machine Header */}
                <div className="relative z-10 text-center mb-6">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-2xl py-3 px-6 rounded-xl border-4 border-yellow-300 shadow-lg">
                    🎮 CLAW MACHINE 🎮
                  </div>
                </div>

                {/* Claw Mechanism */}
                <div className="relative h-80 mb-6 overflow-hidden">
                  {/* Top Rail */}
                  <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full border-2 border-gray-500 shadow-lg"></div>
                  
                  {/* Claw */}
                  <motion.div
                    className="absolute z-30"
                    animate={{
                      left: `${clawPosition.x}%`,
                      top: `${clawPosition.y}%`
                    }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    style={{ transform: 'translate(-50%, -50%)' }}
                  >
                    {/* Claw Cable */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-400 shadow-lg" 
                         style={{ height: `${clawPosition.y * 3}px` }}></div>
                    
                    {/* Claw Body */}
                    <div className="relative">
                      <div className="w-12 h-8 bg-gradient-to-b from-gray-300 to-gray-600 rounded-t-lg border-2 border-gray-400 shadow-xl">
                        <div className="absolute inset-1 bg-gradient-to-b from-gray-100 to-gray-400 rounded-t-md"></div>
                      </div>
                      
                      {/* Claw Arms */}
                      <motion.div
                        className="flex justify-center"
                        animate={{
                          scale: machineState === 'grabbing' ? 0.8 : 1
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-gray-500 mr-1"></div>
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-gray-500"></div>
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-gray-500 ml-1"></div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Prize Display Area */}
                  <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/40 to-transparent rounded-b-2xl p-4">
                    <div className="grid grid-cols-3 gap-4 h-full">
                      {prizes.slice(0, 9).map((prize, index) => (
                        <motion.div
                          key={prize.id}
                          className={`relative bg-gradient-to-br ${prize.color} rounded-xl p-3 border-2 border-white/30 shadow-lg flex flex-col items-center justify-center text-center`}
                          animate={{
                            scale: selectedPrizeIndex === index && machineState === 'grabbing' ? 1.1 : 1,
                            y: selectedPrizeIndex === index && machineState === 'lifting' ? -20 : 0
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          {/* Prize Glow Effect */}
                          {selectedPrizeIndex === index && machineState !== 'idle' && (
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl blur-sm opacity-75 animate-pulse"></div>
                          )}
                          
                          <div className="relative z-10">
                            <div className="text-2xl mb-1">{prize.icon}</div>
                            <div className="text-xs font-bold text-white">{prize.name.length > 8 ? prize.name.substring(0, 8) + '...' : prize.name}</div>
                            <div className="text-xs text-yellow-200 font-bold">{(prize.probability * 100).toFixed(1)}%</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div className="absolute bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl border-4 border-green-300 flex items-center justify-center shadow-lg">
                    <div className="text-white font-bold text-xs text-center">DROP<br/>ZONE</div>
                  </div>
                </div>

                {/* Control Panel */}
                <div className="relative z-10 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-4 border-4 border-gray-600">
                  <div className="flex justify-center space-x-4">
                    {/* Play Button */}
                    <motion.button
                      whileHover={{ 
                        scale: cooldownRemaining === 0 && oreBalance >= drawCost ? 1.05 : 1,
                        boxShadow: cooldownRemaining === 0 && oreBalance >= drawCost ? "0 0 30px rgba(34, 197, 94, 0.8)" : "none"
                      }}
                      whileTap={{ scale: cooldownRemaining === 0 && oreBalance >= drawCost ? 0.95 : 1 }}
                      onClick={() => handleClawMachine()}
                      disabled={isPlaying || cooldownRemaining > 0 || oreBalance < drawCost}
                      className={`px-8 py-4 rounded-xl font-black text-lg transition-all duration-300 relative overflow-hidden border-4 ${
                        isPlaying
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white cursor-not-allowed border-purple-400'
                          : cooldownRemaining > 0
                            ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 cursor-not-allowed border-gray-500'
                            : oreBalance < drawCost
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white cursor-not-allowed border-red-400'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white border-green-400'
                      }`}
                    >
                      <div className="relative z-10 flex items-center justify-center">
                        {isPlaying ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="inline-block mr-2"
                            >
                              <Sparkles className="w-6 h-6" />
                            </motion.div>
                            <span>PLAYING...</span>
                          </>
                        ) : cooldownRemaining > 0 ? (
                          <>
                            <Clock className="w-6 h-6 inline mr-2" />
                            <span>{formatCooldown(cooldownRemaining)}</span>
                          </>
                        ) : oreBalance < drawCost ? (
                          <>
                            <Zap className="w-6 h-6 inline mr-2" />
                            <span>NEED {drawCost} ORE</span>
                          </>
                        ) : (
                          <>
                            <Gift className="w-6 h-6 inline mr-2" />
                            <span>PLAY ({drawCost} ORE)</span>
                          </>
                        )}
                      </div>
                    </motion.button>

                    {/* Instant Play Button */}
                    {cooldownRemaining > 0 && (
                      <motion.button
                        whileHover={{ 
                          scale: oreBalance >= instantDrawCost ? 1.05 : 1,
                          boxShadow: oreBalance >= instantDrawCost ? "0 0 30px rgba(251, 191, 36, 0.8)" : "none"
                        }}
                        whileTap={{ scale: oreBalance >= instantDrawCost ? 0.95 : 1 }}
                        onClick={() => handleInstantPlay()}
                        disabled={isPlaying || oreBalance < instantDrawCost}
                        className={`px-6 py-4 rounded-xl font-black text-sm transition-all duration-300 relative overflow-hidden border-4 ${
                          isPlaying
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white cursor-not-allowed border-purple-400'
                            : oreBalance < instantDrawCost
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white cursor-not-allowed border-red-400'
                              : 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white border-orange-400'
                        }`}
                      >
                        <div className="relative z-10 flex items-center justify-center">
                          {isPlaying ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="inline-block mr-1"
                              >
                                <Sparkles className="w-4 h-4" />
                              </motion.div>
                              <span>PLAYING...</span>
                            </>
                          ) : oreBalance < instantDrawCost ? (
                            <>
                              <Zap className="w-4 h-4 inline mr-1" />
                              <span>NEED {instantDrawCost.toLocaleString()}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 inline mr-1" />
                              <span>INSTANT ({instantDrawCost.toLocaleString()})</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Balance */}
              <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-2xl p-6 border-2 border-yellow-500/40 text-center">
                <div className="text-yellow-400 font-bold mb-2 text-lg">💰 Your ORE Balance</div>
                <div className="text-4xl font-black text-white mb-2">{oreBalance.toFixed(0)}</div>
                <div className="text-yellow-300 text-sm font-semibold">Ready to play the claw machine!</div>
              </div>
            </div>

            {/* Stats and History Sidebar */}
            <div className="space-y-6">
              {/* Your Stats */}
              <div className="mobile-card p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  Your Stats
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Plays</span>
                    <span className="text-white font-bold">{totalDraws}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Equipment Value</span>
                    <span className="text-green-400 font-bold">{totalOreWon.toLocaleString()} ORE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Next Play</span>
                    <span className={`font-bold ${cooldownRemaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {cooldownRemaining > 0 ? formatCooldown(cooldownRemaining) : 'Available!'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Plays */}
              <div className="mobile-card p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-purple-400" />
                  Recent Plays
                </h4>
                {drawHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-400">No plays yet</div>
                    <div className="text-sm text-gray-500">Play the claw machine!</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {drawHistory.map((draw, index) => (
                      <div key={draw.id} className="bg-black/30 rounded-lg p-3 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold text-sm">{draw.prize_name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(draw.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold text-sm">
                              {draw.prize_type === 'tap_power' && `+${draw.prize_value} Power`}
                              {draw.prize_type === 'multiplier' && `+${draw.prize_value}x Multi`}
                              {draw.prize_type === 'max_energy' && `+${draw.prize_value} Energy`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prize Pool */}
              <div className="mobile-card p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-cyan-400" />
                  Available Prizes
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {prizes.map((prize, index) => (
                    <div
                      key={prize.id}
                      className={`flex items-center justify-between p-2 rounded-lg bg-gradient-to-r ${getRarityColor(prize.rarity)}/20 border border-current/30`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{prize.icon}</span>
                        <div>
                          <div className="text-white font-semibold text-xs">{prize.name}</div>
                          <div className="text-xs text-gray-300 capitalize">{prize.rarity}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xs">{(prize.probability * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                <h4 className="text-lg font-bold text-white mb-3">🎮 Machine Info</h4>
                <div className="space-y-2 text-sm text-blue-300">
                  <div>• Play once every 24 hours</div>
                  <div>• Pay {instantDrawCost.toLocaleString()} ORE to skip cooldown</div>
                  <div>• All prizes upgrade your mining equipment</div>
                  <div>• Higher rarity = better upgrades</div>
                  <div>• Upgrades are permanent!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile spacing for footer */}
      <div className="h-32 md:h-0"></div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && wonPrize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mobile-card p-10 w-full max-w-lg text-center relative overflow-hidden border-4 border-yellow-400/50"
            >
              <div className="relative z-10">
                <motion.h3 
                  className="text-4xl font-black text-white mb-3"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🎉 PRIZE GRABBED! 🎉
                </motion.h3>
                <p className="text-xl text-purple-300 font-bold">Equipment Upgraded Successfully!</p>
              </div>

              <div className={`w-32 h-32 bg-gradient-to-br ${wonPrize.color} rounded-full flex items-center justify-center mx-auto mb-6 neon-glow animate-pulse-glow relative border-4 border-white/30`}>
                <span className="text-6xl relative z-10">{wonPrize.icon}</span>
              </div>

              <div className={`bg-gradient-to-br ${wonPrize.color}/30 rounded-3xl p-8 border-2 border-current/50 mb-8`}>
                <div className="text-3xl font-black text-white mb-3">{wonPrize.name}</div>
                <div className="text-lg text-purple-300 capitalize font-bold mb-4 bg-black/20 rounded-full px-4 py-2 inline-block">
                  ✨ {wonPrize.rarity} Upgrade ✨
                </div>
                <div className="text-2xl font-black text-green-400">
                  {wonPrize.type === 'tap_power' && `+${wonPrize.value} Mining Power`}
                  {wonPrize.type === 'multiplier' && `+${wonPrize.value}x Multiplier`}
                  {wonPrize.type === 'max_energy' && `+${wonPrize.value} Max Energy`}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResult(false)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-90 text-white rounded-2xl font-black text-xl transition-all neon-glow border-2 border-purple-400"
              >
                <span className="tracking-wider">Continue Mining! 🚀</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default LuckyDrawSection;