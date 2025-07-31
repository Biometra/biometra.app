import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AuthForm() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const success = await login(formData.email, formData.password);
        if (success) {
          setFormData({ email: '', password: '', username: '' });
        }
      } else {
        if (!formData.username.trim()) {
          alert('Username harus diisi');
          return;
        }
        const result = await signup(formData.email, formData.password, formData.username);
        if (result.success) {
          setFormData({ email: '', password: '', username: '' });
        } else if (result.reason === 'user_exists') {
          // Automatically switch to login mode
          setIsLogin(true);
          setFormData(prev => ({ ...prev, password: '', username: '' }));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-black/30 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full mb-4">
            {isLogin ? <LogIn className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Login' : 'Daftar'}
          </h1>
          <p className="text-gray-300">
            {isLogin ? 'Masuk ke akun Biometra' : 'Buat akun Biometra baru'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-purple-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
                className="w-full pl-11 pr-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Username (only for signup) */}
          {!isLogin && (
            <div>
              <label className="block text-purple-300 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="username"
                  className="w-full pl-11 pr-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-purple-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${
              isLoading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 text-white'
            }`}
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Daftar')}
          </motion.button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <p className="text-gray-300">
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
          >
            {isLogin ? 'Daftar di sini' : 'Login di sini'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg">
          <div className="text-purple-300 text-sm text-center">
            🎉 Dapatkan 100 ORE gratis setelah daftar!
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthForm;