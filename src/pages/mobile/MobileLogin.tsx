import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Car, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      await signIn(email, password);
      navigate('/mobile/home');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      dir="rtl"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-xl shadow-teal-500/30">
            <Car className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          Fleetify
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 text-sm mb-8"
        >
          فليتفاي - إدارة الأسطول
        </motion.p>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className={cn(
                  'w-full pr-10 pl-4 py-3 rounded-2xl',
                  'bg-white/80 backdrop-blur-xl border border-gray-200/50',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                  'transition-all duration-200',
                  'text-gray-900 placeholder:text-gray-400'
                )}
                dir="ltr"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'w-full pr-10 pl-12 py-3 rounded-2xl',
                  'bg-white/80 backdrop-blur-xl border border-gray-200/50',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                  'transition-all duration-200',
                  'text-gray-900 placeholder:text-gray-400'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-left">
            <button
              type="button"
              className="text-sm text-teal-600 hover:text-teal-700 transition-colors"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          {/* Submit Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className={cn(
              'w-full py-4 rounded-2xl font-semibold text-white',
              'bg-gradient-to-r from-teal-500 to-teal-600',
              'shadow-lg shadow-teal-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </motion.button>
        </motion.form>

        {/* Sign Up Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-sm text-gray-500"
        >
          ليس لديك حساب؟{' '}
          <button className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
            إنشاء حساب جديد
          </button>
        </motion.p>
      </motion.div>

      {/* Version Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-xs text-gray-400 pb-4"
      >
        الإصدار 1.0.0
      </motion.p>
    </div>
  );
};

export default MobileLogin;
