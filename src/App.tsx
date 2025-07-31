import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import GameSection from './components/GameSection';
import LeaderboardSection from './components/LeaderboardSection';
import ProfilePage from './components/ProfilePage';
import UpgradeSection from './components/UpgradeSection';
import SwapSection from './components/SwapSection';
import ReferralSection from './components/ReferralSection';
import PresaleSection from './components/PresaleSection';
import LuckyDrawSection from './components/LuckyDrawSection';
import MarketplaceSection from './components/MarketplaceSection';
import TutorialSection from './components/TutorialSection';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import AuthForm from './components/AuthForm';
import BottomNavigation from './components/BottomNavigation';
import { GameProvider } from './context/GameContext';
import { WalletProvider } from './context/WalletContext';
import DailyRewardModal from './components/DailyRewardModal';

function AppContent() {
  const { isAuthenticated, isLoading, showDailyRewardModal, setShowDailyRewardModal } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'admin-login' | 'admin-panel'>('main');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('home');

  const pageVariants = {
    initial: { opacity: 0, x: 20, scale: 0.98 },
    in: { opacity: 1, x: 0, scale: 1 },
    out: { opacity: 0, x: -20, scale: 0.98 }
  };

  const pageTransition = {
    type: 'tween',
    ease: [0.25, 0.1, 0.25, 1],
    duration: 0.3
  };

  useEffect(() => {
    // Lock scroll on body
    document.body.classList.add('scroll-lock');
    
    // Prevent pull-to-refresh on mobile
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    const checkRoute = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
        if (isAuthenticated) {
          setCurrentView('admin-panel');
          setIsAdminAuthenticated(true);
        } else {
          setCurrentView('admin-login');
        }
      } else {
        setCurrentView('main');
      }
    };

    checkRoute();

    const handlePopState = () => {
      checkRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.body.classList.remove('scroll-lock');
    };
  }, []);

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
    setCurrentView('admin-panel');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    setIsAdminAuthenticated(false);
    setCurrentView('main');
    window.history.pushState({}, 'Biometra', '/');
  };

  const handleNavigation = (page: string) => {
    setActivePage(page);
  };

  const showAdminPanel = () => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
      setCurrentView('admin-panel');
      window.history.pushState({}, 'Admin Panel', '/admin');
    } else {
      setCurrentView('admin-login');
      window.history.pushState({}, 'Admin Login', '/admin');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <div className="w-8 h-8 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="text-white text-xl font-semibold">Loading Biometra...</div>
        </div>
      </div>
    );
  }

  if (currentView === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (currentView === 'admin-panel') {
    return <AdminPanel onClose={handleAdminLogout} />;
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <WalletProvider>
      <GameProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden safe-area">
          <Header onAdminClick={showAdminPanel} onNavigate={handleNavigation} />
          
          <div className="pt-20 pb-24 h-screen overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full overflow-y-auto overflow-x-hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activePage === 'home' && <HeroSection />}
                {activePage === 'mine' && <GameSection />}
                {activePage === 'profile' && <ProfilePage />}
                {activePage === 'upgrade' && <UpgradeSection />}
                {activePage === 'swap' && <SwapSection />}
                {activePage === 'referral' && <ReferralSection />}
                {activePage === 'presale' && <PresaleSection />}
                {activePage === 'lucky-draw' && <LuckyDrawSection />}
                {activePage === 'marketplace' && <MarketplaceSection />}
                {activePage === 'leaderboard' && <LeaderboardSection />}
                {activePage === 'tutorials' && <TutorialSection />}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <BottomNavigation activePage={activePage} onPageChange={setActivePage} />
          
          <DailyRewardModal
            isOpen={showDailyRewardModal}
            onClose={() => setShowDailyRewardModal(false)}
          />
          
          <DailyRewardModal
            isOpen={showDailyRewardModal}
            onClose={() => setShowDailyRewardModal(false)}
          />
        </div>
      </GameProvider>
    </WalletProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 scroll-lock">
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
            },
          }}
        />
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;