import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const AuthForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { signIn } = useAuth();
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


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background-soft to-accent-muted p-6" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
            {/* Fast rotating circles around the logo */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.5s' }}>
              <div className="absolute top-2 left-1/2 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 animate-pulse"></div>
              <div className="absolute bottom-2 left-1/2 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute top-1/2 left-2 w-4 h-4 bg-primary rounded-full transform -translate-y-1/2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <div className="absolute top-1/2 right-2 w-4 h-4 bg-primary rounded-full transform -translate-y-1/2 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
            </div>
            
            {/* Counter-rotating circles with bounce */}
            <div className="absolute inset-0 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}>
              <div className="absolute top-6 right-6 w-3 h-3 bg-secondary rounded-full animate-bounce"></div>
              <div className="absolute bottom-6 left-6 w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              <div className="absolute top-6 left-6 w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.6s' }}></div>
              <div className="absolute bottom-6 right-6 w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.9s' }}></div>
            </div>
            
            {/* Floating circles with scale animation */}
            <div className="absolute inset-0" style={{ animation: 'float 3s ease-in-out infinite' }}>
              <div className="absolute top-4 left-4 w-2 h-2 bg-destructive rounded-full animate-ping"></div>
              <div className="absolute top-4 right-4 w-2 h-2 bg-destructive rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-destructive rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-4 right-4 w-2 h-2 bg-destructive rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
            </div>
            
            {/* Logo in the center */}
            <div className="relative z-10 flex items-center justify-center w-32 h-32 bg-destructive rounded-2xl shadow-accent overflow-hidden">
              <img 
                src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
                alt="Fleetify Logo" 
                className="h-24 w-auto filter brightness-0 invert"
              />
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

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 shadow-accent"
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'تسجيل الدخول'}
              </Button>
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