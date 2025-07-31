import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// MetaMask deep link for mobile
const getMetaMaskDeepLink = (url: string) => {
  return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
};

// Check if MetaMask is installed on mobile
const isMetaMaskMobileInstalled = () => {
  return typeof window.ethereum !== 'undefined' && 
         (window.ethereum.isMetaMask || window.ethereum.providers?.find((p: any) => p.isMetaMask));
};

// Trust Wallet deep link
const getTrustWalletDeepLink = () => {
  return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
};

// Check if we're in a mobile wallet's in-app browser
const isInWalletBrowser = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('metamask') || 
         userAgent.includes('trustwallet') || 
         userAgent.includes('coinbase');
};

interface WalletContextType {
  wallet: string | null;
  isConnected: boolean;
  isMobileWallet: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMobileWallet, setIsMobileWallet] = useState(false);

  useEffect(() => {
    const savedWallet = localStorage.getItem('connectedWallet');
    const savedMobileWallet = localStorage.getItem('isMobileWallet');
    if (savedWallet) {
      setWallet(savedWallet);
      setIsConnected(true);
      setIsMobileWallet(savedMobileWallet === 'true');
    }
  }, []);


  const connectWallet = async () => {
    try {
      if (!isAuthenticated) {
        toast.error('Login terlebih dahulu');
        return;
      }

      // Check if mobile device
      if (isMobile()) {
        await connectMobileWallet();
      } else {
        await connectDesktopWallet();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const connectDesktopWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask');
      return;
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length > 0) {
      const walletAddress = accounts[0];
      const appliedReferralCode = localStorage.getItem('appliedReferralCode');
      await finalizeConnection(walletAddress, appliedReferralCode, false);
    }
  };

  const connectMobileWallet = async () => {
    try {
      // Check if we're already in a wallet browser
      if (isInWalletBrowser() && typeof window.ethereum !== 'undefined') {
        console.log('🔍 In-wallet browser detected');
        
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        if (accounts.length > 0) {
          const walletAddress = accounts[0];
          const appliedReferralCode = localStorage.getItem('appliedReferralCode');
          await finalizeConnection(walletAddress, appliedReferralCode, true);
          return;
        }
      }

      // Try to detect injected wallet (MetaMask mobile app)
      if (isMetaMaskMobileInstalled()) {
        console.log('🔍 MetaMask detected on mobile device');
        
        const provider = window.ethereum.isMetaMask ? 
          window.ethereum : 
          window.ethereum.providers?.find((p: any) => p.isMetaMask);
          
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        });

        if (accounts.length > 0) {
          const walletAddress = accounts[0];
          const appliedReferralCode = localStorage.getItem('appliedReferralCode');
          await finalizeConnection(walletAddress, appliedReferralCode, true);
          return;
        }
      }

      // If no injected wallet, open mobile wallet app directly
      console.log('📱 Opening mobile wallet app...');
      await openMobileWalletApp();
    } catch (error) {
      console.error('Mobile wallet connection failed:', error);
      toast.error('Please install MetaMask or Trust Wallet');
    }
  };

  const openMobileWalletApp = async () => {
    const metamaskDeepLink = getMetaMaskDeepLink(window.location.href);
    const trustWalletDeepLink = getTrustWalletDeepLink();
    
    // Store connection attempt
    localStorage.setItem('walletConnectionAttempt', 'true');
    localStorage.setItem('pendingReferralCode', localStorage.getItem('appliedReferralCode') || '');
    
    // Try MetaMask first, fallback to Trust Wallet
    toast.loading('Opening wallet app...', { duration: 3000 });
    
    // Try opening MetaMask mobile app
    window.location.href = metamaskDeepLink;
    
    // Fallback after 2 seconds if MetaMask doesn't respond
    setTimeout(() => {
      if (localStorage.getItem('walletConnectionAttempt')) {
        toast.loading('Trying Trust Wallet...', { duration: 2000 });
        window.open(trustWalletDeepLink, '_blank');
      }
    }, 2000);
  };

  // Check for wallet connection when returning from mobile app
  useEffect(() => {
    const checkMobileConnection = async () => {
      const connectionAttempt = localStorage.getItem('walletConnectionAttempt');
      
      if (connectionAttempt) {
        try {
          let accounts = [];
          
          // Check for injected wallet
          if (isMetaMaskMobileInstalled()) {
            const provider = window.ethereum.isMetaMask ? 
              window.ethereum : 
              window.ethereum.providers?.find((p: any) => p.isMetaMask);
              
            accounts = await provider.request({
              method: 'eth_accounts',
            });
          }

          if (accounts.length > 0) {
            const walletAddress = accounts[0];
            const pendingReferralCode = localStorage.getItem('pendingReferralCode');
            
            await finalizeConnection(walletAddress, pendingReferralCode, true);
            
            localStorage.removeItem('walletConnectionAttempt');
            localStorage.removeItem('pendingReferralCode');
          } else {
            // Clear attempt after timeout
            setTimeout(() => {
              localStorage.removeItem('walletConnectionAttempt');
              localStorage.removeItem('pendingReferralCode');
            }, 10000); // 10 second timeout
          }
        } catch (error) {
          console.error('Failed to check mobile connection:', error);
          localStorage.removeItem('walletConnectionAttempt');
        }
      }
    };

    // Check after a short delay to allow page to load
    const timer = setTimeout(checkMobileConnection, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for account changes on mobile
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== wallet) {
          // Account changed, reconnect
          const appliedReferralCode = localStorage.getItem('appliedReferralCode');
          finalizeConnection(accounts[0], appliedReferralCode, isMobile());
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [wallet]);



  const finalizeConnection = async (walletAddress: string, referralCode?: string | null, mobile: boolean = false) => {
    try {
      console.log(`🔄 Finalizing connection for: ${walletAddress}`);
      
      if (!user) {
        toast.error('User not found');
        return;
      }
      
      // Update user with wallet connection
      const success = await updateUserWalletConnection(user.id, walletAddress, referralCode);
      
      if (!success) {
        toast.error('Failed to connect wallet');
        return;
      }
      
      // Save wallet to localStorage after successful database creation
      localStorage.setItem('connectedWallet', walletAddress);
      localStorage.setItem('isMobileWallet', mobile.toString());
      
      setWallet(walletAddress);
      setIsConnected(true);
      setIsMobileWallet(mobile);
      
      const bonusMessage = referralCode 
        ? `Wallet connected${mobile ? ' (Mobile)' : ''}! +150 ORE received!`
        : `Wallet connected${mobile ? ' (Mobile)' : ''}! +100 ORE airdrop received!`;
      
      toast.success(bonusMessage);
      
      // Clear applied referral code after successful connection
      if (referralCode) {
        localStorage.removeItem('appliedReferralCode');
      }
      
      // Refresh user data after connection
      setTimeout(() => {
        window.dispatchEvent(new Event('wallet-connected'));
      }, 1000);
    } catch (error) {
      console.error('Error finalizing connection:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setIsConnected(false);
    setIsMobileWallet(false);
    localStorage.removeItem('connectedWallet');
    localStorage.removeItem('isMobileWallet');
    toast.success('Wallet disconnected');
  };

  const updateUserWalletConnection = async (userId: string, walletAddress: string, referralCode?: string | null) => {
    try {
      console.log(`🔄 Connecting wallet for user: ${userId}`);
      
      if (!isSupabaseConfigured()) {
        console.log('⚠️ Supabase not configured, using fallback mode');
        return true; // Allow app to work without database
      }

      // Get current user data
      const { data: currentUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError) {
        console.error('Error getting user data:', getUserError);
        return false;
      }

      // Calculate bonus ORE for wallet connection
      const referralBonus = referralCode && referralCode.trim() ? 50 : 0;
      const currentBalance = parseFloat(currentUser.ore_balance) || 0;
      
      // Only add bonus if they haven't connected wallet before (balance is still at signup default)
      let newBalance = currentBalance;
      if (currentBalance <= 100) { // They still have signup bonus only
        newBalance = currentBalance + referralBonus;
      }
      
      // Update user with referral code if applicable
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (referralBonus > 0) {
        updateData.ore_balance = newBalance;
        updateData.referral_code_used = referralCode;
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return false;
      }

      console.log('✅ Wallet connected successfully');
      
      // Process referral signup if applicable
      if (referralCode) {
        const { processReferralSignup } = await import('../lib/referral');
        const success = await processReferralSignup(referralCode, userId);
        
        if (success) {
          console.log('✅ Referral signup processed successfully');
        } else {
          console.log('⚠️ Referral signup processing failed');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error connecting wallet:', error);
      return false;
    }
  };

  return (
    <WalletContext.Provider value={{
      wallet,
      isConnected,
      isMobileWallet,
      connectWallet,
      disconnectWallet
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}