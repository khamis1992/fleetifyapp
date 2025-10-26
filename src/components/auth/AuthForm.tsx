import { useState, type ChangeEvent, type FormEvent, type FC } from 'react';
import { Eye, EyeOff, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { LazyImage } from '@/components/common/LazyImage';
import { signInToDemo, isDemoModeEnabled } from '@/lib/demo';

export const AuthForm: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: FormEvent) => {
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

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const { data, error } = await signInToDemo();
      
      if (error) {
        toast({
          title: "خطأ",
          description: "تعذر الدخول إلى الحساب التجريبي. يرجى المحاولة لاحقاً.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "مرحباً بك في النسخة التجريبية!",
          description: "لديك 7 أيام لتجربة جميع ميزات النظام مجاناً",
        });
      }
    } catch (error) {
      console.error('Demo login error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background-soft to-accent-muted p-6" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
            {/* Logo with animated holes/gaps */}
            <div className="relative z-10 flex items-center justify-center w-32 h-32 bg-destructive rounded-2xl shadow-accent overflow-hidden">
              {/* Base logo */}
              <LazyImage 
                src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
                alt="Fleetify Logo" 
                className="h-24 w-auto filter brightness-0 invert relative z-10"
              />
              
              {/* Animated holes that appear when dots move out */}
              <div className="absolute inset-0 bg-transparent">
                {/* Top hole */}
                <div className="absolute top-6 left-1/2 w-3 h-3 bg-background rounded-full transform -translate-x-1/2 opacity-0" 
                     style={{ 
                       animation: 'hole-appear 2s ease-in-out infinite',
                       animationDelay: '0.2s'
                     }}></div>
                
                {/* Bottom hole */}
                <div className="absolute bottom-6 left-1/2 w-3 h-3 bg-background rounded-full transform -translate-x-1/2 opacity-0" 
                     style={{ 
                       animation: 'hole-appear 2s ease-in-out infinite',
                       animationDelay: '0.7s'
                     }}></div>
                
                {/* Left hole */}
                <div className="absolute top-1/2 left-6 w-3 h-3 bg-background rounded-full transform -translate-y-1/2 opacity-0" 
                     style={{ 
                       animation: 'hole-appear 2.2s ease-in-out infinite',
                       animationDelay: '1s'
                     }}></div>
                
                {/* Right hole */}
                <div className="absolute top-1/2 right-6 w-3 h-3 bg-background rounded-full transform -translate-y-1/2 opacity-0" 
                     style={{ 
                       animation: 'hole-appear 2.2s ease-in-out infinite',
                       animationDelay: '1.4s'
                     }}></div>
              </div>
            </div>
            
            {/* Dots that move out from logo creating holes */}
            <div className="absolute inset-0">
              <div className="absolute top-6 left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2" 
                   style={{ animation: 'dot-escape 2s ease-in-out infinite' }}></div>
              <div className="absolute bottom-6 left-1/2 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2" 
                   style={{ animation: 'dot-escape-reverse 2s ease-in-out infinite', animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 left-6 w-3 h-3 bg-secondary rounded-full transform -translate-y-1/2" 
                   style={{ animation: 'dot-escape 2.2s ease-in-out infinite', animationDelay: '0.8s' }}></div>
              <div className="absolute top-1/2 right-6 w-3 h-3 bg-secondary rounded-full transform -translate-y-1/2" 
                   style={{ animation: 'dot-escape-reverse 2.2s ease-in-out infinite', animationDelay: '1.2s' }}></div>
            </div>
            
            {/* Additional floating particles */}
            <div className="absolute inset-0">
              <div className="absolute top-8 right-8 w-2 h-2 bg-accent rounded-full" 
                   style={{ animation: 'particle-float 1.8s ease-in-out infinite', animationDelay: '0.3s' }}></div>
              <div className="absolute bottom-8 left-8 w-2 h-2 bg-accent rounded-full" 
                   style={{ animation: 'particle-float 1.8s ease-in-out infinite', animationDelay: '0.7s' }}></div>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            نظام إدارة تأجير السيارات المتكامل
          </p>
        </div>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">مرحباً بك</CardTitle>
            <CardDescription>
              قم بتسجيل الدخول للبدء
            </CardDescription>
          </CardHeader>
          <CardContent>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@domain.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="text-left"
                  dir="ltr"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pl-10 text-left"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <Button
                  type="button"
                  variant="link"
                  className="px-0"
                  onClick={handleResetPassword}
                  disabled={isLoading || !formData.email}
                >
                  هل نسيت كلمة المرور؟
                </Button>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 shadow-accent"
                disabled={isLoading || isDemoLoading}
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'تسجيل الدخول'}
              </Button>

              {/* Demo Mode Button */}
              {isDemoModeEnabled() && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        أو
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all"
                    onClick={handleDemoLogin}
                    disabled={isLoading || isDemoLoading}
                  >
                    {isDemoLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 ml-2" />
                        تجربة النظام (7 أيام مجاناً)
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-2">
                    لا يتطلب بريد إلكتروني • بيانات تجريبية جاهزة
                  </p>
                </>
              )}
            </form>

          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2025 Fleetify - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
};