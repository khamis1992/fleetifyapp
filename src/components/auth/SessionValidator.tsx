import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SessionValidatorProps {
  children: React.ReactNode;
}

export const SessionValidator: React.FC<SessionValidatorProps> = ({ children }) => {
  const { user, session, loading, sessionError, validateSession } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && session && sessionError && validateSession) {
      validateSession().catch(console.error);
    }
  }, [loading, session, sessionError, validateSession]);

  // Show loading while auth is initializing
  if (loading || isRefreshing) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show session error if there's an authentication issue
  // Only show error if loading is complete AND there's actually an error or missing session
  if (!loading && (sessionError || (!user || !session))) {
    return (
      <Card className="border-destructive max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            مشكلة في جلسة تسجيل الدخول
          </CardTitle>
          <CardDescription>
            {sessionError || 'انتهت جلسة تسجيل الدخول'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {sessionError 
              ? 'حدث خطأ في التحقق من صحة جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى.'
              : 'لا يمكن الوصول إلى هذه الصفحة بدون تسجيل الدخول.'
            }
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </Button>
            
            {sessionError && validateSession && (
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    setIsRefreshing(true);
                    console.log('🔒 [SESSION_VALIDATOR] Manual session validation attempt...');
                    const isValid = await validateSession();
                    if (isValid) {
                      console.log('🔒 [SESSION_VALIDATOR] Manual validation successful');
                      // AuthContext will handle state updates automatically
                    } else {
                      console.log('🔒 [SESSION_VALIDATOR] Manual validation failed, redirecting to auth');
                      navigate('/auth');
                    }
                  } catch (error) {
                    console.error('🔒 [SESSION_VALIDATOR] Manual validation error:', error);
                    navigate('/auth');
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                className="flex items-center gap-2"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'جاري المحاولة...' : 'إعادة المحاولة'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render children if session is valid
  return <>{children}</>;
};
