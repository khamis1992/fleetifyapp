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

  useEffect(() => {
    if (!loading && (!user || !session)) {
      console.log('🔒 [AUTH_CHECKER] No authenticated session, redirecting to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, session, loading, navigate, redirectTo]);

  if (loading) {
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