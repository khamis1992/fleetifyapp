import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const hasRedirected = useRef(false);

  // Prevent redirect loop in development
  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user && hasRedirected.current) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthForm />;
};

export default Auth;