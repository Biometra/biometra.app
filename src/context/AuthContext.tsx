import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, signupUser, AuthUser } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import ReferralModal from '../components/ReferralModal';
import toast from 'react-hot-toast';

interface AuthResult {
  success: boolean;
  reason?: 'user_exists' | 'unknown_error';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<AuthResult>;
  logout: () => void;
  showReferralModal: boolean;
  setShowReferralModal: (show: boolean) => void;
  submitReferralCode: (code: string) => Promise<void>;
  skipReferral: () => void;
  showDailyRewardModal: boolean;
  setShowDailyRewardModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('authenticatedUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('authenticatedUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Check for referral code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      console.log('🔗 Referral code detected in URL:', refCode);
      localStorage.setItem('pendingReferralCode', refCode);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Show success message
      setTimeout(() => {
        toast.success(`🎉 Referral code ${refCode} applied! You'll get +50 ORE bonus when you sign up!`);
      }, 1000);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userData = await loginUser(email, password);

      if (!userData) {
        toast.error('Email atau password salah');
        return false;
      }

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('authenticatedUser', JSON.stringify(userData));
      
      // Check if user should see referral modal (only if they haven't used one)
      const pendingRefCode = localStorage.getItem('pendingReferralCode');
      if (pendingRefCode && !userData.referral_code_used) {
        setShowReferralModal(true);
      } else {
        // Check for daily reward after login
        setTimeout(() => {
          checkDailyReward(userData.id);
        }, 1000);
      }
      
      toast.success('Login berhasil!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Gagal login');
      return false;
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<AuthResult> => {
    try {
      const pendingRefCode = localStorage.getItem('pendingReferralCode');
      console.log('📝 Signing up with referral code:', pendingRefCode);
      const result = await signupUser(email, password, username, pendingRefCode);

      if (!result.success) {
        if (result.reason === 'user_exists') {
          toast.error('Email sudah terdaftar. Silakan login atau gunakan email lain.');
        } else {
          toast.error('Gagal membuat akun');
        }
        return { success: false, reason: result.reason };
      }

      if (result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem('authenticatedUser', JSON.stringify(result.user));
        
        // Clear pending referral code since it was applied during signup
        if (pendingRefCode) {
          localStorage.removeItem('pendingReferralCode');
        }
        
        // Check for daily reward after signup
        setTimeout(() => {
          checkDailyReward(result.user.id);
        }, 2000);
        
        const bonusMessage = pendingRefCode 
          ? `Akun berhasil dibuat! +150 ORE bonus received! (Referral: ${pendingRefCode})`
          : 'Akun berhasil dibuat! +100 ORE bonus received!';
        toast.success(bonusMessage);
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Gagal membuat akun');
      return { success: false, reason: 'unknown_error' };
    }
  };

  // Check daily reward status
  const checkDailyReward = async (userId: string) => {
    if (!isSupabaseConfigured()) return;
    
    try {
      const { data, error } = await supabase.rpc('check_daily_login_reward', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking daily reward:', error);
        return;
      }

      // Show daily reward modal if user can claim or if it's a new day
      if (data && (data.can_claim || data.is_new_day)) {
        setShowDailyRewardModal(true);
      }
    } catch (error) {
      console.error('Error checking daily reward:', error);
    }
  };

  const submitReferralCode = async (referralCode: string) => {
    try {
      // Validate referral code
      const isValid = await validateReferralCode(referralCode);
      if (isValid) {
        // Store referral code for when user connects wallet
        localStorage.setItem('appliedReferralCode', referralCode);
        localStorage.removeItem('pendingReferralCode');
        toast.success(`Referral code applied! You'll get +50 ORE bonus when you connect wallet!`);
      } else {
        toast.error('Invalid referral code');
        return;
      }
    } catch (error) {
      toast.error('Failed to apply referral code');
      return;
    }
    
    setShowReferralModal(false);
  };

  const skipReferral = () => {
    localStorage.removeItem('pendingReferralCode');
    setShowReferralModal(false);
  };

  const validateReferralCode = async (code: string): Promise<boolean> => {
    try {
      if (!isSupabaseConfigured()) {
        // In demo mode, accept any 8-character code
        return code.length === 8;
      }

      // Check if referral code exists in database
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (error || !data) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authenticatedUser');
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('pendingReferralCode');
    localStorage.removeItem('appliedReferralCode');
    setShowReferralModal(false);
    
    toast.success('Logout berhasil');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      signup,
      logout,
      showReferralModal,
      setShowReferralModal,
      submitReferralCode,
      skipReferral,
      showDailyRewardModal,
      setShowDailyRewardModal
    }}>
      {children}
      <ReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        onSubmitReferral={submitReferralCode}
        onSkip={skipReferral}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}