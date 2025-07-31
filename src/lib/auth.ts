// Custom authentication utility functions
import { supabase, isSupabaseConfigured } from './supabase';

// Simple hash function for password (in production use bcrypt or similar)
export async function hashPassword(password: string): Promise<string> {
  // For demo purposes, using simple hash
  // In production, use proper hashing like bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'biometra_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export function generateUserId(): string {
  return crypto.randomUUID();
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  referral_code: string;
  ore_balance: number;
  level: number;
  usdt_balance: number;
  total_taps: number;
  tap_power: number;
  multiplier: number;
  referrals: number;
  referral_earnings: number;
  auto_tap_expires: string | null;
  referred_by_user_id: string | null;
  referral_code_used: string | null;
  created_at: string;
  updated_at: string;
}

// Generate referral code from user ID
export function generateReferralCode(userId: string): string {
  return (userId.slice(0, 4) + userId.slice(-4)).toUpperCase();
}

export async function loginUser(email: string, password: string): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    // Demo mode fallback
    const userId = generateUserId();
    return {
      id: userId,
      email,
      username: email.split('@')[0],
      referral_code: generateReferralCode(userId),
      ore_balance: 100,
      usdt_balance: 0,
      level: 1,
      total_taps: 0,
      tap_power: 1,
      multiplier: 1.0,
      referrals: 0,
      referral_earnings: 0,
      auto_tap_expires: null,
      referred_by_user_id: null,
      referral_code_used: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  try {
    // Find user by email
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        password_hash,
        referral_code,
        ore_balance,
        usdt_balance,
        level,
        total_taps,
        tap_power,
        multiplier,
        referrals,
        referral_earnings,
        auto_tap_expires,
        referred_by_user_id,
        referral_code_used,
        created_at,
        updated_at
      `)
      .eq('email', email)
      .limit(1);

    if (error || users.length === 0) {
      return null;
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, users[0].password_hash);
    if (!isValidPassword) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function signupUser(email: string, password: string, username: string, referralCode?: string): Promise<{ success: boolean; user?: AuthUser; reason?: string }> {
  if (!isSupabaseConfigured()) {
    // Demo mode fallback
    const userId = generateUserId();
    const user: AuthUser = {
      id: userId,
      email,
      username,
      referral_code: generateReferralCode(userId),
      ore_balance: 100,
      usdt_balance: 0,
      level: 1,
      total_taps: 0,
      tap_power: 1,
      multiplier: 1.0,
      referrals: 0,
      referral_earnings: 0,
      auto_tap_expires: null,
      referred_by_user_id: null,
      referral_code_used: referralCode || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return { success: true, user };
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { success: false, reason: 'user_exists' };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate user ID
    const userId = generateUserId();

    // Generate referral code
    const userReferralCode = generateReferralCode(userId);

    // Create user data
    const userData = {
      id: userId,
      email,
      username,
      password_hash: passwordHash,
      referral_code: userReferralCode,
      ore_balance: referralCode ? 150 : 100, // Extra bonus for referral signup
      usdt_balance: 0,
      level: 1,
      total_taps: 0,
      tap_power: 1,
      multiplier: 1.0,
      referrals: 0,
      referral_earnings: 0,
      auto_tap_expires: null,
      referred_by_user_id: null,
      referral_code_used: referralCode || null
    };

    // Insert user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return { success: false, reason: 'unknown_error' };
    }

    // Handle referral signup if referral code provided
    if (referralCode) {
      try {
        // Import and use referral function
        const { processReferralSignup } = await import('./referral');
        const success = await processReferralSignup(referralCode, userId);
        
        if (success) {
          console.log('✅ Referral signup processed successfully');
        } else {
          console.log('⚠️ Referral signup processing failed');
        }
      } catch (error) {
        console.error('Error processing referral:', error);
        
        // Trigger referral data refresh
        setTimeout(() => {
          window.dispatchEvent(new Event('referral-updated'));
        }, 2000);
      }
    }

    return { success: true, user: newUser };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, reason: 'unknown_error' };
  }
}