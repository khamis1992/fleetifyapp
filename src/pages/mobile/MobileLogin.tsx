import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import fleetifyLogo from '@/assets/fleetify-logo.png';

export const MobileLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('🔐 [MobileLogin] Attempting login with:', { email });

      // Use Supabase directly for mobile login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      console.log('🔐 [MobileLogin] Supabase response:', { data, error });

      if (error) {
        console.error('❌ [MobileLogin] Supabase error:', error);
        setError(error.message || 'فشل تسجيل الدخول');
        setIsSubmitting(false);
        return;
      }

      if (data.user) {
        console.log('✅ [MobileLogin] Login successful for user:', data.user.email);

        // Small delay for animation
        setTimeout(() => {
          navigate('/mobile/home', { replace: true });
        }, 300);
      } else {
        setError('فشل تسجيل الدخول - يرجى المحاولة مرة أخرى');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('❌ [MobileLogin] Unexpected error:', err);
      setError(err.message || 'حدث خطأ غير متوقع');
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #f0fdfa 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      dir="rtl"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-teal-400/20 to-teal-600/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12"
      >
        {/* Logo Section */}
        <motion.div variants={itemVariants} className="mb-8 relative">
          <motion.div
            animate={{
              rotate: [0, 2, -2, 0],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <div className="relative">
              {/* Glow Effect */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-[2.5rem] blur-2xl"
              />

              {/* Logo Image Container */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <motion.div
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative w-full h-full"
                >
                  <img
                    src={fleetifyLogo}
                    alt="Fleetify Logo"
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </motion.div>
              </div>

              {/* Sparkle Icon */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="absolute -top-1 -right-1 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white/50"
              >
                <Sparkles className="w-5 h-5 text-white" fill="white" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Title Section */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
            Fleetify
          </h1>
          <p className="text-base text-gray-500 font-medium">فليتفاي - إدارة الأسطول</p>
        </motion.div>

        {/* Login Form Card */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="bg-red-50/90 backdrop-blur-sm border border-red-200/80 rounded-3xl p-4 flex items-start gap-3 shadow-lg shadow-red-500/10"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">خطأ في تسجيل الدخول</p>
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Input */}
            <motion.div
              className="space-y-2"
              animate={focusedField === 'email' ? { scale: 1.02 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg" />
                <div className="relative">
                  <Mail className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200",
                    focusedField === 'email' ? "text-teal-600" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="email@example.com"
                    className={cn(
                      'w-full pr-12 pl-4 py-4 rounded-2xl',
                      'bg-white/90 backdrop-blur-xl border-2 transition-all duration-200',
                      focusedField === 'email'
                        ? 'border-teal-500 shadow-lg shadow-teal-500/20'
                        : 'border-gray-200/80 group-hover:border-gray-300/80',
                      'focus:outline-none',
                      'text-gray-900 placeholder:text-gray-400 font-medium'
                    )}
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div
              className="space-y-2"
              animate={focusedField === 'password' ? { scale: 1.02 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                كلمة المرور
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg" />
                <div className="relative">
                  <Lock className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200",
                    focusedField === 'password' ? "text-teal-600" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className={cn(
                      'w-full pr-12 pl-14 py-4 rounded-2xl',
                      'bg-white/90 backdrop-blur-xl border-2 transition-all duration-200',
                      focusedField === 'password'
                        ? 'border-teal-500 shadow-lg shadow-teal-500/20'
                        : 'border-gray-200/80 group-hover:border-gray-300/80',
                      'focus:outline-none',
                      'text-gray-900 placeholder:text-gray-400 font-medium'
                    )}
                    dir="ltr"
                    autoComplete="current-password"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-200",
                      focusedField === 'password' ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Forgot Password */}
            <div className="text-left">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors inline-flex items-center gap-1"
              >
                نسيت كلمة المرور؟
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={loading || isSubmitting}
              className={cn(
                'relative w-full py-4 rounded-2xl font-bold text-white text-base',
                'bg-gradient-to-r from-teal-500 to-emerald-600',
                'shadow-xl shadow-teal-500/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200',
                'overflow-hidden group'
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                {loading || isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </div>
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-500 mb-2">ليس لديك حساب؟</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="text-base font-bold text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text hover:from-teal-700 hover:to-emerald-700 transition-all inline-flex items-center gap-1"
            >
              إنشاء حساب جديد
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Version Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-auto pt-8 text-center text-xs text-gray-400 font-medium"
        >
          الإصدار 1.0.0
        </motion.p>
      </motion.div>
    </div>
  );
};

export default MobileLogin;
