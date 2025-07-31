import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  Users,
  DollarSign,
  Award,
  Star,
  Zap,
  Clock,
  RotateCcw,
  Coins,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  Database,
  Bell,
  Calendar,
  Target,
  MessageCircle,
  Shield,
  Activity,
  BarChart3,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Sparkles,
  Layers,
  Globe,
  Cpu,
  Smartphone
} from 'lucide-react';

// Add toast import at the top
import toast from 'react-hot-toast';

interface AdminPanelProps {
  onClose: () => void;
}

interface User {
  id: string;
  username: string;
  email: string;
  ore_balance: number;
  bio_balance: number;
  level: number;
  referrals: number;
  created_at: string;
}

interface PresaleEvent {
  id: string;
  event_number: number;
  price_per_bio: number;
  total_bio_available: number;
  bio_sold: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  destination_address: string;
  transaction_hash: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_address: string;
  transaction_hash: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [presaleEvents, setPresaleEvents] = useState<PresaleEvent[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingPresale, setEditingPresale] = useState<string | null>(null);
  const [editPresaleData, setEditPresaleData] = useState<{
    price_per_bio: number;
    total_bio_available: number;
  }>({ price_per_bio: 0, total_bio_available: 0 });
  const [isSavingPresale, setIsSavingPresale] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOreBalance: 0,
    totalBioBalance: 0,
    activePresales: 0,
    pendingTickets: 0,
    pendingWithdrawals: 0,
    pendingDeposits: 0,
    todaySignups: 0,
    totalOreBalance: 0,
    totalMarketplaceTransactions: 0,
    marketplaceVolume: 0
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPresaleEvents = async () => {
    try {
      const { data: presaleEvents, error } = await supabase
        .from('presale_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresaleEvents(presaleEvents || []);
    } catch (error) {
      console.error('Error fetching presale data:', error);
    }
  };

  const fetchSupportTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupportTickets(data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawalRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    }
  };

  const fetchDepositRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositRequests(data || []);
    } catch (error) {
      console.error('Error fetching deposit requests:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchPresaleEvents(),
      fetchSupportTickets(),
      fetchWithdrawalRequests(),
      fetchDepositRequests()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Calculate stats
    const totalOreBalance = users.reduce((sum, user) => sum + Number(user.ore_balance || 0), 0);
    const totalBioBalance = users.reduce((sum, user) => sum + Number(user.bio_balance || 0), 0);
    const activePresales = presaleEvents.filter(event => event.is_active).length;
    const pendingTickets = supportTickets.filter(ticket => ticket.status === 'open').length;
    const pendingWithdrawals = withdrawalRequests.filter(req => req.status === 'pending').length;
    const pendingDeposits = depositRequests.filter(req => req.status === 'pending').length;
    
    // Today's signups
    const today = new Date().toISOString().split('T')[0];
    const todaySignups = users.filter(user => user.created_at.startsWith(today)).length;
    
    // Calculate revenue from presales
    const totalRevenue = presaleEvents.reduce((sum, event) => {
      return sum + ((event.bio_sold || 0) * event.price_per_bio);
    }, 0);

    setStats({
      totalUsers: users.length,
      totalOreBalance,
      totalBioBalance,
      activePresales,
      pendingTickets,
      pendingWithdrawals,
      pendingDeposits,
      todaySignups,
      totalRevenue
    });
  }, [users, presaleEvents, supportTickets, withdrawalRequests, depositRequests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'open': return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'open': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'closed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const handleTogglePresaleStatus = async (id: string, currentStatus: boolean) => {
    // Implementation for toggling presale status
  };

  const handleEditPresale = (event: PresaleEvent) => {
    setEditingPresale(event.id);
    setEditPresaleData({
      price_per_bio: event.price_per_bio,
      total_bio_available: event.total_bio_available
    });
  };

  const handleSavePresale = async (id: string) => {
    setIsSavingPresale(true);
    try {
      // Implementation for saving presale data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setEditingPresale(null);
    } catch (error) {
      console.error('Error saving presale:', error);
    } finally {
      setIsSavingPresale(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPresale(null);
    setEditPresaleData({ price_per_bio: 0, total_bio_available: 0 });
  };

  const renderDashboard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-3xl mb-6 neon-glow"
        >
          <Shield className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-4xl font-black text-white mb-2">Biometra Admin</h1>
        <p className="text-purple-300 text-lg">Platform Management Dashboard</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Total Users', 
            value: stats.totalUsers.toLocaleString(), 
            icon: Users, 
            color: 'from-blue-500 to-cyan-500',
            change: `+${stats.todaySignups} today`,
            changeColor: 'text-green-400'
          },
          { 
            title: 'Total ORE', 
            value: stats.totalOreBalance > 1000000 ? `${(stats.totalOreBalance / 1000000).toFixed(1)}M` : stats.totalOreBalance.toLocaleString(), 
            icon: Zap, 
            color: 'from-yellow-500 to-orange-500',
            change: 'Mining rewards',
            changeColor: 'text-yellow-400'
          },
          { 
            title: 'Total BIO', 
            value: stats.totalBioBalance.toLocaleString(), 
            icon: Coins, 
            color: 'from-green-500 to-emerald-500',
            change: 'Token supply',
            changeColor: 'text-green-400'
          },
          { 
            title: 'Revenue', 
            value: `$${stats.totalRevenue.toLocaleString()}`, 
            icon: DollarSign, 
            color: 'from-purple-500 to-pink-500',
            change: 'Presale earnings',
            changeColor: 'text-purple-400'
          }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 neon-glow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${metric.color} rounded-xl flex items-center justify-center neon-glow`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{metric.value}</div>
                  <div className="text-sm text-gray-300">{metric.title}</div>
                </div>
              </div>
              <div className={`text-sm ${metric.changeColor} font-semibold`}>
                {metric.change}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          {
            title: 'Support Tickets',
            value: stats.pendingTickets,
            total: supportTickets.length,
            icon: MessageCircle,
            color: 'from-orange-500 to-red-500',
            status: 'pending'
          },
          {
            title: 'Withdrawals',
            value: stats.pendingWithdrawals,
            total: withdrawalRequests.length,
            icon: TrendingUp,
            color: 'from-red-500 to-pink-500',
            status: 'pending'
          },
          {
            title: 'Deposits',
            value: stats.pendingDeposits,
            total: depositRequests.length,
            icon: DollarSign,
            color: 'from-blue-500 to-indigo-500',
            status: 'pending'
          }
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center neon-glow`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{item.value}</div>
                  <div className="text-sm text-gray-300">of {item.total}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">{item.title}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                  {item.status.toUpperCase()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Sparkles className="w-6 h-6 mr-3 text-purple-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Refresh All Data', icon: RefreshCw, action: fetchData, color: 'from-blue-500 to-cyan-500' },
            { label: 'Export Users', icon: Download, action: () => {}, color: 'from-green-500 to-emerald-500' },
            { label: 'System Settings', icon: Settings, action: () => {}, color: 'from-purple-500 to-pink-500' },
            { label: 'Send Notification', icon: Bell, action: () => {}, color: 'from-orange-500 to-red-500' }
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.action}
                className={`p-4 bg-gradient-to-r ${action.color} rounded-xl text-white font-semibold transition-all duration-300 neon-glow hover:shadow-lg`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm">{action.label}</div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const renderUsers = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with Search */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">User Management</h3>
            <p className="text-gray-300">Manage all platform users and their data</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:opacity-90 transition-all neon-glow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5 backdrop-blur-xl">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">Balances</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">Level</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">Referrals</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users
                .filter(user => 
                  user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/5 transition-all duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.username}</div>
                        <div className="text-xs text-gray-300">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm text-yellow-400 font-semibold">
                        {Number(user.ore_balance || 0).toLocaleString()} ORE
                      </div>
                      <div className="text-sm text-cyan-400 font-semibold">
                        {Number(user.bio_balance || 0).toLocaleString()} BIO
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                      Level {user.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-green-400">{user.referrals}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-300">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );

  const renderPresales = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Presale Events</h3>
            <p className="text-gray-300">Manage BIO token presale events</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-all neon-glow">
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
            <button
              onClick={fetchPresaleEvents}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:opacity-90 transition-all neon-glow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Presale Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {presaleEvents.map((event, index) => {
          const progress = event.total_bio_available > 0 ? ((event.bio_sold || 0) / event.total_bio_available) * 100 : 0;
          const isEditing = editingPresale === event.id;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 ${
                event.is_active ? 'ring-2 ring-green-500/50 neon-glow' : ''
              } ${isEditing ? 'ring-2 ring-purple-500/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${
                    event.is_active ? 'from-green-500 to-emerald-500' : 'from-gray-500 to-gray-600'
                  } rounded-xl flex items-center justify-center neon-glow`}>
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Event #{event.event_number}</h4>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-300">$</span>
                        <input
                          type="number"
                          step="0.001"
                          value={editPresaleData.price_per_bio}
                          onChange={(e) => setEditPresaleData(prev => ({ 
                            ...prev, 
                            price_per_bio: parseFloat(e.target.value) || 0 
                          }))}
                          className="w-20 px-2 py-1 bg-black/50 border border-purple-500/30 rounded text-white text-sm"
                        />
                        <span className="text-sm text-gray-300">per BIO</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">${event.price_per_bio.toFixed(3)} per BIO</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePresaleStatus(event.id, event.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      event.is_active 
                        ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30' 
                        : 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30'
                    }`}
                  >
                    {event.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
              </div>

              {/* Supply Editing */}
              {isEditing && (
                <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-purple-300 text-sm mb-2">Total BIO Supply</label>
                      <input
                        type="number"
                        value={editPresaleData.total_bio_available}
                        onChange={(e) => setEditPresaleData(prev => ({ 
                          ...prev, 
                          total_bio_available: parseInt(e.target.value) || 0 
                        }))}
                        className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Progress</span>
                  <span className="text-white font-bold">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-purple-500 to-cyan-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{(event.bio_sold || 0).toLocaleString()} sold</span>
                  <span>{(isEditing ? editPresaleData.total_bio_available : event.total_bio_available).toLocaleString()} total</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    ${((event.bio_sold || 0) * (isEditing ? editPresaleData.price_per_bio : event.price_per_bio)).toLocaleString()}
                  </div>
                  <div className="text-xs text-green-400">Revenue</div>
                </div>
                <div className="bg-black/30 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    {(isEditing ? editPresaleData.total_bio_available : event.total_bio_available) - (event.bio_sold || 0)}
                  </div>
                  <div className="text-xs text-cyan-400">Remaining</div>
                </div>
              </div>

              {/* Period */}
              <div className="text-xs text-gray-400 mb-4">
                {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
              </div>

              {/* Actions */}
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleSavePresale(event.id)}
                    disabled={isSavingPresale}
                    className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-all text-sm font-semibold disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    {isSavingPresale ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-all text-sm font-semibold"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-all text-sm font-semibold">
                    <Eye className="w-4 h-4 inline mr-2" />
                    View
                  </button>
                  <button 
                    onClick={() => handleEditPresale(event)}
                    className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-lg transition-all text-sm font-semibold"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  const renderSupport = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with Filters */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Support Tickets</h3>
            <p className="text-gray-300">Manage customer support requests</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-black/50 border border-white/20 rounded-xl text-white focus:border-purple-400 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={fetchSupportTickets}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:opacity-90 transition-all neon-glow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {supportTickets
          .filter(ticket => filterStatus === 'all' || ticket.status === filterStatus)
          .map((ticket, index) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{ticket.subject}</h4>
                  <p className="text-sm text-gray-300 capitalize">{ticket.category}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                  {ticket.status.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                  ticket.priority === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                  ticket.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                  'bg-green-500/20 text-green-300 border-green-500/30'
                }`}>
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <p className="text-gray-300 text-sm">{ticket.message}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
              <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-all text-sm font-semibold">
                <Eye className="w-4 h-4 inline mr-2" />
                View
              </button>
              <button className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-all text-sm font-semibold">
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Reply
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderWithdrawals = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Withdrawal Requests</h3>
            <p className="text-gray-300">Process user withdrawal requests</p>
          </div>
          <button
            onClick={fetchWithdrawalRequests}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:opacity-90 transition-all neon-glow"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Withdrawals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {withdrawalRequests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{Number(request.amount).toLocaleString()} {request.currency}</h4>
                  <p className="text-sm text-gray-300">Withdrawal Request</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)}`}>
                {request.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="bg-black/30 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">Destination Address</div>
                <div className="text-sm text-white font-mono break-all">{request.destination_address}</div>
              </div>
              
              {request.transaction_hash && (
                <div className="bg-black/30 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Transaction Hash</div>
                  <div className="text-sm text-green-400 font-mono break-all">{request.transaction_hash}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
              <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
              {request.processed_at && (
                <span>Processed: {new Date(request.processed_at).toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-all text-sm font-semibold">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Approve
              </button>
              <button className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-all text-sm font-semibold">
                <XCircle className="w-4 h-4 inline mr-2" />
                Reject
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderDeposits = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Deposit Requests</h3>
            <p className="text-gray-300">Confirm user deposit transactions</p>
          </div>
          <button
            onClick={fetchDepositRequests}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:opacity-90 transition-all neon-glow"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Deposits Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {depositRequests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{Number(request.amount).toLocaleString()} {request.currency}</h4>
                  <p className="text-sm text-gray-300">Deposit Request</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)}`}>
                {request.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="bg-black/30 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">Payment Address</div>
                <div className="text-sm text-white font-mono break-all">{request.payment_address}</div>
              </div>
              
              {request.transaction_hash && (
                <div className="bg-black/30 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Transaction Hash</div>
                  <div className="text-sm text-green-400 font-mono break-all">{request.transaction_hash}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
              <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
              {request.processed_at && (
                <span>Processed: {new Date(request.processed_at).toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-all text-sm font-semibold">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Confirm
              </button>
              <button className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-all text-sm font-semibold">
                <XCircle className="w-4 h-4 inline mr-2" />
                Reject
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, color: 'from-purple-500 to-pink-500' },
    { id: 'users', name: 'Users', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { id: 'presales', name: 'Presales', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
    { id: 'support', name: 'Support', icon: MessageCircle, color: 'from-orange-500 to-red-500' },
    { id: 'withdrawals', name: 'Withdrawals', icon: TrendingUp, color: 'from-red-500 to-pink-500' },
    { id: 'deposits', name: 'Deposits', icon: DollarSign, color: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex z-50">
      <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full lg:w-80 bg-black/30 backdrop-blur-2xl border-r border-white/20 flex-shrink-0"
        >
          {/* Logo */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center neon-glow">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Biometra Admin</h2>
                <p className="text-sm text-purple-300">Management Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.color} text-white neon-glow shadow-lg`
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="ml-auto w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all neon-glow"
            >
              <X className="w-5 h-5" />
              <span>Close Admin Panel</span>
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black/30 backdrop-blur-2xl border-b border-white/20 p-6 flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white capitalize">{activeTab}</h1>
                <p className="text-purple-300">
                  {activeTab === 'dashboard' && 'Platform overview and key metrics'}
                  {activeTab === 'users' && `${stats.totalUsers} registered users`}
                  {activeTab === 'presales' && `${stats.activePresales} active events`}
                  {activeTab === 'support' && `${stats.pendingTickets} pending tickets`}
                  {activeTab === 'withdrawals' && `${stats.pendingWithdrawals} pending requests`}
                  {activeTab === 'deposits' && `${stats.pendingDeposits} pending confirmations`}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                  <Activity className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-semibold">System Online</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white font-semibold">
                    {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 neon-glow"
                    >
                      <Database className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="text-white text-xl font-bold">Loading Admin Data...</div>
                    <div className="text-purple-300 text-sm">Please wait while we fetch the latest information</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeTab === 'dashboard' && renderDashboard()}
                  {activeTab === 'users' && renderUsers()}
                  {activeTab === 'presales' && renderPresales()}
                  {activeTab === 'support' && renderSupport()}
                  {activeTab === 'withdrawals' && renderWithdrawals()}
                  {activeTab === 'deposits' && renderDeposits()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;