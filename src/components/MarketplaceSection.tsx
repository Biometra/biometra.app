import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Filter,
  Search,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import MarketplaceChatModal from './MarketplaceChatModal';
import toast from 'react-hot-toast';

interface MarketplaceListing {
  id: string;
  seller_id: string;
  usdt_amount: number;
  price_per_usdt: number;
  total_rupiah_value: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: 'active' | 'sold' | 'cancelled';
  expires_at: string;
  created_at: string;
  seller_username?: string;
}

interface MarketplaceTransaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  usdt_amount: number;
  price_per_usdt: number;
  total_rupiah_paid: number;
  platform_commission: number;
  seller_received: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  payment_proof?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  payment_instructions?: string;
  transfer_deadline?: string;
  requires_approval?: boolean;
  approved_at?: string;
  approval_notes?: string;
  buyer_username?: string;
  seller_username?: string;
}

function MarketplaceSection() {
  const { user } = useAuth();
  const { usdtBalance, refreshUserData } = useGame();
  const [activeTab, setActiveTab] = useState('buy');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [filterBank, setFilterBank] = useState('all');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [userChats, setUserChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatTransaction, setSelectedChatTransaction] = useState<any>(null);
  const [chatOtherUser, setChatOtherUser] = useState<{ id: string; username: string } | null>(null);

  // Create listing form
  const [listingForm, setListingForm] = useState({
    usdt_amount: '',
    price_per_usdt: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: ''
  });

  // Open purchase modal
  const openPurchaseModal = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setPurchaseAmount('');
    setShowPurchaseModal(true);
  };

  // Fetch active marketplace listings
  const fetchListings = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data for demo
      const mockListings = [
        {
          id: '1',
          seller_id: 'seller1',
          usdt_amount: 100,
          price_per_usdt: 15800,
          total_rupiah_value: 1580000,
          bank_name: 'BCA',
          bank_account_number: '1234567890',
          bank_account_name: 'John Doe',
          status: 'active' as const,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          seller_username: 'CryptoTrader'
        }
      ];
      setListings(mockListings);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          seller:users!marketplace_listings_seller_id_fkey(username)
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listings:', error);
        setListings([]);
      } else {
        const processedListings = (data || []).map(listing => ({
          ...listing,
          seller_username: listing.seller?.username || 'Unknown User'
        }));
        setListings(processedListings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user's own listings
  const fetchMyListings = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my listings:', error);
        setMyListings([]);
      } else {
        setMyListings(data || []);
      }
    } catch (error) {
      console.error('Error fetching my listings:', error);
      setMyListings([]);
    }
  };

  // Create new listing
  const handleCreateListing = async () => {
    if (!user || !isSupabaseConfigured()) {
      toast.error('Please login first');
      return;
    }

    const usdtAmount = parseFloat(listingForm.usdt_amount);
    const pricePerUsdt = parseFloat(listingForm.price_per_usdt);

    if (!usdtAmount || !pricePerUsdt || !listingForm.bank_name || !listingForm.bank_account_number || !listingForm.bank_account_name) {
      toast.error('Please fill all fields');
      return;
    }

    if (usdtAmount > usdtBalance) {
      toast.error('Insufficient USDT balance');
      return;
    }

    if (usdtAmount < 10) {
      toast.error('Minimum listing amount is 10 USDT');
      return;
    }

    try {
      const totalRupiahValue = usdtAmount * pricePerUsdt;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Deduct USDT from user balance
      const { error: updateError } = await supabase
        .from('users')
        .update({
          usdt_balance: usdtBalance - usdtAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        toast.error('Failed to update balance');
        return;
      }

      // Create listing
      const { error: listingError } = await supabase
        .from('marketplace_listings')
        .insert({
          seller_id: user.id,
          usdt_amount: usdtAmount,
          price_per_usdt: pricePerUsdt,
          total_rupiah_value: totalRupiahValue,
          bank_name: listingForm.bank_name,
          bank_account_number: listingForm.bank_account_number,
          bank_account_name: listingForm.bank_account_name,
          status: 'active',
          expires_at: expiresAt.toISOString()
        });

      if (listingError) {
        console.error('Error creating listing:', listingError);
        toast.error('Failed to create listing');
        
        // Revert balance change
        await supabase
          .from('users')
          .update({
            usdt_balance: usdtBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        return;
      }

      toast.success(`✅ Listing created! ${usdtAmount} USDT for Rp ${totalRupiahValue.toLocaleString()}`);
      
      // Reset form
      setListingForm({
        usdt_amount: '',
        price_per_usdt: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: ''
      });
      setShowCreateListing(false);
      
      // Refresh data
      refreshUserData();
      fetchListings();
      fetchMyListings();

    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Failed to create listing');
    }
  };

  // Buy USDT from listing
  const handleBuyUsdt = async () => {
    if (!selectedListing) return;

    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid purchase amount');
      return;
    }
    
    if (amount > selectedListing.usdt_amount) {
      toast.error('Amount exceeds available USDT');
      return;
    }

    if (!user) {
      toast.error('Please login first');
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error('Database not configured');
      return;
    }

    if (selectedListing.seller_id === user.id) {
      toast.error('Cannot buy your own listing');
      return;
    }

    try {
      // Fixed platform commission ($0.15 USDT) - buyer pays
      const platformCommissionUsdt = 0.15;
      const totalRupiahForAmount = amount * selectedListing.price_per_usdt;
      const sellerReceived = totalRupiahForAmount; // Seller gets full rupiah amount
      const buyerReceivesUsdt = amount - platformCommissionUsdt; // Buyer gets USDT minus fee

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('marketplace_transactions')
        .insert({
          listing_id: selectedListing.id,
          buyer_id: user.id,
          seller_id: selectedListing.seller_id,
          usdt_amount: buyerReceivesUsdt, // Amount buyer will receive
          price_per_usdt: selectedListing.price_per_usdt,
          total_rupiah_paid: totalRupiahForAmount,
          platform_commission: platformCommissionUsdt,
          seller_received: sellerReceived,
          bank_name: selectedListing.bank_name,
          bank_account_number: selectedListing.bank_account_number,
          bank_account_name: selectedListing.bank_account_name,
          status: 'pending',
          payment_instructions: `Transfer Rp ${totalRupiahForAmount.toLocaleString()} to ${selectedListing.bank_name} account ${selectedListing.bank_account_number} (${selectedListing.bank_account_name})`,
          transfer_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          requires_approval: true
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        toast.error('Failed to create transaction');
        return;
      }

      // Immediately deduct USDT stock from listing when purchase is made
      const { error: stockError } = await supabase
        .from('marketplace_listings')
        .update({
          usdt_amount: supabase.raw(`GREATEST(0, usdt_amount - ${amount})`),
          updated_at: new Date().toISOString()
        })
        .eq('id', listing.id);

      if (stockError) {
        console.error('Error updating listing stock:', stockError);
        // Don't fail the transaction, just log the error
      }

      // Check if listing is now sold out and update status
      const { data: updatedListing, error: checkError } = await supabase
        .from('marketplace_listings')
        .select('usdt_amount')
        .eq('id', listing.id)
        .single();

      if (!checkError && updatedListing && updatedListing.usdt_amount <= 0) {
        await supabase
          .from('marketplace_listings')
          .update({ status: 'sold' })
          .eq('id', listing.id);
      }

      // Note: Stock will be deducted when seller confirms payment
      // This prevents stock deduction for unconfirmed transactions
      const { data: chatData } = await supabase
        .from('marketplace_chats')
        .select('*')
        .eq('transaction_id', transaction.id)
        .single();

      if (chatData) {
        await supabase
          .from('marketplace_chat_messages')
          .insert({
            chat_id: chatData.id,
            sender_id: user.id,
            message: `Purchase initiated: ${amount} USDT for Rp ${totalRupiahForAmount.toLocaleString()}. Please transfer the rupiah amount to complete the transaction.`,
            message_type: 'system'
          });
      }

      // Update listing to reduce available USDT amount (only the purchased amount)
      const newUsdtAmount = selectedListing.usdt_amount - amount;
      const updateData = newUsdtAmount <= 0 
        ? { status: 'sold', usdt_amount: 0 }
        : { usdt_amount: newUsdtAmount };
        
      const { error: updateListingError } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', selectedListing.id);

      if (updateListingError) {
        console.error('Error updating listing:', updateListingError);
      }

      toast.success(`🛒 Purchase initiated! You'll receive ${buyerReceivesUsdt} USDT after payment confirmation. Check Chats tab to communicate with seller.`);
      
      // Close modal
      setShowPurchaseModal(false);
      setSelectedListing(null);
      
      // Refresh listings
      fetchListings();
      fetchMyListings();
      fetchUserChats();

      // Trigger marketplace update event
      window.dispatchEvent(new Event('marketplace-updated'));

    } catch (error) {
      console.error('Error buying USDT:', error);
      toast.error('Failed to process purchase');
    }
  };

  // Cancel listing
  const handleCancelListing = async (listingId: string) => {
    if (!user || !isSupabaseConfigured()) return;

    console.log('🗑️ Cancelling listing:', listingId);
    
    try {
      // First check if listing belongs to user
      const { data: listing, error: fetchError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .eq('seller_id', user.id)
        .single();

      if (fetchError || !listing) {
        console.error('Error fetching listing or not authorized:', fetchError);
        toast.error('Failed to cancel listing');
        return;
      }

      // Update listing status to cancelled
      const { error: updateError } = await supabase
        .from('marketplace_listings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId)
        .eq('seller_id', user.id); // Security check

      if (updateError) {
        console.error('Error cancelling listing:', updateError);
        toast.error('Failed to cancel listing');
        return;
      }

      // Return USDT to user balance
      const { error: balanceError } = await supabase
        .from('users')
        .update({
          usdt_balance: usdtBalance + listing.usdt_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (balanceError) {
        console.error('Error returning USDT:', balanceError);
        toast.error('Failed to return USDT');
        return;
      }

      console.log('✅ Listing cancelled successfully');
      toast.success(`❌ Listing cancelled. ${listing.usdt_amount} USDT returned to your balance.`);
      
      // Refresh data
      refreshUserData();
      fetchListings();
      fetchMyListings();

    } catch (error) {
      console.error('Error cancelling listing:', error);
      toast.error('Failed to cancel listing');
    }
  };

  // Fetch user's active chats
  const fetchUserChats = async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_chats')
        .select(`
          *,
          transaction:marketplace_transactions!marketplace_chats_transaction_id_fkey(
            id,
            usdt_amount,
            total_rupiah_paid,
            status,
            created_at
          ),
          buyer:users!marketplace_chats_buyer_id_fkey(username),
          seller:users!marketplace_chats_seller_id_fkey(username),
          latest_message:marketplace_chat_messages(
            message,
            created_at,
            is_read
          )
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        setUserChats([]);
      } else {
        const processedChats = (data || []).map(chat => ({
          ...chat,
          other_user: chat.buyer_id === user.id ? chat.seller : chat.buyer,
          is_buyer: chat.buyer_id === user.id,
          latest_message: chat.latest_message?.[0] || null
        }));
        setUserChats(processedChats);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setUserChats([]);
    }
  };

  // Open chat modal
  const openChatModal = (chat: any) => {
    setSelectedChat(chat);
    setShowChatModal(true);
  };

  // Handle chat click
  const handleChatClick = (e: React.MouseEvent, transaction: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Chat button clicked for transaction:', transaction.id);
    
    // Determine other user based on current user role
    const isUserBuyer = transaction.buyer_id === user?.id;
    const isUserSeller = transaction.seller_id === user?.id;
    
    if (isUserBuyer) {
      // User is buyer, chat with seller
      setChatOtherUser({
        id: transaction.seller_id,
        username: transaction.seller_username || 'Unknown Seller'
      });
    } else if (isUserSeller) {
      // User is seller, chat with buyer
      setChatOtherUser({
        id: transaction.buyer_id,
        username: transaction.buyer_username || 'Unknown Buyer'
      });
    } else {
      toast.error('You are not part of this transaction');
      return;
    }
    
    setSelectedChatTransaction(transaction);
    setShowChatModal(true);
  };

  // Load data on mount
  useEffect(() => {
    fetchListings();
    if (user) {
      fetchMyListings();
      fetchUserChats();
    }
  }, [user]);

  // Filter and sort listings
  const filteredListings = listings
    .filter(listing => {
      const matchesSearch = listing.seller_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBank = filterBank === 'all' || listing.bank_name === filterBank;
      return matchesSearch && matchesBank;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price_per_usdt - b.price_per_usdt;
        case 'price_desc':
          return b.price_per_usdt - a.price_per_usdt;
        case 'amount_asc':
          return a.usdt_amount - b.usdt_amount;
        case 'amount_desc':
          return b.usdt_amount - a.usdt_amount;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  const uniqueBanks = [...new Set(listings.map(l => l.bank_name))];

  const tabs = [
    { id: 'buy', label: 'Buy USDT', icon: ShoppingCart },
    { id: 'sell', label: 'Sell USDT', icon: DollarSign },
    { id: 'my-listings', label: 'My Listings', icon: User },
    { id: 'chats', label: 'Chats', icon: MessageCircle }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'sold':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'cancelled':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  return (
    <section className="min-h-full px-4 py-8 overflow-y-auto">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">💰 USDT Marketplace</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Buy and sell USDT with Indonesian Rupiah. Safe peer-to-peer trading with escrow protection.
          </p>
        </div>

        {/* USDT Balance Display */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30 text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="w-6 h-6 text-green-400 mr-2" />
              <span className="text-green-300 font-bold">Your USDT Balance</span>
            </div>
            <div className="text-3xl font-black text-white mb-2">${usdtBalance.toFixed(2)}</div>
            <div className="text-sm text-green-300">Available for trading</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-1 border border-purple-500/20">
            <div className="grid grid-cols-4 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'buy' && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search seller or bank..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                  />
                </div>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="amount_asc">Amount: Low to High</option>
                  <option value="amount_desc">Amount: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>

                <select
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  className="px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="all">All Banks</option>
                  {uniqueBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Listings */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="mobile-card p-8">
                    <ShoppingCart className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                    <div className="text-white text-xl font-bold">Loading Marketplace...</div>
                  </div>
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mobile-card p-8">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-white mb-2">No USDT Available</h4>
                    <p className="text-gray-300">No active listings match your criteria</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((listing) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mobile-card p-6 hover:scale-105 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5 text-purple-400" />
                          <span className="text-white font-semibold">{listing.seller_username}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(listing.status)}`}>
                          {listing.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-300">USDT Amount</span>
                          <span className="text-white font-bold">${listing.usdt_amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Price per USDT</span>
                          <span className="text-green-400 font-bold">Rp {listing.price_per_usdt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Total Price</span>
                          <span className="text-yellow-400 font-bold">Rp {listing.total_rupiah_value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Bank</span>
                          <span className="text-white font-bold">{listing.bank_name}</span>
                        </div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-3 mb-4">
                        <div className="text-sm text-gray-400 mb-1">Bank Details:</div>
                        <div className="text-sm text-white">
                          <div>{listing.bank_account_number}</div>
                          <div>{listing.bank_account_name}</div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 mb-4">
                        Expires: {formatDate(listing.expires_at)}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openPurchaseModal(listing)}
                        disabled={!user || listing.seller_id === user?.id}
                        className={`w-full py-3 rounded-lg font-bold transition-all ${
                          !user || listing.seller_id === user?.id
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white'
                        }`}
                      >
                        {!user ? 'Login to Buy' : 
                         listing.seller_id === user?.id ? 'Your Listing' : 
                         `Buy USDT`}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sell' && (
            <div className="max-w-2xl mx-auto">
              <div className="mobile-card p-8">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">💰 Sell Your USDT</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-300 mb-2">USDT Amount</label>
                      <input
                        type="number"
                        value={listingForm.usdt_amount}
                        onChange={(e) => setListingForm(prev => ({ ...prev, usdt_amount: e.target.value }))}
                        placeholder="Enter USDT amount"
                        step="0.01"
                        min="10"
                        max={usdtBalance}
                        className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:border-green-400 focus:outline-none"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        Available: ${usdtBalance.toFixed(2)} USDT
                      </div>
                    </div>

                    <div>
                      <label className="block text-green-300 mb-2">Price per USDT (IDR)</label>
                      <input
                        type="number"
                        value={listingForm.price_per_usdt}
                        onChange={(e) => setListingForm(prev => ({ ...prev, price_per_usdt: e.target.value }))}
                        placeholder="e.g., 15800"
                        min="1000"
                        className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:border-green-400 focus:outline-none"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        Current rate: ~Rp 15,800
                      </div>
                    </div>
                  </div>

                  {/* Total Calculation */}
                  {listingForm.usdt_amount && listingForm.price_per_usdt && (
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg p-4 border border-green-500/30">
                      <div className="text-center">
                        <div className="text-sm text-green-300 mb-1">Total you'll receive:</div>
                        <div className="text-2xl font-bold text-white">
                          Rp {(parseFloat(listingForm.usdt_amount) * parseFloat(listingForm.price_per_usdt)).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-400 mt-1">
                          (After 15% platform fee: Rp {((parseFloat(listingForm.usdt_amount) * parseFloat(listingForm.price_per_usdt)) * 0.85).toLocaleString()})
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-green-300 mb-2">Bank Name</label>
                    <select
                      value={listingForm.bank_name}
                      onChange={(e) => setListingForm(prev => ({ ...prev, bank_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white focus:border-green-400 focus:outline-none"
                    >
                      <option value="">Select Bank</option>
                      <option value="BCA">BCA</option>
                      <option value="BRI">BRI</option>
                      <option value="BNI">BNI</option>
                      <option value="Mandiri">Mandiri</option>
                      <option value="CIMB">CIMB Niaga</option>
                      <option value="Danamon">Danamon</option>
                      <option value="Permata">Permata</option>
                      <option value="OCBC">OCBC NISP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={listingForm.bank_account_number}
                      onChange={(e) => setListingForm(prev => ({ ...prev, bank_account_number: e.target.value }))}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-300 mb-2">Account Name</label>
                    <input
                      type="text"
                      value={listingForm.bank_account_name}
                      onChange={(e) => setListingForm(prev => ({ ...prev, bank_account_name: e.target.value }))}
                      placeholder="Enter account holder name"
                      className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateListing}
                    disabled={!user || !listingForm.usdt_amount || !listingForm.price_per_usdt || !listingForm.bank_name || !listingForm.bank_account_number || !listingForm.bank_account_name}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                      !user || !listingForm.usdt_amount || !listingForm.price_per_usdt || !listingForm.bank_name || !listingForm.bank_account_number || !listingForm.bank_account_name
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white'
                    }`}
                  >
                    {!user ? 'Login to Sell' : 'Create Listing'}
                  </motion.button>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-yellow-400 text-sm font-semibold mb-2">📋 Selling Terms</div>
                    <div className="text-yellow-300 text-xs space-y-1">
                      <div>• Minimum listing: 10 USDT</div>
                      <div>• Platform fee: 15% of total sale</div>
                      <div>• Listing expires in 7 days</div>
                      <div>• USDT will be held in escrow until sale</div>
                      <div>• You must approve payment before USDT release</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-listings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">My USDT Listings</h3>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    fetchMyListings();
                    toast.success('Listings refreshed!');
                  }}
                  className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </motion.button>
              </div>

              {myListings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mobile-card p-8">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-white mb-2">No Listings Yet</h4>
                    <p className="text-gray-300 mb-4">Create your first USDT listing to start selling</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('sell')}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold"
                    >
                      Create Listing
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myListings.map((listing) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mobile-card p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-lg font-bold text-white">
                          ${listing.usdt_amount} USDT
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(listing.status)}`}>
                          {listing.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Price per USDT</span>
                          <span className="text-green-400 font-bold">Rp {listing.price_per_usdt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Total Value</span>
                          <span className="text-yellow-400 font-bold">Rp {listing.total_rupiah_value.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Bank</span>
                          <span className="text-white">{listing.bank_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Created</span>
                          <span className="text-gray-400">{formatDate(listing.created_at)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Expires</span>
                          <span className="text-orange-400">{formatDate(listing.expires_at)}</span>
                        </div>
                      </div>

                      {listing.status === 'active' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleCancelListing(listing.id)}
                          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 text-white rounded-lg font-bold transition-all"
                        >
                          Cancel Listing
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Active Chats</h3>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    fetchUserChats();
                    toast.success('Chats refreshed!');
                  }}
                  className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </motion.button>
              </div>

              {userChats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mobile-card p-8">
                    <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-white mb-2">No Active Chats</h4>
                    <p className="text-gray-300">Your marketplace chats will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userChats.map((chat) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mobile-card p-6 hover:scale-105 transition-all cursor-pointer"
                      onClick={() => openChatModal(chat)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-bold">
                              {chat.is_buyer ? 'Seller: ' : 'Buyer: '}{chat.other_user?.username || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-300">
                              {chat.is_buyer ? 'You are buying' : 'You are selling'} ${chat.transaction?.usdt_amount} USDT
                            </div>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(chat.transaction?.status || 'pending')}`}>
                          {(chat.transaction?.status || 'pending').toUpperCase()}
                        </div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-3 mb-3">
                        <div className="text-sm text-gray-400 mb-1">Transaction Details:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">USDT:</span>
                            <span className="text-white font-bold ml-1">${chat.transaction?.usdt_amount}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Rupiah:</span>
                            <span className="text-green-400 font-bold ml-1">Rp {chat.transaction?.total_rupiah_paid?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {chat.latest_message && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <div className="text-sm text-purple-300 mb-1">Latest message:</div>
                          <div className="text-white text-sm">
                            {chat.latest_message.message.length > 50 
                              ? chat.latest_message.message.substring(0, 50) + '...'
                              : chat.latest_message.message
                            }
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(chat.latest_message.created_at)}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-gray-400">
                          Created: {formatDate(chat.transaction?.created_at || chat.created_at)}
                        </div>
                        <div className="flex items-center space-x-2 text-blue-400 text-sm">
                          <MessageCircle className="w-4 h-4" />
                          <span>Click to chat</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
      
      {/* Mobile spacing for footer */}
      <div className="h-32 md:h-0"></div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && selectedListing && (
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
              className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Buy USDT</h3>
                    <p className="text-green-300 text-sm">From {selectedListing.seller_username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-6">
                  {/* Listing Info */}
                  <div className="bg-black/30 rounded-lg p-4 border border-green-500/20">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-400">Available USDT</div>
                        <div className="text-white font-bold">${selectedListing.usdt_amount}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Price per USDT</div>
                        <div className="text-green-400 font-bold">Rp {selectedListing.price_per_usdt.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Bank</div>
                        <div className="text-white font-bold">{selectedListing.bank_name}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Platform Fee</div>
                        <div className="text-orange-400 font-bold">$0.15 USDT</div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Amount Input */}
                  <div>
                    <label className="block text-green-300 mb-2 font-bold">USDT Amount to Buy</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        placeholder="Enter USDT amount"
                        step="0.01"
                        min="0.01"
                        max={selectedListing.usdt_amount}
                        className="w-full px-4 py-3 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:border-green-400 focus:outline-none text-lg font-bold"
                      />
                      <button
                        onClick={() => setPurchaseAmount(selectedListing.usdt_amount.toString())}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300 text-sm font-bold bg-green-500/20 px-3 py-1 rounded-lg"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Cost Calculation */}
                  {purchaseAmount && parseFloat(purchaseAmount) > 0 && (
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg p-4 border border-green-500/30">
                      <div className="text-center">
                        <div className="text-sm text-green-300 mb-1">Total you'll pay:</div>
                        <div className="text-2xl font-bold text-white mb-2">
                          Rp {(parseFloat(purchaseAmount) * selectedListing.price_per_usdt).toLocaleString()}
                        </div>
                        <div className="text-xs text-green-400">
                          You'll receive: {(parseFloat(purchaseAmount) - 0.15).toFixed(2)} USDT
                        </div>
                        <div className="text-xs text-red-300 mt-1">
                          Platform fee: $0.15 USDT (deducted from your USDT)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowPurchaseModal(false)}
                      className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBuyUsdt}
                      disabled={!purchaseAmount || parseFloat(purchaseAmount) <= 0 || parseFloat(purchaseAmount) > selectedListing.usdt_amount}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        !purchaseAmount || parseFloat(purchaseAmount) <= 0 || parseFloat(purchaseAmount) > selectedListing.usdt_amount
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white'
                      }`}
                    >
                      Buy USDT
                    </motion.button>
                  </div>

                  {/* Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-blue-400 text-sm font-semibold mb-2">💡 Purchase Process</div>
                    <div className="text-blue-300 text-xs space-y-1">
                      <div>• Transfer Rupiah to seller's bank account</div>
                      <div>• Seller confirms payment receipt</div>
                      <div>• USDT automatically sent to your account</div>
                      <div>• Platform fee ($0.15) deducted from seller</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChatModal && selectedChat && (
          <MarketplaceChatModal
            chat={selectedChat}
            onClose={() => {
              setShowChatModal(false);
              setSelectedChat(null);
              fetchUserChats(); // Refresh chats when modal closes
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Chat Modal */}
      {selectedChatTransaction && chatOtherUser && (
        <MarketplaceChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedChatTransaction(null);
            setChatOtherUser(null);
          }}
          transactionId={selectedChatTransaction.id}
          otherUserId={chatOtherUser.id}
          otherUsername={chatOtherUser.username}
          transactionStatus={selectedChatTransaction.status}
        />
      )}
    </section>
  );
}

export default MarketplaceSection;