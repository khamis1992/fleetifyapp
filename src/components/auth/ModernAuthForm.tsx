import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Eye, EyeOff, Car, Mail, Lock, User, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { InteractiveCard } from '@/components/landing/InteractiveCard';

type AuthMode = 'signin' | 'signup';

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string;
}

export const ModernAuthForm: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    firstNameAr: '',
    lastNameAr: '',
    phone: ''
  });

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        first_name_ar: formData.firstNameAr,
        last_name_ar: formData.lastNameAr,
        phone: formData.phone
      });
      
      if (error) {
        let errorMessage = 'خطأ في إنشاء الحساب';
        
        if (error.message.includes('User already registered')) {
          errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'البريد الإلكتروني غير صحيح';
        }
        
        toast({
          title: "خطأ",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم إنشاء الحساب",
          description: "تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.",
        });
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          firstNameAr: '',
          lastNameAr: '',
          phone: ''
        });
        setAuthMode('signin');
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-64 h-64 bg-gradient-primary rounded-full opacity-10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 30, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-accent rounded-full opacity-10 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 20, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-secondary rounded-full opacity-5 blur-2xl"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-lg"
        >
          {/* Logo Section */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-6 shadow-glow"
            >
              <Car className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="arabic-heading-lg text-container mb-2"
            >
              Fleetify
            </motion.h1>
            
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center space-x-2 bg-gradient-primary/10 px-4 py-2 rounded-full border border-primary/20 mb-4"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="arabic-body-sm font-medium text-primary">منصة إدارة الأساطيل المتطورة</span>
            </motion.div>
          </motion.div>

          {/* Auth Mode Toggle */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex bg-muted/30 backdrop-blur-sm rounded-2xl p-1.5 border border-border/50">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  authMode === 'signin'
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  authMode === 'signup'
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                حساب جديد
              </button>
            </div>
          </motion.div>

          {/* Auth Form */}
          <motion.div variants={itemVariants}>
            <InteractiveCard className="p-0">
              <div className="p-8">
                <AnimatePresence mode="wait">
                  {authMode === 'signin' ? (
                    <motion.form
                      key="signin"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleSignIn}
                      className="space-y-6"
                    >
                      <div className="text-center mb-8">
                        <h2 className="arabic-heading-sm text-container mb-2">مرحباً بعودتك</h2>
                        <p className="arabic-body text-muted-foreground">أدخل بياناتك لتسجيل الدخول</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="arabic-body-sm">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="example@domain.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            className="pr-12 text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password" className="arabic-body-sm">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            className="px-12 text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-background/80"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full arabic-body py-6 bg-gradient-primary hover:opacity-90 shadow-glow group transition-all duration-300 hover:scale-[1.02]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            تسجيل الدخول
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="signup"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleSignUp}
                      className="space-y-6"
                    >
                      <div className="text-center mb-8">
                        <h2 className="arabic-heading-sm text-container mb-2">انضم إلينا</h2>
                        <p className="arabic-body text-muted-foreground">أنشئ حسابك الجديد</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="arabic-body-sm">الاسم الأول</Label>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="firstName"
                              name="firstName"
                              placeholder="أحمد"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              required
                              disabled={isLoading}
                              className="pr-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="arabic-body-sm">اسم العائلة</Label>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="lastName"
                              name="lastName"
                              placeholder="المحمد"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              required
                              disabled={isLoading}
                              className="pr-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstNameAr" className="arabic-body-sm">First Name</Label>
                          <Input
                            id="firstNameAr"
                            name="firstNameAr"
                            placeholder="Ahmed"
                            value={formData.firstNameAr}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            className="text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastNameAr" className="arabic-body-sm">Last Name</Label>
                          <Input
                            id="lastNameAr"
                            name="lastNameAr"
                            placeholder="Al-Mohammad"
                            value={formData.lastNameAr}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            className="text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="arabic-body-sm">رقم الهاتف</Label>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+965 XXXX XXXX"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            className="pr-12 text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="arabic-body-sm">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            name="email"
                            type="email"
                            placeholder="example@domain.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            className="pr-12 text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="arabic-body-sm">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            className="px-12 text-left bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
                            dir="ltr"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-background/80"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="arabic-body-xs text-muted-foreground">
                          يجب أن تكون كلمة المرور على الأقل 6 أحرف
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full arabic-body py-6 bg-gradient-accent hover:opacity-90 shadow-glow group transition-all duration-300 hover:scale-[1.02]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            إنشاء حساب جديد
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </InteractiveCard>
          </motion.div>

          {/* Footer */}
          <motion.div 
            variants={itemVariants}
            className="text-center mt-8"
          >
            <p className="arabic-body-sm text-muted-foreground/80">
              © 2024 Fleetify - جميع الحقوق محفوظة
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};