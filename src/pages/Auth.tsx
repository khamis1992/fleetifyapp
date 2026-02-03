import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const Auth: React.FC = () => {
  const { user, loading, sessionError } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showError, setShowError] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  // Track if component mounted successfully
  useEffect(() => {
    console.log('🔍 [AUTH_PAGE] Component mounted');
    return () => {
      console.log('🔍 [AUTH_PAGE] Component unmounted');
    };
  }, []);

  // Prevent redirect loop in development
  useEffect(() => {
    console.log('🔍 [AUTH_PAGE] useEffect triggered - user:', !!user, 'loading:', loading, 'hasRedirected:', hasRedirected);
    if (user && !loading && !hasRedirected) {
      setHasRedirected(true);
      console.log('✅ [AUTH] User authenticated, will redirect to dashboard via Navigate component');
    }
  }, [user, loading, hasRedirected]);

  // Safety timeout for loading state - reduced to 3s for better UX
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ [AUTH] Loading timeout reached - showing auth form anyway');
        setLoadingTimeout(true);
      }, 3000); // Reduced from 5s to 3s
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Show error state after extended timeout (10s)
  useEffect(() => {
    const errorTimeout = setTimeout(() => {
      if (loading && !loadingTimeout) {
        setShowError(true);
      }
    }, 10000);
    
    return () => clearTimeout(errorTimeout);
  }, [loading, loadingTimeout]);

  // Handle reload
  const handleReload = () => {
    window.location.reload();
  };

  // Show error state if something went wrong
  if (showError || mountError || sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6" dir="rtl">
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">مشكلة في تحميل الصفحة</h2>
            <p className="text-slate-400 text-sm">
              {sessionError || mountError || 'حدثت مشكلة أثناء تحميل صفحة تسجيل الدخول. يرجى المحاولة مرة أخرى.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleReload}
              className="flex-1 bg-teal-500 hover:bg-teal-400 text-white"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              إعادة تحميل
            </Button>
            <Button 
              onClick={() => setShowError(false)}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              المتابعة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Only show loading if we haven't timed out
  // CRITICAL FIX: Always show auth form after timeout to prevent blank page
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-400">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Redirect immediately when user is authenticated and not loading
  if (user && !loading) {
    console.log('✅ [AUTH] Redirecting authenticated user to dashboard - user:', user.email);
    return <Navigate to="/dashboard" replace />;
  }

  // Show auth form only when not loading and no user
  if (!loading && !user) {
    return <AuthForm />;
  }

  // This should not be reached, but just in case
  return null;
};

export default Auth;