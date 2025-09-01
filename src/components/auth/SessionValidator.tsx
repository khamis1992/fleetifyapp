import React, { useEffect } from 'react';
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

  useEffect(() => {
    const checkSession = async () => {
      if (!loading && session && !sessionError && validateSession) {
        try {
          const isValid = await validateSession();
          if (!isValid) {
            console.log('🔒 [SESSION_VALIDATOR] Session validation failed');
          }
        } catch (error) {
          console.error('🔒 [SESSION_VALIDATOR] Session validation error:', error);
        }
      }
    };

    checkSession();
  }, [session, loading, sessionError, validateSession]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show session error if there's an authentication issue
  if (sessionError || (!user || !session)) {
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
                    await validateSession();
                  } catch (error) {
                    navigate('/auth');
                  }
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
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