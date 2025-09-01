import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthCheckerProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AuthChecker: React.FC<AuthCheckerProps> = ({ 
  children, 
  redirectTo = '/auth' 
}) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = React.useState(false);

  // Emergency timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('🔒 [AUTH_CHECKER] Loading timeout reached, checking current state');
        setTimeoutReached(true);
      }
    }, 8000); // 8 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (!loading && (!user || !session)) {
      console.log('🔒 [AUTH_CHECKER] No authenticated session, redirecting to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, session, loading, navigate, redirectTo]);

  // If timeout reached and still loading, check if we can proceed anyway
  if (timeoutReached && loading) {
    console.warn('🔒 [AUTH_CHECKER] Timeout reached but still loading, checking session manually');
    // If we have a session but user is still loading, proceed anyway
    if (session && !user) {
      console.log('🔒 [AUTH_CHECKER] Have session but no user data, proceeding with minimal auth');
      return <>{children}</>;
    }
    // If no session, redirect
    if (!session) {
      navigate(redirectTo, { replace: true });
      return null;
    }
  }

  if (loading && !timeoutReached) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !session) {
    return null; // Will redirect
  }

  return <>{children}</>;
};