import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Pickaxe, Battery, Trophy } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

function GameSection() {
  const { isAuthenticated } = useAuth();
  const { oreBalance, totalTaps, tapPower, multiplier, energy, maxEnergy, tap, autoTapActive, isLoading, energyRefillCountdown } = useGame();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [particleId, setParticleId] = useState(0);
  const [tapsThisSession, setTapsThisSession] = useState(0);
  const [sessionStart] = useState(Date.now());

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isAuthenticated || energy <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Create particle effect
    const newParticle = { id: particleId, x, y };
    setParticles(prev => [...prev, newParticle]);
    setParticleId(prev => prev + 1);
    setTapsThisSession(prev => prev + 1);

    // Remove particle after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1500);

    tap();
  };

  if (isLoading && isAuthenticated) {
    return (
      <section className="flex flex-col justify-center min-h-full px-4 py-8">
        <div className="container mx-auto text-center">
          <div className="mobile-card p-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Pickaxe className="w-8 h-8 text-white" />
            </div>
            <div className="text-white text-xl font-bold">Loading Mining Data...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col justify-center min-h-full px-4 py-8 overflow-hidden">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-black text-white mb-2">⚡ Mining Station</h2>
          <p className="text-purple-300 font-medium">Tap the core to mine ORE tokens</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div 
            className="mobile-card p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-yellow-300 text-sm font-bold">ORE</span>
            </div>
            <div className="text-2xl font-black text-white">{oreBalance.toFixed(0)}</div>
            <div className="text-xs text-gray-400">Balance</div>
          </motion.div>

          <motion.div 
            className="mobile-card p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center mb-2">
              <Pickaxe className="w-5 h-5 text-cyan-400 mr-2" />
              <span className="text-cyan-300 text-sm font-bold">Power</span>
            </div>
            <div className="text-2xl font-black text-white">{tapPower}</div>
            <div className="text-xs text-gray-400">x{multiplier.toFixed(1)}</div>
          </motion.div>

          <motion.div 
            className="mobile-card p-4 text-center col-span-2"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-purple-300 text-sm font-bold">Total Taps</span>
            </div>
            <div className="text-3xl font-black text-white">{totalTaps.toLocaleString()}</div>
            {autoTapActive && (
              <div className="mt-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-bold inline-block">
                ⚡ Auto-Mining Active
              </div>
            )}
          </motion.div>
        </div>

        {/* Energy Bar */}
        <motion.div 
          className="mobile-card p-4 mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Battery className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 text-sm font-bold">Energy</span>
            </div>
            <span className="text-white font-black text-sm">{energy}/{maxEnergy}</span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-4 mb-2 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-4 rounded-full neon-glow"
              initial={{ width: 0 }}
              animate={{ width: `${(energy / maxEnergy) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="text-xs text-center">
            <span className={energy === maxEnergy ? 'text-green-400' : 'text-gray-400'}>
              {energy === maxEnergy ? '🔋 Full Energy' : `⚡ Next refill in ${energyRefillCountdown}s`}
            </span>
          </div>
        </motion.div>

        {/* Mining Core */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onTouchStart={handleTap}
              onMouseDown={handleTap}
              disabled={!isAuthenticated}
              className={`relative w-64 h-64 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-cyan-500 border-4 border-purple-400/50 shadow-2xl transition-all duration-300 touch-manipulation ${
                isAuthenticated ? 'neon-glow cursor-pointer active:scale-90' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-400/30 to-cyan-400/30 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: autoTapActive ? 360 : 0 }}
                    transition={{ duration: 2, repeat: autoTapActive ? Infinity : 0, ease: "linear" }}
                  >
                    <Zap className="w-16 h-16 text-white mx-auto mb-2" />
                  </motion.div>
                  <div className="text-white font-black text-lg">
                    {autoTapActive ? 'AUTO MINING' : 'TAP TO MINE'}
                  </div>
                  <div className="text-purple-200 text-sm font-bold">+{tapPower} ORE</div>
                </div>
              </div>

              {/* Particle Effects */}
              <AnimatePresence>
                {particles.map(particle => (
                  <motion.div
                    key={particle.id}
                    initial={{ opacity: 1, scale: 1, x: particle.x - 128, y: particle.y - 128 }}
                    animate={{ 
                      opacity: 0, 
                      scale: 0.5, 
                      y: particle.y - 250,
                      x: particle.x - 128 + (Math.random() - 0.5) * 100
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute pointer-events-none text-xl font-black text-yellow-400 z-10"
                    style={{ left: '50%', top: '50%' }}
                  >
                    +{tapPower}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Pulse Animation for Auto-Tap */}
              {autoTapActive && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-green-400/70"
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </motion.button>

            {/* Status Overlays */}
            {!isAuthenticated && (
              <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-lg font-bold mb-2">🔒 Login Required</div>
                  <div className="text-sm text-gray-300">to start mining</div>
                </div>
              </div>
            )}
            
            {isAuthenticated && energy <= 0 && (
              <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-lg font-bold mb-2">⚡ No Energy</div>
                  <div className="text-sm text-gray-300">Wait for regeneration</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session Stats */}
        <motion.div 
          className="mobile-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-bold text-white mb-4 text-center">📊 Mining Performance</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-300">Session Taps</div>
              <div className="text-xl font-black text-purple-400">{tapsThisSession}</div>
            </div>
            <div>
              <div className="text-sm text-gray-300">ORE/Hour</div>
              <div className="text-xl font-black text-cyan-400">
                {autoTapActive 
                  ? (tapPower * multiplier * 3600).toFixed(0)
                  : tapsThisSession > 0 
                    ? ((tapsThisSession * tapPower * multiplier * 60) / (Date.now() - sessionStart) * 1000 * 60).toFixed(0)
                    : '0'
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300">Status</div>
              <div className={`text-xl font-black ${autoTapActive ? 'text-green-400' : 'text-yellow-400'}`}>
                {autoTapActive ? 'AUTO' : 'MANUAL'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default GameSection;