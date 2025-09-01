import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, LogIn, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SessionValidatorProps {
  children: React.ReactNode;
}

export const SessionValidator: React.FC<SessionValidatorProps> = ({ children }) => {
  const { user, session, loading, sessionError, validateSession } = useAuth();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    // Check network connection
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    };

    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      // Don't check if still loading or if we're already retrying
      if (loading || retrying) return;

      // Check if we have basic auth requirements
      if (!user || !session) {
        console.log('🔒 [SESSION_VALIDATOR] No user or session, redirecting to auth');
        navigate('/auth', { replace: true });
        return;
      }

      // If there's a session error, try validation first
      if (sessionError && validateSession) {
        console.log('🔒 [SESSION_VALIDATOR] Session error detected, attempting validation');
        setRetrying(true);
        try {
          const isValid = await validateSession();
          if (!isValid) {
            console.log('🔒 [SESSION_VALIDATOR] Session validation failed, redirecting');
            navigate('/auth', { replace: true });
          } else {
            console.log('🔒 [SESSION_VALIDATOR] Session validated successfully');
          }
        } catch (error) {
          console.error('🔒 [SESSION_VALIDATOR] Session validation error:', error);
          navigate('/auth', { replace: true });
        } finally {
          setRetrying(false);
        }
      }
    };

    checkSession();
  }, [user, session, loading, sessionError, validateSession, navigate, retrying]);

  // Show loading while auth is initializing
  if (loading || retrying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">
            {retrying ? 'جاري إعادة المحاولة...' : 'جاري التحقق من جلسة تسجيل الدخول...'}
          </p>
          {connectionStatus === 'disconnected' && (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">لا يوجد اتصال بالإنترنت</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show session error if there's an authentication issue
  if (sessionError || (!user || !session)) {
    const handleRetry = async () => {
      setRetrying(true);
      try {
        if (validateSession) {
          const isValid = await validateSession();
          if (isValid) {
            console.log('🔒 [SESSION_VALIDATOR] Retry successful');
            return; // Let the useEffect handle the state update
          }
        }
        // If validation fails or no validateSession, reload the page
        window.location.reload();
      } catch (error) {
        console.error('🔒 [SESSION_VALIDATOR] Retry failed:', error);
        window.location.reload();
      }
    };

    const handleLogin = () => {
      navigate('/auth', { replace: true });
    };

    const getErrorMessage = () => {
      if (connectionStatus === 'disconnected') {
        return 'لا يوجد اتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';
      }
      return sessionError || 'انتهت صلاحية جلسة تسجيل الدخول';
    };

    const getErrorIcon = () => {
      if (connectionStatus === 'disconnected') {
        return <WifiOff className="h-6 w-6 text-destructive" />;
      }
      return <AlertCircle className="h-6 w-6 text-destructive" />;
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              {getErrorIcon()}
            </div>
            <CardTitle>مشكلة في جلسة تسجيل الدخول</CardTitle>
            <CardDescription>{getErrorMessage()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionStatus === 'connected' && (
              <div className="flex items-center justify-center gap-2 text-success text-sm">
                <Wifi className="h-4 w-4" />
                <span>متصل بالإنترنت</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={handleLogin} className="w-full">
                <LogIn className="w-4 h-4 mr-2" />
                تسجيل الدخول
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRetry} 
                className="w-full"
                disabled={retrying || connectionStatus === 'disconnected'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}
              </Button>
            </div>
            {sessionError && sessionError.includes('بيانات أساسية') && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">تم تحميل بيانات أساسية</p>
                    <p className="text-muted-foreground">يمكنك المتابعة ولكن بعض الميزات قد لا تعمل بشكل كامل.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if session is valid
  return <>{children}</>;
};