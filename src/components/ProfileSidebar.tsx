import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ChevronDown, LogOut, UserCircle, Settings, Lock,
  Users, ArrowRightLeft, Zap, BookOpen, MessageCircle, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import SupportModal from './SupportModal';
import toast from 'react-hot-toast';

interface ProfileSidebarProps {
  onNavigate: (page: string) => void;
}

function ProfileSidebar({ onNavigate }: ProfileSidebarProps) {
  const { user, logout, setShowDailyRewardModal } = useAuth();
  const { oreBalance, bioBalance, level, usdtBalance } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 hover:border-white/30 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
      >
        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-white" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-white truncate max-w-20">
            {user.username}
          </div>
          <div className="text-xs text-purple-300">
            L{level}
          </div>
        </div>
        <ChevronDown className={`w-3 h-3 text-purple-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(147, 51, 234, 0.5) transparent' }}>
              <div className="p-3">
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', y: -1 }}
                  onClick={() => handleNavigation('profile')}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">My Profile</div>
                      <div className="text-xs text-gray-300">Stats & Settings</div>
                    </div>
                  </div>
                </motion.button>
              </div>

              <div className="px-3 pb-3">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-green-300 font-bold">${usdtBalance?.toFixed(1) || '0.0'}</div>
                      <div className="text-gray-400">USDT</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 font-bold">{oreBalance.toFixed(0)}</div>
                      <div className="text-gray-400">ORE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-bold">{bioBalance.toFixed(2)}</div>
                      <div className="text-gray-400">BIO</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3 space-y-1">
                {/* Menu Items */}
                {[
                  { label: "Swap ORE", sub: "Convert to BIO", icon: <ArrowRightLeft />, color: "from-green-500 to-emerald-500", page: "swap" },
                  { label: "Upgrades", sub: "Boost mining", icon: <Zap />, color: "from-cyan-500 to-blue-500", page: "upgrade" },
                  { label: "Referrals", sub: "Invite friends", icon: <Users />, color: "from-rose-500 to-pink-500", page: "referral" },
                  { label: "Tutorials", sub: "Learn & guides", icon: <BookOpen />, color: "from-blue-500 to-indigo-500", page: "tutorials" },
                ].map(({ label, sub, icon, color, page }) => (
                  <motion.button
                    key={label}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', y: -1 }}
                    onClick={() => handleNavigation(page)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all"
                  >
                    <div className={`w-6 h-6 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center`}>
                      {React.cloneElement(icon, { className: "w-3 h-3 text-white" })}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-xs text-gray-300">{sub}</div>
                    </div>
                  </motion.button>
                ))}

                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', y: -1 }}
                  onClick={() => {
                    setShowDailyRewardModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Daily Check-in</div>
                    <div className="text-xs text-yellow-300">Claim daily ORE</div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', y: -1 }}
                  onClick={() => {
                    setShowSupport(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Support</div>
                    <div className="text-xs text-blue-300">Get help</div>
                  </div>
                </motion.button>
              </div>

              <div className="p-3 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/30 rounded-lg hover:border-red-400/50 transition-all"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <LogOut className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Logout</div>
                    <div className="text-xs text-red-400">Disconnect</div>
                  </div>
                </motion.button>
              </div>

              <div className="px-3 pb-3">
                <div className="flex items-center justify-between text-xs bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                  <span className="text-purple-300 truncate max-w-32">{user.email}</span>
                  <span className="text-green-400 flex items-center text-xs">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    Online
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />
    </div>
  );
}

export default ProfileSidebar;
