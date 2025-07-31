import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import toast from 'react-hot-toast';

interface GameContextType {
  oreBalance: number;
  bioBalance: number;
  usdtBalance: number;
  level: number;
  totalTaps: number;
  tapPower: number;
  multiplier: number;
  energy: number;
  maxEnergy: number;
  autoTapActive: boolean;
  autoTapExpires: Date | null;
  referrals: number;
  referralEarnings: number;
  tap: () => void;
  upgrade: (type: string, cost: number) => Promise<void>;
  purchaseAutoTap: (duration: number, cost: number) => Promise<void>;
  swapToBio: (oreAmount: number) => Promise<void>;
  depositUSDT: (amount: number, txHash?: string) => Promise<void>;
  withdrawBIO: (amount: number, address: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { wallet, isConnected } = useWallet();
  const [oreBalance, setOreBalance] = useState(0);
  const [bioBalance, setBioBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalTaps, setTotalTaps] = useState(0);
  const [tapPower, setTapPower] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [autoTapActive, setAutoTapActive] = useState(false);
  const [autoTapExpires, setAutoTapExpires] = useState<Date | null>(null);
  const [referrals, setReferrals] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastWallet, setLastWallet] = useState<string | null>(null);
  const [energyRefillCountdown, setEnergyRefillCountdown] = useState(30);

  // Reset state when wallet changes
  useEffect(() => {
    if (wallet !== lastWallet) {
      // Don't reset energy when wallet changes - let refreshUserData handle it
      setLastWallet(wallet);
    }
  }, [wallet, lastWallet]);

  const refreshUserData = useCallback(async () => {
    if (!user || !isAuthenticated) {
      console.log('❌ No user or not authenticated, skipping data refresh');
      return;
    }

    setIsLoading(true);
    console.log(`🔄 Refreshing user data for: ${user.id}`);

    try {
      if (!isSupabaseConfigured()) {
        console.log('❌ Supabase not configured');
        setIsLoading(false);
        return;
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .select(`
          id,
          referral_code,
          ore_balance,
          bio_balance,
          usdt_balance,
          level,
          total_taps,
          tap_power,
          multiplier,
          energy,
          max_energy,
          last_energy_update,
          referrals,
          referral_earnings,
          auto_tap_expires,
          referred_by_user_id
        `)
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user data:', error);
        console.log('⚠️ Database connection issue');
        setIsLoading(false);
        return;
      }

      if (dbUser) {
        console.log(`✅ User data loaded for: ${dbUser.id}`, {
          ore_balance: dbUser.ore_balance,
          bio_balance: dbUser.bio_balance,
          level: dbUser.level
        });
        
        // Ensure numeric values are properly parsed
        setOreBalance(parseFloat(dbUser.ore_balance) || 0);
        setBioBalance(parseFloat(dbUser.bio_balance) || 0);
        setUsdtBalance(parseFloat(dbUser.usdt_balance) || 0);
        setLevel(parseInt(dbUser.level) || 1);
        setTotalTaps(parseInt(dbUser.total_taps) || 0);
        setTapPower(parseInt(dbUser.tap_power) || 1);
        setMultiplier(parseFloat(dbUser.multiplier) || 1.0);
        setEnergy(parseInt(dbUser.energy) || 100);
        setMaxEnergy(parseInt(dbUser.max_energy) || 100);
        setReferrals(parseInt(dbUser.referrals) || 0);
        setReferralEarnings(parseFloat(dbUser.referral_earnings) || 0);
        
        console.log('📊 Referral stats loaded:', {
          referrals: parseInt(dbUser.referrals) || 0,
          referral_earnings: parseFloat(dbUser.referral_earnings) || 0
        });
        
        // Calculate energy regeneration
        const energyResult = calculateEnergyRegeneration(dbUser);
        
        // Only update energy if it actually changed
        if (energyResult.newEnergy !== parseInt(dbUser.energy)) {
          setEnergy(energyResult.newEnergy);
        } else {
          setEnergy(parseInt(dbUser.energy) || 0);
        }
        
        // Update database if energy regenerated
        if (energyResult.shouldUpdate) {
          const now = new Date();
          await supabase
            .from('users')
            .update({ 
              energy: energyResult.newEnergy,
              last_energy_update: now.toISOString() 
            })
            .eq('id', user.id);
        }
        
        // Set countdown for next energy refill
        if (energyResult.secondsPassed !== undefined && energyResult.secondsPassed >= 0) {
          const remainingSeconds = 30 - (energyResult.secondsPassed % 30);
          setEnergyRefillCountdown(remainingSeconds > 0 ? remainingSeconds : 30);
        } else {
          // First time or no last update, set initial values
          const now = new Date();
          await supabase
            .from('users')
            .update({ last_energy_update: now.toISOString() })
            .eq('id', user.id);
          setEnergyRefillCountdown(30);
        }
        
        if (dbUser.auto_tap_expires) {
          const expiresAt = new Date(dbUser.auto_tap_expires);
          if (expiresAt > new Date()) {
            setAutoTapActive(true);
            setAutoTapExpires(expiresAt);
            console.log(`⚡ Auto-tap active until: ${expiresAt}`);
          } else {
            setAutoTapActive(false);
            setAutoTapExpires(null);
            // Update database to clear expired auto-tap
            await supabase
              .from('users')
              .update({ auto_tap_expires: null })
              .eq('id', dbUser.id);
          }
        } else {
          setAutoTapActive(false);
          setAutoTapExpires(null);
        }
      } else {
        console.log(`❌ User not found in database: ${user.id}`);
        // This shouldn't happen with the new auth system
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Calculate energy regeneration based on time passed
  const calculateEnergyRegeneration = (dbUser: any) => {
    if (!dbUser.last_energy_update) {
      return { 
        newEnergy: parseInt(dbUser.energy) || 0, 
        shouldUpdate: false,
        secondsPassed: 0
      };
    }

    const lastUpdate = new Date(dbUser.last_energy_update);
    const now = new Date();
    const secondsPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    
    if (secondsPassed < 30) {
      // Not enough time passed for regeneration
      return { 
        newEnergy: parseInt(dbUser.energy) || 0, 
        shouldUpdate: false,
        secondsPassed 
      };
    }

    const energyToRegenerate = Math.floor(secondsPassed / 30); // 1 energy per 30 seconds
    const currentEnergy = parseInt(dbUser.energy) || 0;
    const maxEnergy = parseInt(dbUser.max_energy) || 100;
    const newEnergy = Math.min(currentEnergy + energyToRegenerate, maxEnergy);
    
    return { 
      newEnergy, 
      shouldUpdate: newEnergy > currentEnergy,
      secondsPassed 
    };
  };
  // Load user data when wallet connects
  useEffect(() => {
    const handleWalletConnected = () => {
      console.log('🎉 Wallet connected event received, refreshing data...');
      refreshUserData();
    };

    if (isAuthenticated && user) {
      // Initial load - only refresh data, don't store timestamp yet
      refreshUserData();
      
      // Listen for wallet connection events
      window.addEventListener('wallet-connected', handleWalletConnected);
      
      // Listen for referral data updates
      window.addEventListener('referral-updated', handleWalletConnected);
    }

    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnected);
      window.removeEventListener('referral-updated', handleWalletConnected);
    }
  }, [isAuthenticated, user, refreshUserData]);

  // Update last seen timestamp when user leaves
  useEffect(() => {
    // Offline mining rewards disabled - no need to track last seen
    return () => {};
  }, [isAuthenticated, user]);

  // Energy refill countdown timer
  useEffect(() => {
    if (!isAuthenticated || !user || energy >= maxEnergy) return;

    const interval = setInterval(() => {
      setEnergyRefillCountdown(prev => {
        if (prev <= 1) {
          // Time to refill energy
          if (energy < maxEnergy) {
            const newEnergy = Math.min(energy + 1, maxEnergy);
            setEnergy(newEnergy);
            
            // Update database
            if (isSupabaseConfigured()) {
              supabase
                .from('users')
                .update({ 
                  energy: newEnergy,
                  last_energy_update: new Date().toISOString() 
                })
                .eq('id', user.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error updating energy:', error);
                  }
                });
            }
          }
        } else {
          console.log('✅ Energy updated successfully');
          return 30; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, energy, maxEnergy]);

  // Auto-tap functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoTapActive && autoTapExpires && new Date() < autoTapExpires && isAuthenticated && user && energy > 0) {
      interval = setInterval(async () => {
        if (new Date() >= autoTapExpires!) {
          setAutoTapActive(false);
          setAutoTapExpires(null);
          
          // Update database to clear expired auto-tap
          if (supabase) {
            await supabase
              .from('users')
              .update({ auto_tap_expires: null })
              .eq('id', user.id);
          }
          return;
        }
        
        // Check if we have energy for auto-tap
        if (energy <= 0) {
          return;
        }
        
        // Auto-tap logic - update database directly
        const newEnergy = Math.max(0, energy - 1);
        const oreGained = tapPower * multiplier;
        const newOreBalance = oreBalance + oreGained;
        const newTotalTaps = totalTaps + 1;
        
        setOreBalance(newOreBalance);
        setTotalTaps(newTotalTaps);
        setEnergy(newEnergy);

        // Update database
        if (supabase) {
          try {
            await supabase
              .from('users')
              .update({
                energy: newEnergy,
                last_energy_update: new Date().toISOString(),
                ore_balance: newOreBalance,
                total_taps: newTotalTaps
              })
              .eq('id', user.id);
          } catch (error) {
            console.error('Error updating auto-tap data:', error);
          }
        }
      }, 1000); // Auto tap every second
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoTapActive, autoTapExpires, isAuthenticated, user, energy, tapPower, multiplier, oreBalance, totalTaps]);

  const tap = useCallback(async () => {
    if (!user || energy <= 0) return;
    
    if (!isSupabaseConfigured()) {
      // Fallback mode - only update local state
      const newEnergy = Math.max(0, energy - 1);
      const oreGained = tapPower * multiplier;
      setEnergy(newEnergy);
      setOreBalance(prev => prev + oreGained);
      setTotalTaps(prev => prev + 1);
      console.log('⚠️ Supabase not configured, using fallback mode');
      return;
    }

    const newEnergy = Math.max(0, energy - 1);
    const oreGained = tapPower * multiplier;
    const newOreBalance = oreBalance + oreGained;
    const newTotalTaps = totalTaps + 1;

    console.log(`🎯 Tap: +${oreGained} ORE (${newOreBalance} total), Energy: ${newEnergy}/${maxEnergy}`);

    // Update local state immediately for better UX
    setEnergy(newEnergy);
    setOreBalance(newOreBalance);
    setTotalTaps(newTotalTaps);

    // Update database
    try {
      console.log('💾 Saving tap to database...');
      const { error } = await supabase
        .from('users')
        .update({
          energy: newEnergy,
          last_energy_update: new Date().toISOString(),
          ore_balance: newOreBalance,
          total_taps: newTotalTaps,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Update lifetime_ore_earned separately with RPC call
      try {
        await supabase.rpc('increment_lifetime_ore', {
          user_id: user.id,
          ore_amount: oreGained
        });
      } catch (rpcError) {
        console.error('Error updating lifetime ore:', rpcError);
        // Don't revert tap if only lifetime ore update fails
      }

      if (error) {
        console.error('Error updating tap data:', error);
        // Revert local state if database update fails
        setEnergy(energy);
        setOreBalance(oreBalance);
        setTotalTaps(totalTaps);
        toast.error('Failed to save progress');
      } else {
        console.log('✅ Tap saved successfully');
      }
    } catch (error) {
      console.error('Error updating tap data:', error);
      // Revert local state if database update fails
      setEnergy(energy);
      setOreBalance(oreBalance);
      setTotalTaps(totalTaps);
      toast.error('Failed to save progress');
    }
  }, [user, energy, tapPower, multiplier, oreBalance, totalTaps]);

  const upgrade = async (type: string, cost: number) => {
    if (!user || oreBalance < cost) {
      toast.error('Insufficient ORE balance');
      return;
    }
    
    if (!isSupabaseConfigured()) {
      toast.error('Database not configured');
      return;
    }

    console.log(`🔧 Upgrading ${type} for ${cost} ORE`);

    // Process referral commission if user was referred
    try {
      if (user.referred_by) {
        await processReferralCommission(user.id, user.referred_by, 'upgrade', cost);
      }
    } catch (error) {
      console.error('Error processing referral commission:', error);
      // Don't block upgrade if referral commission fails
    }

    const newOreBalance = oreBalance - cost;
    let updateData: any = { 
      ore_balance: newOreBalance,
      updated_at: new Date().toISOString()
    };
    let newTapPower = tapPower;
    let newMultiplier = multiplier;
    let newLevel = level;
    let newMaxEnergy = maxEnergy;

    if (type === 'tap_power') {
      newTapPower = tapPower + 1;
      setTapPower(newTapPower);
      updateData.tap_power = newTapPower;
    } else if (type === 'multiplier') {
      newMultiplier = multiplier + 0.1;
      setMultiplier(newMultiplier);
      updateData.multiplier = newMultiplier;
    } else if (type === 'level') {
      newLevel = level + 1;
      setLevel(newLevel);
      updateData.level = newLevel;
    } else if (type === 'max_energy') {
      newMaxEnergy = maxEnergy + 20;
      setMaxEnergy(newMaxEnergy);
      updateData.max_energy = newMaxEnergy;
    }

    // Update local state immediately
    setOreBalance(newOreBalance);

    try {
      console.log('💾 Saving upgrade to database:', updateData);
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error saving upgrade:', error);
        // Revert local state if database update fails
        setOreBalance(oreBalance);
        setTapPower(tapPower);
        setMultiplier(multiplier);
        setLevel(level);
        setMaxEnergy(maxEnergy);
        toast.error('Upgrade failed');
        return;
      }

      console.log('✅ Upgrade saved successfully');
      toast.success('Upgrade successful!');
    } catch (error) {
      console.error('Error saving upgrade:', error);
      // Revert local state if database update fails
      setOreBalance(oreBalance);
      setTapPower(tapPower);
      setMultiplier(multiplier);
      setLevel(level);
      setMaxEnergy(maxEnergy);
      toast.error('Upgrade failed');
    }
  };

  const purchaseAutoTap = async (duration: number, cost: number) => {
    if (!user || !isSupabaseConfigured() || oreBalance < cost) {
      toast.error('Insufficient funds');
      return;
    }

    // Process referral commission if user was referred
    if (user.referred_by) {
      await processReferralCommission(user.id, user.referred_by, 'auto_tap', cost);
    }
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000); // duration in hours
    const newOreBalance = oreBalance - cost;

    // Update local state immediately
    setOreBalance(newOreBalance);
    setAutoTapActive(true);
    setAutoTapExpires(expiresAt);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          ore_balance: newOreBalance,
          auto_tap_expires: expiresAt.toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving auto-tap purchase:', error);
        // Revert local state if database update fails
        setOreBalance(oreBalance);
        setAutoTapActive(false);
        setAutoTapExpires(null);
        toast.error('Purchase failed');
        return;
      }

      toast.success(`Auto-tap activated for ${duration} hours!`);
    } catch (error) {
      console.error('Error saving auto-tap purchase:', error);
      // Revert local state if database update fails
      setOreBalance(oreBalance);
      setAutoTapActive(false);
      setAutoTapExpires(null);
      toast.error('Purchase failed');
    }
  };

  // Process referral commission
  const processReferralCommission = async (buyerId: string, referrerId: string, purchaseType: string, amount: number) => {
    if (!isSupabaseConfigured()) return;
    
    try {
      // Import and use referral function
      const { processReferralCommission: processCommission } = await import('../lib/referral');
      const success = await processCommission(buyerId, purchaseType, amount);
      
      if (success) {
        console.log('✅ Referral commission processed successfully');
      } else {
        console.log('⚠️ Referral commission processing failed');
      }
    } catch (error) {
      console.error('Error processing referral commission:', error);
    }
  };
  const swapToBio = async (oreAmount: number) => {
    if (!user || !isSupabaseConfigured() || level < 3) {
      toast.error('Must reach BIO-3 level to swap');
      return;
    }

    if (oreBalance < oreAmount) {
      toast.error('Insufficient ORE balance');
      return;
    }

    const bioToAdd = oreAmount * 0.001; // 1 ORE = 0.01 BIO
    const newOreBalance = oreBalance - oreAmount;
    const newBioBalance = bioBalance + bioToAdd;
    
    // Update local state immediately
    setOreBalance(newOreBalance);
    setBioBalance(newBioBalance);

    try {
      // Update user balances
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          ore_balance: oreBalance - oreAmount,
          bio_balance: bioBalance + bioToAdd,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        setOreBalance(oreBalance);
        setBioBalance(bioBalance);
        toast.error('Swap failed');
        return;
      }

      // Record swap request
      const { error: insertError } = await supabase
        .from('swap_requests')
        .insert({
          wallet_address: user.id,
          ore_amount: oreAmount,
          bio_amount: bioToAdd,
          status: 'pending'
        });

      if (insertError) {
        console.error('Error creating swap request:', insertError);
        toast.error('Failed to create swap request');
        return;
      }

      toast.success(`Swap successful! +${bioToAdd.toFixed(4)} BIO added to your balance.`);
    } catch (error) {
      console.error('Error processing swap:', error);
      // Revert local state if database update fails
      setOreBalance(oreBalance);
      setBioBalance(bioBalance);
      toast.error('Swap failed');
    }
  };

  const depositUSDT = async (amount: number, txHash?: string) => {
    if (!user || !isSupabaseConfigured()) {
      toast.error('Database not configured');
      return;
    }

    try {
      // Get payment address from admin settings
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'payment_address')
        .single();

      const paymentAddress = settings?.setting_value?.usdt_address || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE';

      // Create deposit request
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          amount: amount,
          currency: 'USDT',
          payment_address: paymentAddress,
          transaction_hash: txHash,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating deposit request:', error);
        toast.error('Failed to create deposit request');
        return;
      }

      toast.success(`Deposit request for ${amount} USDT submitted! Please wait for admin approval.`);
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast.error('Failed to process deposit');
    }
  };

  const withdrawBIO = async (amount: number, address: string) => {
    if (!user || !isSupabaseConfigured()) {
      toast.error('Database not configured');
      return;
    }

    if (bioBalance < amount) {
      toast.error('Insufficient BIO balance');
      return;
    }

    if (level < 5) {
      toast.error('Must reach BIO-5 level to withdraw');
      return;
    }

    try {
      // Deduct BIO balance immediately
      const newBioBalance = bioBalance - amount;
      setBioBalance(newBioBalance);

      // Update user balance
      const { error: updateError } = await supabase
        .from('users')
        .update({ bio_balance: newBioBalance })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        setBioBalance(bioBalance); // Revert
        toast.error('Failed to update balance');
        return;
      }

      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: amount,
          currency: 'BIO',
          destination_address: address,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating withdrawal request:', error);
        toast.error('Failed to create withdrawal request');
        return;
      }

      toast.success(`Withdrawal request for ${amount} BIO submitted! Your balance has been deducted.`);
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setBioBalance(bioBalance); // Revert on error
      toast.error('Failed to process withdrawal');
    }
  };

  return (
    <GameContext.Provider value={{
      oreBalance,
      bioBalance,
      usdtBalance,
      level,
      totalTaps,
      tapPower,
      multiplier,
      energy,
      maxEnergy,
      autoTapActive,
      autoTapExpires,
      referrals,
      referralEarnings,
      tap,
      upgrade,
      purchaseAutoTap,
      swapToBio,
      depositUSDT,
      withdrawBIO,
      refreshUserData,
      isLoading,
      energyRefillCountdown
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}