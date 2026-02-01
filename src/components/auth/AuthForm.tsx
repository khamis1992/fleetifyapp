import { useState, type ChangeEvent, type FormEvent, type FC, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, Shield, Zap, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';

export const AuthForm: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Constants for localStorage keys
  const REMEMBER_ME_KEY = 'fleetify_remember_me';
  const REMEMBERED_EMAIL_KEY = 'fleetify_remembered_email';
  const REMEMBERED_PASSWORD_KEY = 'fleetify_remembered_password';

  const { signIn } = useAuth();
  const { toast } = useToast();

  // Load saved credentials on component mount
  useEffect(() => {
    const loadSavedCredentials = () => {
      try {
        // Check if remember me was enabled
        const rememberMeEnabled = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
        if (rememberMeEnabled) {
          const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
          const savedPassword = localStorage.getItem(REMEMBERED_PASSWORD_KEY);

          if (savedEmail && savedPassword) {
            setFormData({
              email: savedEmail,
              password: savedPassword
            });
            setRememberMe(true);
          }
        }
      } catch (error) {
        console.warn('Failed to load saved credentials:', error);
        // Clear potentially corrupted data
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
      }
    };

    loadSavedCredentials();
  }, []); // Empty dependency array - only run on mount

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Save credentials if remember me is checked
      if (rememberMe) {
        try {
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
          localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email);
          localStorage.setItem(REMEMBERED_PASSWORD_KEY, formData.password);
        } catch (error) {
          console.warn('Failed to save credentials:', error);
        }
      } else {
        // Clear saved credentials if remember me is unchecked
        try {
          localStorage.removeItem(REMEMBER_ME_KEY);
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
          localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
        } catch (error) {
          console.warn('Failed to clear saved credentials:', error);
        }
      }

      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        let errorMessage = 'خطأ في تسجيل الدخول';

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'يرجى تأكيد البريد الإلكتروني أولاً';
        }

        toast({
          title: "خطأ",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "مرحباً بك",
          description: "تم تسجيل الدخول بنجاح",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    try {
      if (!formData.email) {
        toast({ title: 'تنبيه', description: 'يرجى إدخال البريد الإلكتروني أولاً', variant: 'destructive' });
        return;
      }
      await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      toast({ title: 'تم الإرسال', description: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'تعذر إرسال رابط إعادة التعيين', variant: 'destructive' });
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
    }
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: [0.4, 0, 0.6, 1] as const
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <motion.div 
          animate={pulseAnimation}
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ ...pulseAnimation, transition: { ...pulseAnimation.transition, delay: 1.5 } }}
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ ...pulseAnimation, transition: { ...pulseAnimation.transition, delay: 0.8 } }}
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-teal-400/5 rounded-full blur-[80px]" 
        />
        
        {/* Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
            className="absolute w-2 h-2 bg-teal-400/40 rounded-full"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + i * 15}%`,
            }}
          />
        ))}

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Left Side - Branding */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-12"
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-500/30 cursor-pointer"
            >
              <span className="text-white font-bold text-3xl">F</span>
            </motion.div>
            <div>
              <span className="text-3xl font-bold text-white block">Fleetify</span>
              <span className="text-teal-400 text-sm">نظام إدارة الأساطيل</span>
            </div>
          </motion.div>

          {/* Tagline with animated text */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-bold text-white leading-tight mb-6"
          >
            ادر أسطولك
            <motion.span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 block"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: '200% 200%' }}
            >
              بذكاء وكفاءة
            </motion.span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-slate-400 mb-12 leading-relaxed"
          >
            منصة متكاملة لإدارة الأسطول مع تحليلات فورية وتقارير مفصلة
          </motion.p>

          {/* Features with hover effects */}
          <motion.div variants={itemVariants} className="space-y-4">
            {[
              { icon: CheckCircle, text: '99.9% مدة تشغيل مضمونة', delay: 0 },
              { icon: Shield, text: 'حماية متقدمة للبيانات', delay: 0.1 },
              { icon: Zap, text: 'أداء فائق السرعة', delay: 0.2 },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + feature.delay }}
                whileHover={{ x: 10, transition: { duration: 0.2 } }}
                className="flex items-center gap-4 text-slate-300 group cursor-pointer"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center border border-teal-500/20 group-hover:border-teal-400/50 transition-colors"
                >
                  <feature.icon className="w-5 h-5 text-teal-400" />
                </motion.div>
                <span className="group-hover:text-teal-300 transition-colors">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats with counting animation */}
          <motion.div
            variants={itemVariants}
            className="flex gap-10 mt-14 pt-8 border-t border-slate-800/50"
          >
            {[
              { value: '500+', label: 'مركبة مُدارة' },
              { value: '34+', label: 'شركة عميلة' },
              { value: '99%', label: 'رضا العملاء' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="cursor-default"
              >
                <p className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden text-center mb-8"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <span className="text-white font-bold text-2xl">F</span>
              </div>
              <span className="text-2xl font-bold text-white">Fleetify</span>
            </motion.div>
            <p className="text-slate-400">نظام إدارة تأجير السيارات المتكامل</p>
          </motion.div>

          {/* Form Card with glassmorphism */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 rounded-[28px] blur-xl opacity-50" />
            
            <div className="relative bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-8 border border-slate-800/80 shadow-2xl">
              {/* Header with icon */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-8"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 mb-4"
                >
                  <Sparkles className="w-7 h-7 text-teal-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك</h2>
                <p className="text-slate-400">قم بتسجيل الدخول للمتابعة</p>
              </motion.div>

              <form onSubmit={handleSignIn} className="space-y-5">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-slate-300 font-medium">
                    البريد الإلكتروني
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@domain.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl text-left transition-all group-hover:border-slate-600"
                      dir="ltr"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password" className="text-slate-300 font-medium">
                    كلمة المرور
                  </Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl pl-12 text-left transition-all group-hover:border-slate-600"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading}
                      className="border-slate-600 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm text-slate-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      تذكر بياناتي
                    </label>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex justify-end"
                >
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-teal-400 hover:text-teal-300 transition-colors"
                    onClick={handleResetPassword}
                    disabled={isLoading || !formData.email}
                  >
                    هل نسيت كلمة المرور؟
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 transition-all group overflow-hidden relative"
                    disabled={isLoading}
                  >
                    {/* Button shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                      animate={{ x: ['0%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <span className="flex items-center gap-2 relative z-10">
                        تسجيل الدخول
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-8 text-sm text-slate-500"
          >
            © 2025 Fleetify - جميع الحقوق محفوظة
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};
