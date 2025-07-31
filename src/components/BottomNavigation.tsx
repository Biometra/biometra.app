import React from 'react';
import { motion } from 'framer-motion';
import { Home, Pickaxe, User, TrendingUp, ShoppingCart } from 'lucide-react';

interface BottomNavigationProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

function BottomNavigation({ activePage, onPageChange }: BottomNavigationProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, color: 'from-purple-500 to-pink-500' },
    { id: 'mine', label: 'Mine', icon: Pickaxe, color: 'from-yellow-500 to-orange-500' },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart, color: 'from-green-500 to-emerald-500' },
    { id: 'leaderboard', label: 'Ranking', icon: TrendingUp, color: 'from-cyan-500 to-blue-500' },
    { id: 'profile', label: 'Profile', icon: User, color: 'from-indigo-500 to-purple-500' }
  ];

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 safe-area"
    >
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-purple-900/40 to-transparent backdrop-blur-xl border-t border-white/10" />
      
      {/* Navigation Content */}
      <div className="relative px-4 py-3">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(item.id)}
                className={`flex flex-col items-center space-y-1 p-3 rounded-2xl transition-all duration-300 touch-manipulation ${
                  isActive 
                    ? `bg-gradient-to-r ${item.color} shadow-lg neon-glow` 
                    : 'hover:bg-white/10'
                }`}
              >
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    rotate: isActive ? [0, 5, -5, 0] : 0
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                </motion.div>
                <span className={`text-xs font-bold ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
                
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-1 h-1 bg-white rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}

export default BottomNavigation;