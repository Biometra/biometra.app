import { supabase, isSupabaseConfigured } from './supabase';
import toast from 'react-hot-toast';

export interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  referralCode: string;
  rank: number;
}

export interface ReferralUser {
  id: string;
  username: string;
  ore_balance: number;
  level: number;
  total_taps: number;
  created_at: string;
}

export interface ReferralTransaction {
  id: string;
  transaction_type: string;
  transaction_amount: number;
  commission_amount: number;
  referred_user: {
    username: string;
  };
  created_at: string;
}

// Generate referral code from user ID (same as database function)
export function generateReferralCode(userId: string): string {
  return (userId.slice(0, 4) + userId.slice(-4)).toUpperCase();
}

// Get referral stats for user using database function
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  if (!isSupabaseConfigured()) {
    return {
      totalReferrals: 0,
      totalEarnings: 0,
      referralCode: generateReferralCode(userId),
      rank: 0
    };
  }

  try {
    console.log('📊 Fetching referral stats for user:', userId);
    
    // Use database function for accurate stats
    const { data, error } = await supabase.rpc('get_referral_stats', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error fetching referral stats:', error);
      // Fallback to direct query
      return await getReferralStatsFallback(userId);
    }

    const stats = {
      totalReferrals: data.total_referrals || 0,
      totalEarnings: parseFloat(data.total_earnings || '0'),
      referralCode: data.referral_code || generateReferralCode(userId),
      rank: data.rank || 0
    };

    console.log('✅ Referral stats loaded:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching referral stats:', error);
    return await getReferralStatsFallback(userId);
  }
}

// Fallback function for getting stats directly
async function getReferralStatsFallback(userId: string): Promise<ReferralStats> {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        referral_code,
        referrals,
        total_commission_earned
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error in fallback stats:', error);
      return {
        totalReferrals: 0,
        totalEarnings: 0,
        referralCode: generateReferralCode(userId),
        rank: 0
      };
    }

    // Calculate rank
    const { count: rank } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_commission_earned', userData.total_commission_earned || 0);

    return {
      totalReferrals: userData.referrals || 0,
      totalEarnings: parseFloat(userData.total_commission_earned || '0'),
      referralCode: userData.referral_code || generateReferralCode(userId),
      rank: (rank || 0) + 1
    };
  } catch (error) {
    console.error('❌ Error in fallback stats:', error);
    return {
      totalReferrals: 0,
      totalEarnings: 0,
      referralCode: generateReferralCode(userId),
      rank: 0
    };
  }
}

// Get referred users with real-time sync
export async function getReferredUsers(userId: string): Promise<ReferralUser[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    console.log('👥 Fetching referred users for:', userId);
    
    // First, ensure referral counts are up to date
    await syncReferralCounts();
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        ore_balance,
        level,
        total_taps,
        created_at
      `)
      .eq('referred_by_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching referred users:', error);
      return [];
    }

    const users = (data || []).map(user => ({
      id: user.id,
      username: user.username || `User${user.id.slice(-4)}`,
      ore_balance: parseFloat(user.ore_balance) || 0,
      level: user.level || 1,
      total_taps: user.total_taps || 0,
      created_at: user.created_at
    }));

    console.log('✅ Referred users loaded:', users.length, 'users');
    return users;
  } catch (error) {
    console.error('❌ Error fetching referred users:', error);
    return [];
  }
}

// Get referral transactions (commission history)
export async function getReferralTransactions(userId: string): Promise<ReferralTransaction[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    console.log('💰 Fetching referral transactions for:', userId);
    
    // Get recent activities from referred users
    const { data: referredUsers, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        ore_balance,
        total_taps,
        updated_at,
        created_at
      `)
      .eq('referred_by_user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching referred users activities:', error);
      return [];
    }

    // Transform to transaction-like format
    const transactions = (referredUsers || []).map(user => ({
      id: `activity_${user.id}`,
      transaction_type: 'mining_activity',
      transaction_amount: parseFloat(user.ore_balance) || 0,
      commission_amount: Math.floor((parseFloat(user.ore_balance) || 0) * 0.05), // 5% commission estimate
      referred_user: {
        username: user.username || 'Unknown User'
      },
      created_at: user.updated_at || user.created_at
    }));

    console.log('✅ Referral transactions loaded:', transactions.length, 'transactions');
    return transactions;
  } catch (error) {
    console.error('❌ Error fetching referral transactions:', error);
    return [];
  }
}

// Process referral signup with proper error handling
export async function processReferralSignup(referralCode: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true; // Demo mode
  }

  try {
    console.log('🎯 Processing referral signup:', { referralCode, userId });
    
    const { data, error } = await supabase.rpc('process_referral_signup', {
      p_referral_code: referralCode.toUpperCase(),
      p_referred_user_id: userId
    });

    if (error) {
      console.error('❌ Error processing referral signup:', error);
      return false;
    }

    if (data?.success) {
      console.log('✅ Referral signup processed successfully:', data);
      
      // Refresh leaderboard after successful signup
      await refreshReferralLeaderboard();
      
      return true;
    } else {
      console.log('⚠️ Referral signup failed:', data?.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error processing referral signup:', error);
    return false;
  }
}

// Process referral commission
export async function processReferralCommission(
  userId: string, 
  transactionType: string, 
  amount: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true; // Demo mode
  }

  try {
    console.log('💸 Processing referral commission:', { userId, transactionType, amount });
    
    // Get user's referrer
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('referred_by_user_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.referred_by_user_id) {
      console.log('ℹ️ User has no referrer, skipping commission');
      return true;
    }

    // Calculate commission (5%)
    const commissionAmount = Math.floor(amount * 0.05);
    
    // Update referrer's commission
    const { error: updateError } = await supabase.rpc('add_referral_commission', {
      p_user_id: userData.referred_by_user_id,
      p_commission_amount: commissionAmount
    });

    if (updateError) {
      console.error('❌ Error updating referrer commission:', updateError);
      return false;
    }

    console.log('✅ Referral commission processed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error processing referral commission:', error);
    return false;
  }
}

// Create referral link for user
export async function createReferralLink(userId: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    return generateReferralCode(userId);
  }

  try {
    console.log('🔗 Getting referral code for user:', userId);
    
    // Get user's referral code from users table
    const { data: userData, error } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching referral code:', error);
      return generateReferralCode(userId);
    }

    let referralCode = userData.referral_code;
    
    // Generate and update referral code if missing
    if (!referralCode) {
      referralCode = generateReferralCode(userId);
      await supabase
        .from('users')
        .update({ referral_code: referralCode })
        .eq('id', userId);
    }

    console.log('✅ Referral code retrieved:', referralCode);
    return referralCode;
  } catch (error) {
    console.error('❌ Error getting referral code:', error);
    return generateReferralCode(userId);
  }
}

// Get referral leaderboard from materialized view
export async function getReferralLeaderboard(limit: number = 50): Promise<any[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    console.log('🏆 Fetching referral leaderboard...');
    
    // Refresh leaderboard first
    await refreshReferralLeaderboard();
    
    const { data, error } = await supabase
      .from('referral_leaderboard_view')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching referral leaderboard:', error);
      // Fallback to direct query
      return await getReferralLeaderboardFallback(limit);
    }

    console.log('✅ Referral leaderboard loaded:', data?.length || 0, 'entries');
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching referral leaderboard:', error);
    return [];
  }
}

// Fallback leaderboard query
async function getReferralLeaderboardFallback(limit: number): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        referrals,
        total_commission_earned,
        level
      `)
      .or('referrals.gt.0,total_commission_earned.gt.0')
      .order('total_commission_earned', { ascending: false })
      .order('referrals', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error in fallback leaderboard:', error);
      return [];
    }

    return (data || []).map((user, index) => ({
      rank_position: index + 1,
      total_referrals: user.referrals || 0,
      total_commission_earned: parseFloat(user.total_commission_earned || '0'),
      username: user.username || `User${user.id?.slice(-4)}`,
      level: user.level || 1
    }));
  } catch (error) {
    console.error('❌ Error in fallback leaderboard:', error);
    return [];
  }
}

// Update referral rankings
export async function updateReferralRankings(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    console.log('🔄 Updating referral rankings...');
    await refreshReferralLeaderboard();
    console.log('✅ Referral rankings updated');
  } catch (error) {
    console.error('❌ Error updating referral rankings:', error);
  }
}

// Refresh referral leaderboard materialized view
export async function refreshReferralLeaderboard(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await supabase.rpc('refresh_referral_leaderboard');
    if (error) {
      console.error('❌ Error refreshing leaderboard:', error);
    }
  } catch (error) {
    console.error('❌ Error refreshing leaderboard:', error);
  }
}

// Sync referral counts manually
export async function syncReferralCounts(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const { error } = await supabase.rpc('update_referral_counts');
    if (error) {
      console.error('❌ Error syncing referral counts:', error);
    }
  } catch (error) {
    console.error('❌ Error syncing referral counts:', error);
  }
}

// Sync all referral data (manual fix)
export async function syncAllReferralData(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    console.log('🔄 Syncing all referral data...');
    
    const { data, error } = await supabase.rpc('sync_all_referral_data');
    
    if (error) {
      console.error('❌ Error syncing all referral data:', error);
      return false;
    }

    console.log('✅ All referral data synced:', data);
    return data?.success || false;
  } catch (error) {
    console.error('❌ Error syncing all referral data:', error);
    return false;
  }
}

// Validate referral code
export async function validateReferralCode(code: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return code.length === 8; // Demo validation
  }

  try {
    console.log('🔍 Validating referral code:', code);
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', code.toUpperCase())
      .single();

    const isValid = !error && !!data;
    console.log('✅ Referral code validation result:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('❌ Error validating referral code:', error);
    return false;
  }
}