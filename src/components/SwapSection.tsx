import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Lock, CheckCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';

function SwapSection() {
  const { wallet, isConnected, connectWallet } = useWallet();
  const { oreBalance, level, swapToBio, totalTaps } = useGame();
  const [swapAmount, setSwapAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const canSwap = level >= 3;
  const swapRate = 0.001; // 1 ORE = 0.01 BIO
  const bioAmount = parseFloat(swapAmount || '0') * swapRate;

  const handleSwap = async () => {
    if (!isConnected) {
      toast.error('Connect wallet for deposits/withdrawals');
      return;
    }

    if (!canSwap) {
      toast.error('Must reach BIO-3 level to swap');
      return;
    }

    const amount = parseFloat(swapAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter valid amount');
      return;
    }

    if (amount > oreBalance) {
      toast.error('Insufficient ORE balance');
      return;
    }

    setIsSwapping(true);
    try {
      await swapToBio(amount);
      setSwapAmount('');
    } finally {
      setIsSwapping(false);
    }
  };

  const levelRequirements = [
    { level: 1, requirement: 'Connect Wallet', completed: isConnected },
    { level: 2, requirement: 'Mine 500 ORE', completed: oreBalance >= 500 || totalTaps >= 500 },
    { level: 3, requirement: 'Reach BIO-3 Level', completed: level >= 3 },
  ];

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Swap to $BIO Tokens</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Convert your mined ORE particles into $BIO tokens on Binance Smart Chain. Unlock real value from your mining efforts.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Swap Interface */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">ORE → $BIO Swap</h3>
              
              {canSwap ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-purple-300 mb-2">ORE Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        placeholder="Enter ORE amount"
                        className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                      />
                      <button
                        onClick={() => setSwapAmount(oreBalance.toString())}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 text-sm font-semibold"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Available: {oreBalance.toFixed(2)} ORE
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full">
                      <ArrowRight className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-cyan-300 mb-2">$BIO Amount</label>
                    <div className="px-4 py-3 bg-black/50 border border-cyan-500/30 rounded-lg text-white">
                      {bioAmount.toFixed(4)} $BIO
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Rate: 1 ORE = {swapRate} $BIO
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={swapAmount && !isSwapping ? handleSwap : connectWallet}
                    disabled={isSwapping}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                      isSwapping
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : !isConnected 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white'
                          : swapAmount
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSwapping ? 'Processing...' : !isConnected ? 'Connect Wallet for Deposits' : 'Swap to $BIO'}
                  </motion.button>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>BEP-20 tokens will be sent to your wallet</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">Swap Locked</h4>
                  <p className="text-gray-300 mb-6">
                    Reach BIO-3 level to unlock $BIO token swapping
                  </p>
                  <div className="text-lg font-semibold text-purple-400">
                    Current Level: BIO-{level}
                  </div>
                </div>
              )}
            </div>

            {/* Requirements & Info */}
            <div className="space-y-6">
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-6">Unlock Requirements</h3>
                <div className="space-y-4">
                  {levelRequirements.map((req, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className={`flex items-center space-x-3 p-3 rounded-lg ${
                        req.completed
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-gray-500/10 border border-gray-500/30'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        req.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-500 text-gray-300'
                      }`}>
                        {req.completed ? <CheckCircle className="w-5 h-5" /> : req.level}
                      </div>
                      <span className={req.completed ? 'text-green-400' : 'text-gray-400'}>
                        {req.requirement}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-4">$BIO Token Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Wallet Status</span>
                    <span className={isConnected ? 'text-green-400' : 'text-orange-400'}>
                      {isConnected ? '✅ Connected' : '⚠️ Connect for deposits'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Network</span>
                    <span className="text-white">Binance Smart Chain</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Token Type</span>
                    <span className="text-white">BEP-20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Current Rate</span>
                    <span className="text-white">1 ORE = 0.001 $BIO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Min. Swap</span>
                    <span className="text-white">100 ORE</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                <h4 className="text-lg font-bold text-white mb-2">💡 Note</h4>
                <p className="text-blue-300 text-sm">
                  Wallet connection is only required for deposits and withdrawals. You can mine and play without connecting a wallet.
                </p>
              </div>
            </div>
          </div>
          
          {/* Mobile spacing for footer */}
          <div className="h-32 md:h-0"></div>
        </div>
      </div>
    </section>
  );
}

export default SwapSection;