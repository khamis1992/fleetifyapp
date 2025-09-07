import * as React from 'react';
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
  const { user, session, loading, sessionError } = useAuth();
  const navigate = useNavigate();
  const hasCheckedAuth = React.useRef(false);

  React.useEffect(() => {
    if (!loading && !hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      
      // Only redirect if there's no user AND no session AND no session error
      // This prevents redirecting during session refresh attempts
      if ((!user || !session) && !sessionError) {
        console.log('🔒 [AUTH_CHECKER] No authenticated session, redirecting to:', redirectTo);
        navigate(redirectTo, { replace: true });
      }
    }
  }, [user, session, loading, sessionError, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If there's a session error, don't redirect immediately - let SessionValidator handle it
  if (sessionError) {
    return <>{children}</>;
  }

  if (!user || !session) {
    return null; // Will redirect
  }

  return <>{children}</>;
};