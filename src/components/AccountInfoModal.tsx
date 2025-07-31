import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Calendar, Shield, Edit2, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AccountInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AccountInfoModal({ isOpen, onClose }: AccountInfoModalProps) {
  const { user } = useAuth();
  const { oreBalance, bioBalance, usdtBalance, level, totalTaps, referrals } = useGame();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user || !isSupabaseConfigured()) {
      toast.error('Cannot update profile');
      return;
    }

    if (!editData.username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editData.username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update profile');
        return;
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      // Update local user data
      const updatedUser = { ...user, username: editData.username.trim() };
      localStorage.setItem('authenticatedUser', JSON.stringify(updatedUser));
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !isSupabaseConfigured()) {
      toast.error('Cannot change password');
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      // Import hash functions
      const { hashPassword, verifyPassword } = await import('../lib/auth');
      
      // Get current user data
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (fetchError || !userData) {
        toast.error('Failed to verify current password');
        return;
      }

      // Verify current password
      const isValidPassword = await verifyPassword(passwordData.currentPassword, userData.password_hash);
      if (!isValidPassword) {
        toast.error('Current password is incorrect');
        return;
      }

      // Hash new password
      const newPasswordHash = await hashPassword(passwordData.newPassword);

      // Update password
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to change password');
        return;
      }

      toast.success('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-purple-500/30 w-full max-w-md max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Account Info</h3>
                  <p className="text-purple-300 text-sm">Manage your profile</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Profile Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Profile Information</h4>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-purple-300 mb-2 text-sm">Username</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.username}
                        onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white text-sm"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-black/30 border border-gray-500/30 rounded-lg text-white text-sm">
                        {user.username}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-purple-300 mb-2 text-sm">Email</label>
                    <div className="px-3 py-2 bg-black/30 border border-gray-500/30 rounded-lg text-white text-sm">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Email cannot be changed</div>
                  </div>

                  <div>
                    <label className="block text-purple-300 mb-2 text-sm">Member Since</label>
                    <div className="px-3 py-2 bg-black/30 border border-gray-500/30 rounded-lg text-white text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditData({ username: user.username, email: user.email });
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Stats */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-white mb-4">Account Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-500/30">
                    <div className="text-lg font-bold text-white">{oreBalance.toFixed(0)}</div>
                    <div className="text-xs text-yellow-300">ORE Balance</div>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg p-3 border border-cyan-500/30">
                    <div className="text-lg font-bold text-white">{bioBalance.toFixed(4)}</div>
                    <div className="text-xs text-cyan-300">BIO Balance</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="text-lg font-bold text-white">${usdtBalance.toFixed(2)}</div>
                    <div className="text-xs text-green-300">USDT Balance</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-500/30">
                    <div className="text-lg font-bold text-white">L{level}</div>
                    <div className="text-xs text-purple-300">BIO Level</div>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg p-3 border border-indigo-500/30">
                    <div className="text-lg font-bold text-white">{totalTaps.toLocaleString()}</div>
                    <div className="text-xs text-indigo-300">Total Taps</div>
                  </div>
                  <div className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-lg p-3 border border-rose-500/30">
                    <div className="text-lg font-bold text-white">{referrals}</div>
                    <div className="text-xs text-rose-300">Referrals</div>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Change Password</h4>
                  <button
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4 text-white" />
                  </button>
                </div>

                {isChangingPassword && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-orange-300 mb-2 text-sm">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-orange-300 mb-2 text-sm">New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-orange-300 mb-2 text-sm">Confirm New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                        className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {isSaving ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Security Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h5 className="text-blue-400 font-semibold mb-2 text-sm">🔒 Account Security</h5>
                <div className="text-blue-300 text-xs space-y-1">
                  <div>• Your account is secured with encrypted password</div>
                  <div>• Change password regularly for better security</div>
                  <div>• Never share your login credentials</div>
                  <div>• Contact support if you notice suspicious activity</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AccountInfoModal;