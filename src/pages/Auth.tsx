import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Prevent redirect loop in development
  useEffect(() => {
    console.log('🔍 [AUTH_PAGE] useEffect triggered - user:', !!user, 'hasRedirected:', hasRedirected);
    if (user && !hasRedirected) {
      setHasRedirected(true);
      console.log('✅ [AUTH] User authenticated, redirecting to dashboard');
    }
  }, [user, hasRedirected]);

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

  // Only show loading if we haven't timed out
  // CRITICAL FIX: Always show auth form after timeout to prevent blank page
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (user) {
    console.log('✅ [AUTH] Redirecting authenticated user to dashboard - user:', user.email);
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthForm />;
};

export default Auth;