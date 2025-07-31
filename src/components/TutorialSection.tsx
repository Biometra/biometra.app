import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, Play, Users, Zap, Gift, Trophy, Coins, Settings, MessageCircle, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Tutorial {
  id: string;
  title: string;
  content: string;
  category: string;
  order_index: number;
  is_active: boolean;
}

interface TutorialCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
}

function TutorialSection() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories] = useState<TutorialCategory[]>([
    {
      id: 'mining',
      name: 'Mining System',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      description: 'Learn how to mine ORE tokens and upgrade your equipment'
    },
    {
      id: 'referral',
      name: 'Referral Program',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      description: 'Invite friends and earn commissions from their activities'
    },
    {
      id: 'games',
      name: 'Games & Lucky Draw',
      icon: Gift,
      color: 'from-pink-500 to-rose-500',
      description: 'Play games and participate in lucky draws for rewards'
    },
    {
      id: 'ranking',
      name: 'Ranking System',
      icon: Trophy,
      color: 'from-purple-500 to-indigo-500',
      description: 'Compete in leaderboards and claim ranking rewards'
    },
    {
      id: 'tokens',
      name: 'Token System',
      icon: Coins,
      color: 'from-cyan-500 to-blue-500',
      description: 'Understand ORE, BIO tokens and swap mechanisms'
    },
    {
      id: 'upgrades',
      name: 'Upgrades & Robots',
      icon: Settings,
      color: 'from-indigo-500 to-purple-500',
      description: 'Upgrade your mining power and buy auto-mining robots'
    },
    {
      id: 'presale',
      name: 'Presale Events',
      icon: Coins,
      color: 'from-orange-500 to-red-500',
      description: 'Participate in BIO token presale events'
    },
    {
      id: 'support',
      name: 'Customer Support',
      icon: MessageCircle,
      color: 'from-blue-500 to-cyan-500',
      description: 'Get help and contact our support team'
    }
  ]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('mining');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Default tutorial content
  const defaultTutorials: Omit<Tutorial, 'id'>[] = [
    // Mining System
    {
      title: 'Getting Started with Mining',
      content: `# 🎯 Welcome to Biometra Mining!

## What is Mining?
Mining in Biometra means tapping the mining core to earn ORE tokens. Each tap consumes 1 energy and gives you ORE based on your mining power.

## Basic Mining Steps:
1. **Tap the Core**: Click or tap the glowing mining core
2. **Earn ORE**: Each tap gives you ORE tokens
3. **Watch Energy**: Each tap uses 1 energy point
4. **Wait for Refill**: Energy refills 1 point every 30 seconds

## Mining Stats:
- **Mining Power**: ORE earned per tap
- **Multiplier**: Multiplies your ORE earnings
- **Energy**: Required for each tap (max 300 initially)
- **Level**: Unlocks new features and bonuses

## Tips:
- Mine regularly to maximize earnings
- Upgrade your mining power for better rewards
- Buy auto-mining robots for passive income
- Participate in events for bonus rewards`,
      category: 'mining',
      order_index: 1,
      is_active: true
    },
    {
      title: 'Energy System Guide',
      content: `# ⚡ Understanding Energy System

## How Energy Works:
- **Starting Capacity**: 300 energy points
- **Consumption**: 1 energy per tap
- **Regeneration**: 1 energy every 30 seconds
- **Maximum**: Cannot exceed your energy capacity

## Upgrading Energy Capacity:
### With ORE (First 10 upgrades):
- Cost: 1,000 ORE per upgrade
- Bonus: +25 energy capacity
- Maximum: 400 total capacity (300 + 10×25)

### With USDT (After 400 capacity):
- Cost: $1 USDT per upgrade
- Bonus: +50 energy capacity
- No limit on upgrades

## Energy Tips:
- Plan your mining sessions around energy refill
- Upgrade capacity for longer mining sessions
- Auto-mining robots don't use energy
- Energy refills even when offline`,
      category: 'mining',
      order_index: 2,
      is_active: true
    },
    
    // Referral System
    {
      title: 'Referral Program Overview',
      content: `# 👥 Referral Program Guide

## How Referrals Work:
Share your unique referral code with friends and earn rewards when they join and play!

## Referral Rewards:
- **Signup Bonus**: +250 ORE when someone uses your code
- **Friend Bonus**: Your friend gets +50 ORE bonus
- **Commission**: Earn 5% on all their purchases
- **Lucky Draw**: Get 1 free draw per referral

## Referral Milestones:
- **25 referrals**: +5 BIO tokens
- **50 referrals**: +15 BIO tokens  
- **100 referrals**: +35 BIO tokens
- **200 referrals**: +75 BIO tokens
- **300 referrals**: +155 BIO tokens

## How to Refer:
1. Go to Referral section
2. Copy your referral code or link
3. Share with friends on social media
4. They sign up using your code
5. You both get rewards!

## Tips:
- Share on multiple platforms for maximum reach
- Explain the benefits to your friends
- Help them get started for better retention`,
      category: 'referral',
      order_index: 1,
      is_active: true
    },
    
    // Games & Lucky Draw
    {
      title: 'Lucky Draw System',
      content: `# 🎰 Lucky Draw Guide

## How Lucky Draw Works:
Collect coins by spinning the wheel, accumulate up to 750 coins, then claim BIO tokens!

## Getting Draw Chances:
- **Free Draw**: 1 free spin when you start
- **Referral Draws**: 1 spin per successful referral
- **Purchase Draws**: Buy spins for $0.5 each

## Prize Wheel:
- **1-50 coins**: Common (60% chance)
- **51-100 coins**: Rare (25% chance)
- **101-200 coins**: Epic (12% chance)
- **201-500 coins**: Legendary (3% chance)

## Claiming Rewards:
- Collect exactly 750 coins to claim
- Receive BIO tokens as reward
- Counter resets after claiming
- Continue collecting for next claim

## Strategy Tips:
- Use free draw first
- Invite friends for more chances
- Buy additional spins if close to 750
- Lucky draws are the main referral reward`,
      category: 'games',
      order_index: 1,
      is_active: true
    },
    {
      title: 'Claw Machine Battle',
      content: `# 🎮 Claw Machine Guide

## About Claw Machine:
Play the claw machine to grab prizes including ORE, BIO tokens, and energy boosts!

## How to Play:
1. **Pay Entry Fee**: Costs ORE to play
2. **Watch Animation**: Claw moves to grab prizes
3. **Get Rewards**: Receive your grabbed prize
4. **Cooldown**: Wait 24 hours for next free play

## Available Prizes:
- **ORE Tokens**: Direct ORE rewards
- **BIO Tokens**: Valuable BIO tokens
- **Energy Boosts**: Temporary energy increases
- **Mining Upgrades**: Equipment improvements

## Prize Rarities:
- **Common**: 60% chance, basic rewards
- **Rare**: 25% chance, better rewards
- **Epic**: 12% chance, great rewards
- **Legendary**: 3% chance, amazing rewards

## Tips:
- Play daily for maximum rewards
- Higher rarity = better prizes
- Save ORE for important plays
- Prizes are applied automatically`,
      category: 'games',
      order_index: 2,
      is_active: true
    },
    
    // Ranking System
    {
      title: 'Ranking & Leaderboards',
      content: `# 🏆 Ranking System Guide

## Leaderboard Categories:
- **Lifetime ORE**: Total ORE mined ever
- **Current ORE**: Current ORE balance
- **BIO Level**: Your current level
- **Referrals**: Number of successful referrals

## Ranking Rewards (Every 5 Hours):
- **Rank 1**: Special rewards + Champion badge
- **Rank 2-3**: Great rewards + Elite badges
- **Rank 4-5**: Good rewards + Pro badges
- **Rank 6-10**: Decent rewards + Rising Star badges

## How to Climb Rankings:
1. **Mine Consistently**: Regular mining increases lifetime ORE
2. **Upgrade Equipment**: Better tools = faster progress
3. **Invite Friends**: Referrals boost your ranking
4. **Participate in Events**: Special events give bonus points

## Ranking Benefits:
- **Exclusive Badges**: Show off your achievements
- **BIO Rewards**: Earn valuable BIO tokens
- **Recognition**: Top players get special status
- **Competitions**: Compete with global players

## Tips:
- Check rankings regularly
- Claim rewards within time limit
- Focus on lifetime ORE for best ranking
- Help others to build community`,
      category: 'ranking',
      order_index: 1,
      is_active: true
    },
    
    // Token System
    {
      title: 'ORE and BIO Tokens',
      content: `# 💎 Token System Guide

## ORE Tokens:
- **Purpose**: Primary mining reward and utility token
- **Earning**: Mine by tapping, complete tasks, referrals
- **Uses**: Upgrades, games, swap to BIO tokens
- **No Limit**: Mine as much as you can!

## BIO Tokens:
- **Purpose**: Main project token with real value
- **Total Supply**: 5,000,000,000 BIO (5B tokens)
- **Earning**: Swap from ORE, lucky draws, ranking rewards
- **Uses**: Presale participation, withdrawal to wallet

## Token Conversion:
### ORE to BIO Swap:
- **Requirement**: Level 15 minimum
- **Rate**: Variable based on market conditions
- **Fee**: 150 ORE per swap transaction
- **Process**: Instant conversion

### BIO Withdrawal:
- **Requirement**: Level 30 minimum
- **Fee**: $0.5 USDT per withdrawal
- **Network**: BEP-20 (Binance Smart Chain)
- **Process**: Admin approval required

## Token Economics:
- **Mining Rewards**: 40% (2B BIO)
- **Presale**: 30% (1.5B BIO)
- **Development**: 20% (1B BIO)
- **Marketing**: 10% (500M BIO)`,
      category: 'tokens',
      order_index: 1,
      is_active: true
    },
    
    // Upgrades & Robots
    {
      title: 'Mining Upgrades & Auto Robots',
      content: `# 🤖 Upgrades & Auto Mining Guide

## Mining Power Upgrades:
### With ORE (Levels 1-11):
- **Level 2**: 150 ORE (+1 power)
- **Level 3**: 300 ORE (+1 power)
- **Level 4**: 450 ORE (+1 power)
- **...continues**: +150 ORE per level
- **Level 11**: 1,500 ORE (+1 power)

### With USDT (Level 12+):
- **Cost**: $1 USDT per level
- **Benefit**: +1 mining power per level
- **No Limit**: Upgrade as high as you want

## Multiplier System:
- **2x Multiplier**: $1 USDT
- **3x Multiplier**: $1.5 USDT
- **4x Multiplier**: $2 USDT
- **Pattern**: +$0.5 per level

## Auto Mining Robots:
### Robot Levels & Pricing:
- **Level 1**: 1,000 taps/hour - $1 USDT
- **Level 2**: 2,100 taps/hour - $2 USDT
- **Level 3**: 4,500 taps/hour - $4 USDT
- **Level 4**: 10,000 taps/hour - $8 USDT
- **Level 5**: 21,000 taps/hour - $15 USDT

### Robot Benefits:
- **Passive Mining**: Mines even when offline
- **No Energy Cost**: Doesn't use your energy
- **Claim System**: Collect earnings manually
- **Permanent**: One-time purchase, lifetime benefit`,
      category: 'upgrades',
      order_index: 1,
      is_active: true
    },
    
    // Presale Events
    {
      title: 'BIO Token Presale Events',
      content: `# 🚀 Presale Events Guide

## How Presales Work:
Every 10 days, we hold a BIO token presale event where you can buy BIO tokens at special prices!

## Presale Schedule:
- **Frequency**: Every 10 days
- **Duration**: Limited time only
- **Availability**: First come, first served
- **Payment**: USDT only

## Presale Progression:
### Event 1:
- **Price**: $0.2 per BIO token
- **Supply**: 100,000 BIO tokens
- **Total Value**: $20,000

### Future Events:
- **Price Increase**: Each event has higher prices
- **Supply Increase**: More tokens available
- **Demand Growth**: Limited availability creates urgency

## Presale Benefits:
- **Early Access**: Get BIO tokens before public launch
- **Discounted Price**: Lower than future market price
- **Guaranteed Allocation**: Secure your tokens
- **Investment Opportunity**: Potential for price appreciation

## How to Participate:
1. **Prepare USDT**: Have USDT ready in your account
2. **Watch Announcements**: Follow presale notifications
3. **Act Fast**: Limited supply sells out quickly
4. **Confirm Purchase**: Complete transaction promptly

## Tips:
- Set reminders for presale dates
- Deposit USDT in advance
- Participate early for best allocation
- Consider it a long-term investment`,
      category: 'presale',
      order_index: 1,
      is_active: true
    },
    
    // Customer Support
    {
      title: 'Getting Help & Support',
      content: `# 💬 Customer Support Guide

## How to Get Help:
We're here to help you succeed in Biometra! Here are the ways to get support:

## Telegram Support:
- **Official Channel**: @BiometraSupport
- **Response Time**: 24-48 hours
- **Languages**: English, Indonesian
- **Available**: 24/7 automated, business hours for human support

## Common Issues & Solutions:

### Mining Problems:
- **No Energy**: Wait for regeneration or upgrade capacity
- **Low ORE**: Upgrade mining power and multiplier
- **Technical Issues**: Refresh page or clear browser cache

### Account Issues:
- **Login Problems**: Check email/password, reset if needed
- **Balance Issues**: Wait for sync or contact support
- **Referral Problems**: Verify referral code format

### Payment Issues:
- **USDT Deposits**: Check transaction hash and network
- **Withdrawal Delays**: Admin approval takes 24-48 hours
- **Failed Transactions**: Contact support with details

## Before Contacting Support:
1. **Check Tutorials**: Most answers are in tutorials
2. **Try Basic Fixes**: Refresh, logout/login, clear cache
3. **Gather Information**: Screenshots, error messages, transaction IDs
4. **Be Specific**: Describe the exact problem and steps

## What to Include in Support Requests:
- **Your Username/Email**
- **Detailed Problem Description**
- **Screenshots if Applicable**
- **Transaction IDs for Payment Issues**
- **Device/Browser Information**

Remember: Our team is committed to helping you succeed!`,
      category: 'support',
      order_index: 1,
      is_active: true
    }
  ];

  // Fetch tutorials from database
  const fetchTutorials = async () => {
    if (!isSupabaseConfigured()) {
      // Use default tutorials in demo mode
      const mockTutorials = defaultTutorials.map((tutorial, index) => ({
        ...tutorial,
        id: `tutorial_${index + 1}`
      }));
      setTutorials(mockTutorials);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('order_index');

      if (error) {
        console.error('Error fetching tutorials:', error);
        // Fallback to default tutorials
        const mockTutorials = defaultTutorials.map((tutorial, index) => ({
          ...tutorial,
          id: `tutorial_${index + 1}`
        }));
        setTutorials(mockTutorials);
      } else if (data && data.length > 0) {
        setTutorials(data);
      } else {
        // Insert default tutorials if none exist
        const { data: insertedTutorials, error: insertError } = await supabase
          .from('tutorials')
          .insert(defaultTutorials)
          .select();

        if (insertError) {
          console.error('Error inserting default tutorials:', insertError);
          const mockTutorials = defaultTutorials.map((tutorial, index) => ({
            ...tutorial,
            id: `tutorial_${index + 1}`
          }));
          setTutorials(mockTutorials);
        } else {
          setTutorials(insertedTutorials || []);
        }
      }
    } catch (error) {
      console.error('Error with tutorials:', error);
      const mockTutorials = defaultTutorials.map((tutorial, index) => ({
        ...tutorial,
        id: `tutorial_${index + 1}`
      }));
      setTutorials(mockTutorials);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTutorials();
  }, []);

  const getCategoryTutorials = (categoryId: string) => {
    return tutorials.filter(tutorial => tutorial.category === categoryId);
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-purple-300 mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-cyan-300 mb-2 mt-4">$1</h3>')
      .replace(/^\- (.*$)/gm, '<li class="text-gray-300 mb-1">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="text-gray-300 mb-1">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\n\n/g, '</p><p class="text-gray-300 mb-4">')
      .replace(/^(?!<[h|l])(.*$)/gm, '<p class="text-gray-300 mb-4">$1</p>');
  };

  return (
    <section className="min-h-screen px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">📚 Learn & Tutorials</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Master all features of Biometra with our comprehensive tutorials and guides
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            <div className="lg:col-span-1">
              <div className="mobile-card p-6 sticky top-4">
                <h3 className="text-xl font-bold text-white mb-6">📖 Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const tutorialCount = getCategoryTutorials(category.id).length;
                    
                    return (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${
                          selectedCategory === category.id
                            ? `bg-gradient-to-r ${category.color} text-white neon-glow`
                            : 'bg-black/30 text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-sm">{category.name}</div>
                          <div className="text-xs opacity-75">{tutorialCount} guides</div>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tutorial Content */}
            <div className="lg:col-span-3">
              {selectedCategoryData && (
                <div className="mb-8">
                  <div className={`mobile-card p-8 bg-gradient-to-r ${selectedCategoryData.color}/20 border-2 border-current/30`}>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-16 h-16 bg-gradient-to-r ${selectedCategoryData.color} rounded-2xl flex items-center justify-center neon-glow`}>
                        <selectedCategoryData.icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold text-white">{selectedCategoryData.name}</h3>
                        <p className="text-gray-300">{selectedCategoryData.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tutorial List */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="mobile-card p-8">
                      <BookOpen className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                      <div className="text-white text-xl font-bold">Loading Tutorials...</div>
                    </div>
                  </div>
                ) : getCategoryTutorials(selectedCategory).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mobile-card p-8">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <div className="text-white text-xl font-bold mb-2">No Tutorials Available</div>
                      <div className="text-gray-400">Tutorials for this category are coming soon!</div>
                    </div>
                  </div>
                ) : (
                  getCategoryTutorials(selectedCategory).map((tutorial, index) => (
                    <motion.div
                      key={tutorial.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="mobile-card p-6 hover:scale-102 transition-all cursor-pointer"
                      onClick={() => setSelectedTutorial(tutorial)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center neon-glow">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-white mb-1">{tutorial.title}</h4>
                            <p className="text-gray-300 text-sm">
                              {tutorial.content.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-purple-400" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile spacing for footer */}
      <div className="h-32 md:h-0"></div>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {selectedTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center neon-glow">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedTutorial.title}</h3>
                    <p className="text-purple-300 capitalize">{selectedTutorial.category} Tutorial</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTutorial(null)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div 
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatContent(selectedTutorial.content) 
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default TutorialSection;