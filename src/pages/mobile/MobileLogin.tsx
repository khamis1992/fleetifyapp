import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Fingerprint, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useAuth } from '@/contexts/AuthContext';

export const MobileLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricSetupSuccess, setBiometricSetupSuccess] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Biometric auth hook
  const {
    isAvailable: biometricAvailable,
    hasSavedCredentials,
    savedEmail,
    isLoading: biometricLoading,
    authenticateWithBiometrics,
    registerBiometric,
    saveCredentials
  } = useBiometricAuth();

  // Floating particles state
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
    }))
  );

  // Auto-fill saved email
  useEffect(() => {
    if (savedEmail && !email) {
      setEmail(savedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedEmail]);

  // SIMPLIFIED: Single useEffect for all redirect logic
  useEffect(() => {
    console.log('🔄 [MobileLogin useEffect] State:', {
      hasRedirected: hasRedirectedRef.current,
      authLoading,
      user: !!user,
      loginSuccess
    });
    
    // Skip if already redirected or still loading
    if (hasRedirectedRef.current || authLoading) return;
    
    // Case 1: User is authenticated (either already logged in or just logged in)
    if (user) {
      hasRedirectedRef.current = true;
      setIsSubmitting(false);
      
      // Show biometric setup prompt only after successful login (not for already logged in users)
      if (loginSuccess && biometricAvailable && !hasSavedCredentials) {
        console.log('✅ [MobileLogin] User authenticated, showing biometric setup');
        setShowBiometricPrompt(true);
      } else {
        console.log('✅ [MobileLogin] User authenticated, navigating to employee home');
        navigate('/mobile/employee/home', { replace: true });
      }
      return;
    }
    
    // Case 2: Login was successful but AuthContext hasn't updated yet (with timeout)
    if (loginSuccess) {
      const timeout = setTimeout(() => {
        if (!hasRedirectedRef.current) {
          console.warn('⚠️ [MobileLogin] AuthContext timeout (2s) - navigating directly');
          hasRedirectedRef.current = true;
          setIsSubmitting(false);
          navigate('/mobile/employee/home', { replace: true });
        }
      }, 2000); // Reduced from 5s to 2s for faster fallback
      
      return () => clearTimeout(timeout);
    }
  }, [user, authLoading, loginSuccess, biometricAvailable, hasSavedCredentials, navigate]);


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

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      console.log('🔐 [MobileLogin] Supabase response:', { data, error: authError });

      if (authError) {
        console.error('❌ [MobileLogin] Supabase error:', authError);

        // Translate common errors to Arabic
        let errorMessage = authError.message;
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'يرجى تأكيد البريد الإلكتروني أولاً';
        } else if (authError.message.includes('Too many requests')) {
          errorMessage = 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً';
        }

        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      if (data.user && data.session) {
        console.log('✅ [MobileLogin] Login successful for user:', data.user.email);
        console.log('🔑 [MobileLogin] Session received:', {
          access_token: data.session.access_token ? 'present' : 'missing',
          refresh_token: data.session.refresh_token ? 'present' : 'missing',
          expires_at: data.session.expires_at
        });

        // CRITICAL: Check if session is being saved to storage
        setTimeout(async () => {
          const { data: { session: checkSession } } = await supabase.auth.getSession();
          console.log('🔍 [MobileLogin] Session check after 1s:', checkSession ? 'Session found' : 'Session NOT found');
        }, 1000);

        // Save credentials for biometric login (don't block on this)
        try {
          await saveCredentials(email.trim());
        } catch (saveErr) {
          console.warn('⚠️ [MobileLogin] Failed to save credentials for biometric:', saveErr);
          // Continue anyway - this is not critical
        }

        // Set login success flag - the useEffect will handle navigation
        // once AuthContext updates the user state
        setLoginSuccess(true);
        console.log('🔄 [MobileLogin] Waiting for AuthContext to update user state...');
      } else {
        console.error('❌ [MobileLogin] Login response missing user or session:', { user: !!data.user, session: !!data.session });
        setError('فشل تسجيل الدخول - يرجى المحاولة مرة أخرى');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('❌ [MobileLogin] Unexpected error:', err);
      setError(err.message || 'حدث خطأ غير متوقع');
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');

    if (biometricLoading) return;

    try {
      const result = await authenticateWithBiometrics(savedEmail || email);

      if (result.success) {
        console.log('✅ [MobileLogin] Biometric login successful');
        setLoginSuccess(true);
        console.log('🔄 [MobileLogin] Waiting for AuthContext to update user state...');
      } else {
        setError(result.error || 'فشلت المصادقة البيومترية');
      }
    } catch (err: any) {
      console.error('❌ [MobileLogin] Biometric error:', err);
      setError(err.message || 'حدث خطأ في المصادقة البيومترية');
    }
  };

  const handleBiometricSetup = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const result = await registerBiometric(email.trim());

      if (result.success) {
        setBiometricSetupSuccess(true);
        setTimeout(() => {
          navigate('/mobile/employee/home', { replace: true });
        }, 1500);
      } else {
        setError(result.error || 'فشل تسجيل البصمة');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('❌ [MobileLogin] Biometric setup error:', err);
      setError(err.message || 'حدث خطأ أثناء التسجيل');
      setIsSubmitting(false);
    }
  };

  const skipBiometricSetup = () => {
    setShowBiometricPrompt(false);
    setTimeout(() => {
      navigate('/mobile/employee/home', { replace: true });
    }, 300);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-[#0a0a0a]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      dir="rtl"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-500/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-emerald-500/15 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-cyan-500/10 rounded-full blur-[80px]"
        />

        {/* Floating Particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-teal-400/30"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 min-h-screen flex flex-col px-6 py-8"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mb-8"
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </motion.button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-white/50">اتصال آمن</span>
          </div>
        </motion.div>

        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center mb-10"
        >
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-2"
          >
            مرحباً بعودتك
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/50 text-sm"
          >
            سجل دخولك للوصول إلى حسابك
          </motion.p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onSubmit={handleSubmit}
          className="flex-1 space-y-5"
        >
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-xl"
              >
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-semibold text-red-300 mb-0.5">خطأ في تسجيل الدخول</p>
                  <p className="text-xs text-red-400/80">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Input */}
          <motion.div
            animate={focusedField === 'email' ? { scale: 1.01 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <label className="text-sm font-medium text-white/70 block mb-2">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-2xl transition-opacity duration-300",
                focusedField === 'email' 
                  ? "bg-gradient-to-r from-teal-500/20 to-emerald-500/20 opacity-100" 
                  : "opacity-0"
              )} />
              <div className="relative">
                <Mail className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300",
                  focusedField === 'email' ? "text-teal-400" : "text-white/30"
                )} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="example@email.com"
                  className={cn(
                    'w-full pr-12 pl-4 py-4 rounded-2xl text-base',
                    'bg-white/5 border-2 transition-all duration-300',
                    focusedField === 'email'
                      ? 'border-teal-500/50 bg-white/10'
                      : 'border-white/10 hover:border-white/20',
                    'focus:outline-none',
                    'text-white placeholder:text-white/30'
                  )}
                  dir="ltr"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>
          </motion.div>

          {/* Password Input */}
          <motion.div
            animate={focusedField === 'password' ? { scale: 1.01 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <label className="text-sm font-medium text-white/70 block mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-2xl transition-opacity duration-300",
                focusedField === 'password' 
                  ? "bg-gradient-to-r from-teal-500/20 to-emerald-500/20 opacity-100" 
                  : "opacity-0"
              )} />
              <div className="relative">
                <Lock className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300",
                  focusedField === 'password' ? "text-teal-400" : "text-white/30"
                )} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full pr-12 pl-14 py-4 rounded-2xl text-base',
                    'bg-white/5 border-2 transition-all duration-300',
                    focusedField === 'password'
                      ? 'border-teal-500/50 bg-white/10'
                      : 'border-white/10 hover:border-white/20',
                    'focus:outline-none',
                    'text-white placeholder:text-white/30'
                  )}
                  dir="ltr"
                  autoComplete="current-password"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Forgot Password */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-start"
          >
            <button
              type="button"
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              نسيت كلمة المرور؟
            </button>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-white text-base relative overflow-hidden',
                'bg-gradient-to-r from-teal-500 to-emerald-500',
                'shadow-xl shadow-teal-500/25',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'transition-all duration-300'
              )}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400"
                initial={{ x: '100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </span>
            </motion.button>
          </motion.div>

          {/* Biometric Login Button - Show when credentials are saved */}
          {hasSavedCredentials && biometricAvailable && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="pt-2"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-white text-base relative overflow-hidden',
                  'bg-gradient-to-r from-purple-500 to-indigo-500',
                  'shadow-xl shadow-purple-500/25',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'transition-all duration-300'
                )}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400"
                  initial={{ x: '100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {biometricLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>جاري المصادقة...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5" />
                      <span>تسجيل الدخول بالبصمة</span>
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          )}

          {/* Biometric Login Hint - Show only when no saved credentials */}
          {!hasSavedCredentials && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-3 py-4"
            >
              <div className="h-px flex-1 bg-white/10" />
              <div className="flex items-center gap-2 text-white/40">
                <Fingerprint className="w-4 h-4" />
                <span className="text-xs">أو استخدم البصمة</span>
              </div>
              <div className="h-px flex-1 bg-white/10" />
            </motion.div>
          )}
        </motion.form>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-6 pb-4"
        >
          <p className="text-white/40 text-sm mb-2">ليس لديك حساب؟</p>
          <button
            type="button"
            className="text-teal-400 font-semibold hover:text-teal-300 transition-colors"
          >
            إنشاء حساب جديد
          </button>
        </motion.div>

        {/* Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-xs text-white/20 pb-2"
        >
          الإصدار 2.0.0
        </motion.p>
      </motion.div>

      {/* Biometric Setup Prompt Modal */}
      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 border-t border-white/10"
            >
              {/* Handle bar */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              {/* Success State */}
              {biometricSetupSuccess ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-10 h-10 text-green-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2">تم التسجيل بنجاح!</h3>
                  <p className="text-white/60 text-sm">يمكنك الآن استخدام بصمتك لتسجيل الدخول بسرعة</p>
                </div>
              ) : (
                <>
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center"
                    >
                      <Fingerprint className="w-10 h-10 text-purple-400" />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-white mb-3">
                      تفعيل تسجيل الدخول بالبصمة؟
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      يمكنك تسجيل الدخول بسرعة وأمان باستخدام بصمتك أو Face ID في المرة القادمة
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6"
                    >
                      <p className="text-sm text-red-300 text-center">{error}</p>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBiometricSetup}
                      disabled={isSubmitting}
                      className={cn(
                        'w-full py-4 rounded-2xl font-bold text-white',
                        'bg-gradient-to-r from-purple-500 to-indigo-500',
                        'shadow-xl shadow-purple-500/25',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        'transition-all duration-300'
                      )}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>جاري التسجيل...</span>
                        </span>
                      ) : (
                        <span>تفعيل البصمة</span>
                      )}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={skipBiometricSetup}
                      className={cn(
                        'w-full py-4 rounded-2xl font-semibold',
                        'bg-white/5 border border-white/10 text-white/70',
                        'hover:bg-white/10 hover:text-white',
                        'transition-all duration-300'
                      )}
                    >
                      لاحقاً
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileLogin;
