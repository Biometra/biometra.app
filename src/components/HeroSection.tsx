import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, TrendingUp, Star, Coins, CheckCircle, Circle, ArrowRight, Rocket, Target, Trophy, Globe, Shield, Cpu, Smartphone, DollarSign, Award, Clock, Play } from 'lucide-react';
import GlobalCountdown from './GlobalCountdown';
import { useAuth } from '../context/AuthContext';

function HeroSection() {
  const { setShowDailyRewardModal } = useAuth();

  const roadmapItems = [
    {
      phase: "Phase 1",
      title: "Platform Foundation",
      description: "Core mining system, user authentication, referral program, and basic gameplay mechanics",
      status: "completed",
      date: "Q4 2024",
      icon: Rocket,
      color: "from-green-500 to-emerald-500",
      achievements: ["✅ Tap Mining System", "✅ User Registration", "✅ Referral Program", "✅ Energy System"]
    },
    {
      phase: "Phase 2", 
      title: "Token Presale & Features",
      description: "$BIO token presale launch with exclusive bonuses, claw machine, leaderboards, and advanced features",
      status: "active",
      date: "Q1 2025",
      icon: Target,
      color: "from-purple-500 to-pink-500",
      achievements: ["🔥 Token Presale", "🎮 Claw Machine", "🏆 Leaderboards", "⚡ Auto-Mining"]
    },
    {
      phase: "Phase 3",
      title: "DEX Launch & Trading",
      description: "Official $BIO token launch on major decentralized exchanges with liquidity pools and staking",
      status: "upcoming",
      date: "Q2 2025", 
      icon: Trophy,
      color: "from-cyan-500 to-blue-500",
      achievements: ["🚀 DEX Listing", "💧 Liquidity Pools", "🔒 Staking Rewards", "📈 Price Discovery"]
    },
    {
      phase: "Phase 4",
      title: "Ecosystem Expansion",
      description: "Multi-language support, mobile app, partnerships, NFT integration, and global community growth",
      status: "upcoming",
      date: "Q3 2025",
      icon: Globe,
      color: "from-yellow-500 to-orange-500",
      achievements: ["🌍 Global Launch", "📱 Mobile App", "🤝 Partnerships", "🎨 NFT Integration"]
    }
  ];

  const features = [
    { 
      icon: Smartphone, 
      title: 'Tap-to-Earn Mining', 
      desc: 'Simple tap mechanics to mine $BIO tokens instantly with energy system',
      color: 'from-purple-500 to-pink-500',
      stats: '1M+ Taps Daily'
    },
    { 
      icon: Cpu, 
      title: 'Auto Mining System', 
      desc: 'Advanced automated mining that works 24/7 even when offline',
      color: 'from-cyan-500 to-blue-500',
      stats: 'Up to 3600 ORE/Hour'
    },
    { 
      icon: Users, 
      title: 'Referral Network', 
      desc: 'Multi-level referral system with lifetime commissions and bonuses',
      color: 'from-green-500 to-emerald-500',
      stats: '5% Commission Rate'
    },
    { 
      icon: Trophy, 
      title: 'Competitive Gaming', 
      desc: 'Leaderboards, claw machine, lucky draws with real rewards',
      color: 'from-yellow-500 to-orange-500',
      stats: '10K+ Active Players'
    }
  ];

  const tokenomics = [
    { label: 'Mining Rewards', percentage: 40, color: 'from-cyan-400 to-blue-500', amount: '2B' },
    { label: 'Presale', percentage: 30, color: 'from-purple-400 to-pink-500', amount: '1.5B' },
    { label: 'Development', percentage: 20, color: 'from-green-400 to-emerald-500', amount: '1B' },
    { label: 'Marketing', percentage: 10, color: 'from-yellow-400 to-orange-500', amount: '500M' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'active':
        return (
          <motion.div 
            className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Play className="w-4 h-4 text-white" />
          </motion.div>
        );
      default:
        return <Circle className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'active':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/50 animate-pulse';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <section className="flex flex-col justify-start min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto space-y-16">
        {/* Hero Brand Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div 
            className="mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full mb-6 neon-glow animate-float">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
              Bio<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">metra</span>
            </h1>
            <p className="text-3xl text-purple-300 mb-6 font-bold">The Future of Crypto Mining</p>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Revolutionary tap-to-earn platform where biometric data meets blockchain technology. 
              Mine $BIO tokens, compete globally, and earn real rewards through innovative gameplay.
            </p>
            
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { label: 'Total Supply', value: '5B $BIO', icon: Coins },
                { label: 'Active Miners', value: '50K+', icon: Users },
                { label: 'Total Mined', value: '10M+ ORE', icon: TrendingUp },
                { label: 'Rewards Paid', value: '$100K+', icon: DollarSign }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="mobile-card p-4 text-center"
                  >
                    <Icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-xl font-black text-white">{stat.value}</div>
                    <div className="text-xs text-gray-300">{stat.label}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Presale Countdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mb-12"
          >
            <div className="mobile-card p-8 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500/50">
              <div className="text-center">
                <div className="text-2xl font-black text-white mb-4">🚀 $BIO Token Presale</div>
                <GlobalCountdown />
                <div className="text-purple-300 mt-4">Get exclusive early access with bonus rewards!</div>
              </div>
            </div>
          </motion.div>

          {/* Daily Rewards CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mb-12"
          >
            <div className="mobile-card p-6 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500/50">
              <div className="text-center">
                <div className="text-xl font-black text-white mb-3">📅 Daily Login Rewards</div>
                <div className="text-yellow-300 mb-4">Login setiap hari untuk mendapatkan ORE gratis!</div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDailyRewardModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:opacity-90 transition-all neon-glow"
                >
                  🎁 Check Daily Rewards
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Platform Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h2 className="text-4xl font-black text-white mb-4">⚡ Platform Features</h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg">
              Experience next-generation crypto mining with innovative features designed for maximum earnings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 * index, duration: 0.6 }}
                  className="mobile-card p-8 hover:scale-105 transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center neon-glow flex-shrink-0`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-300 text-sm mb-3 leading-relaxed">{feature.desc}</p>
                      <div className={`inline-block px-3 py-1 bg-gradient-to-r ${feature.color}/20 border border-current/30 rounded-full text-xs font-bold text-white`}>
                        {feature.stats}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Enhanced Roadmap Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h2 className="text-4xl font-black text-white mb-4">🗺️ Development Roadmap</h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg">
              Follow our journey as we revolutionize the crypto mining industry with cutting-edge technology
            </p>
          </div>

          <div className="space-y-8">
            {roadmapItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.phase}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 * index, duration: 0.8 }}
                  className="relative"
                >
                  {/* Enhanced Connecting Line */}
                  {index < roadmapItems.length - 1 && (
                    <div className="absolute left-8 top-24 w-1 h-20 bg-gradient-to-b from-purple-500 via-cyan-500 to-transparent rounded-full opacity-60"></div>
                  )}
                  
                  <div className={`mobile-card p-8 border-l-4 hover:scale-102 transition-all duration-500 ${
                    item.status === 'completed' ? 'border-green-500 bg-gradient-to-r from-green-900/20 to-transparent' :
                    item.status === 'active' ? 'border-purple-500 bg-gradient-to-r from-purple-900/30 to-pink-900/20 neon-glow' : 
                    'border-gray-500 bg-gradient-to-r from-gray-900/20 to-transparent'
                  }`}>
                    <div className="flex items-start space-x-6">
                      {/* Enhanced Status Icon */}
                      <div className="flex-shrink-0 mt-2">
                        {getStatusIcon(item.status)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r ${item.color} rounded-2xl neon-glow`}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-purple-300 mb-1">{item.phase}</div>
                              <h3 className="text-2xl font-black text-white">{item.title}</h3>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(item.status)}`}>
                            {item.status.toUpperCase()}
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-base mb-4 leading-relaxed">
                          {item.description}
                        </p>
                        
                        {/* Achievements Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {item.achievements.map((achievement, idx) => (
                            <div key={idx} className="text-sm text-gray-300 bg-black/30 rounded-lg px-3 py-2">
                              {achievement}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-purple-400 font-bold flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{item.date}</span>
                          </div>
                          {item.status === 'active' && (
                            <motion.div 
                              className="flex items-center space-x-2 text-purple-400 text-sm font-bold"
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <span>IN PROGRESS</span>
                              <ArrowRight className="w-4 h-4" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Enhanced Tokenomics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h2 className="text-4xl font-black text-white mb-4">💎 $BIO Tokenomics</h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg">
              Carefully designed token distribution for sustainable growth and maximum value
            </p>
          </div>

          <div className="mobile-card p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Token Distribution Chart */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Token Distribution</h3>
                {tokenomics.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 bg-black/30 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 bg-gradient-to-r ${item.color} rounded-full`}></div>
                      <span className="text-white font-semibold">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{item.percentage}%</div>
                      <div className="text-gray-400 text-sm">{item.amount}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Key Metrics */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Total Supply', value: '5,000,000,000', suffix: '$BIO' },
                    { label: 'Initial Price', value: '$0.001', suffix: 'USDT' },
                    { label: 'Market Cap', value: '$5M', suffix: 'Target' },
                    { label: 'Listing Price', value: '$0.01', suffix: 'Expected' }
                  ].map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-xl p-4 text-center border border-purple-500/30"
                    >
                      <div className="text-2xl font-black text-white mb-1">{metric.value}</div>
                      <div className="text-xs text-purple-300 font-bold">{metric.suffix}</div>
                      <div className="text-xs text-gray-400 mt-1">{metric.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="text-center mb-32"
        >
          <div className="mobile-card p-8 bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-cyan-900/50 border-2 border-purple-500/50">
            <div className="text-3xl font-black text-white mb-4">🎯 Ready to Start Mining?</div>
            <div className="text-lg text-purple-300 mb-6">
              Join thousands of miners earning $BIO tokens daily through our innovative platform
            </div>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Secure & Verified</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>Proven Rewards</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Active Community</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;