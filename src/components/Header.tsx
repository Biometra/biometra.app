import React from 'react';
import { Zap, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import ProfileSidebar from './ProfileSidebar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  onAdminClick: () => void;
  onNavigate: (page: string) => void;
}

function Header({ onAdminClick, onNavigate }: HeaderProps) {
  const [showPresaleButton, setShowPresaleButton] = React.useState(false);

  // Check if presale is enabled
  React.useEffect(() => {
    const checkPresaleStatus = async () => {
      // Always show presale button first
      setShowPresaleButton(true);
      
      if (!isSupabaseConfigured()) {
        return;
      }

      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'presale_enabled')
          .maybeSingle();

        if (data?.setting_value?.enabled !== false) {
          setShowPresaleButton(true);
        } else {
          setShowPresaleButton(false);
        }
      } catch (error) {
        console.error('Error checking presale status:', error);
        setShowPresaleButton(true); // Show by default if error
      }
    };

    checkPresaleStatus();
    
    // Listen for presale settings updates
    const handlePresaleUpdate = () => {
      checkPresaleStatus();
    };
    
    window.addEventListener('presale-settings-updated', handlePresaleUpdate);
    
    return () => {
      window.removeEventListener('presale-settings-updated', handlePresaleUpdate);
    };
  }, []);

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 safe-area"
    >
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-purple-900/30 to-transparent backdrop-blur-xl border-b border-white/10" />
      
      {/* Header Content */}
      <div className="relative px-4 py-4 flex justify-between items-center">
        <motion.div 
          className="flex items-center space-x-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center neon-glow">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Biometra</h1>
            <p className="text-xs text-purple-300 font-medium">Mining Platform</p>
          </div>
        </motion.div>

        <div className="flex items-center space-x-3">
          {/* Presale Button */}
          {showPresaleButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('presale')}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-xl hover:border-yellow-400/50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 neon-glow"
            >
              <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Coins className="w-3 h-3 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-yellow-400">
                  Presale
                </div>
                <div className="text-xs text-orange-300">
                  $BIO
                </div>
              </div>
            </motion.button>
          )}

          <ProfileSidebar onNavigate={onNavigate} />
        </div>
      </div>
    </motion.header>
  );
}

export default Header;