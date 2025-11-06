import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const hasRedirected = useRef(false);
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);

  // Prevent redirect loop in development
  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log('✅ [AUTH] User authenticated, redirecting to dashboard');
    }
  }, [user]);

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

  if (user && hasRedirected.current) {
    console.log('✅ [AUTH] Redirecting authenticated user to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthForm />;
};

export default Auth;