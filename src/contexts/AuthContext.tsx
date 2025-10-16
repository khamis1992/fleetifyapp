// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, AuthContextType, authService } from '@/lib/auth';
import { logger } from '@/lib/logger';

const AuthContext = createContext<any>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const authListenerRef = useRef<any>(null);

  const initializeAuth = async () => {
    const startTime = Date.now();
    try {
      logger.log('🔄 [AUTH_CONTEXT] Initializing authentication...');
      
      // Check for existing session FIRST (faster than setting up listener)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('📝 [AUTH_CONTEXT] Error getting session:', error);
        // If it's a token expiration error, clear the session
        if (error.message && error.message.includes('invalid JWT')) {
          logger.log('📝 [AUTH_CONTEXT] Invalid JWT detected, clearing session');
          // Clear local storage to remove expired token
          localStorage.removeItem('sb-qwhunliohlkkahbspfiu-auth-token');
          localStorage.removeItem('sb-qwhunliohlkkahbspfiu-refresh-token');
        }
        setSessionError('خطأ في التحقق من جلسة تسجيل الدخول');
        setLoading(false);
        return;
      }

      // If we have a session, load user profile immediately
      if (session?.user) {
        logger.log('📝 [AUTH_CONTEXT] Existing session found, loading profile...');
        setSession(session);
        
        try {
          const authUser = await authService.getCurrentUser();
          logger.log('📝 [AUTH_CONTEXT] Profile loaded in', Date.now() - startTime, 'ms');
          setUser(authUser);
          setSessionError(null);
        } catch (error) {
          console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
          // If it's a token expiration error, clear the session
          if (error.message && error.message.includes('invalid JWT')) {
            logger.log('📝 [AUTH_CONTEXT] Invalid JWT in profile fetch, clearing session');
            // Clear local storage to remove expired token
            localStorage.removeItem('sb-qwhunliohlkkahbspfiu-auth-token');
            localStorage.removeItem('sb-qwhunliohlkkahbspfiu-refresh-token');
            setUser(null);
            setSession(null);
          } else {
            // Fallback to basic user object if profile fetch fails
            setUser(session.user as AuthUser);
            setSessionError('خطأ في تحميل بيانات المستخدم');
          }
        }
      } else {
        logger.log('📝 [AUTH_CONTEXT] No existing session');
      }
      
      // Set up auth state listener for future changes (AFTER initial load)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          logger.log('📝 [AUTH_CONTEXT] Auth state change:', event, !!session);
          
          // Clear session error for successful events
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setSessionError(null);
          }
          
          if (event === 'SIGNED_OUT') {
            logger.log('📝 [AUTH_CONTEXT] User signed out');
            setUser(null);
            setSession(null);
            setIsSigningOut(false);
            return;
          }
          
          if (event === 'SIGNED_IN' && session?.user) {
            logger.log('📝 [AUTH_CONTEXT] User signed in, loading profile...');
            setSession(session);
            
            try {
              const authUser = await authService.getCurrentUser();
              setUser(authUser);
              setSessionError(null);
            } catch (error) {
              logger.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
              // Handle invalid JWT errors during sign in
              if (error?.message && error.message.includes('invalid JWT')) {
                console.log('📝 [AUTH_CONTEXT] Invalid JWT during sign in, clearing session');
                localStorage.removeItem('sb-qwhunliohlkkahbspfiu-auth-token');
                localStorage.removeItem('sb-qwhunliohlkkahbspfiu-refresh-token');
                setUser(null);
                setSession(null);
              } else {
                setUser(session.user as AuthUser);
                setSessionError('خطأ في تحميل بيانات المستخدم');
              }
            }
          }
          
          if (event === 'TOKEN_REFRESHED' && session) {
            logger.log('📝 [AUTH_CONTEXT] Token refreshed');
            setSession(session);
          }
        }
      );

      authListenerRef.current = { subscription };
      
    } catch (error) {
      logger.error('📝 [AUTH_CONTEXT] Session initialization error:', error);
      setSessionError('خطأ في تهيئة جلسة تسجيل الدخول');
    } finally {
      setLoading(false);
      logger.log('📝 [AUTH_CONTEXT] Auth initialization complete in', Date.now() - startTime, 'ms');
    }
  };

  // Safety timeout to prevent infinite loading (reduced to 4 seconds since we optimized)
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  React.useEffect(() => {
    initializeAuth();
    
    // Safety timeout - if still loading after 4 seconds, force loading to false
    initTimeoutRef.current = setTimeout(() => {
      logger.warn('⚠️ [AUTH_CONTEXT] Auth initialization timeout - forcing loading to false');
      setLoading(false);
    }, 4000);

    return () => {
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);


  const signUp = async (email: string, password: string, userData?: any) => {
    return authService.signUp(email, password, userData);
  };

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    
    if (!result.error) {
      setTimeout(() => {
        supabase.from('system_logs').insert({
          level: 'info',
          category: 'authentication',
          action: 'login',
          message: `تسجيل دخول للمستخدم ${email}`,
          metadata: { email }
        });
      }, 1000);
    }
    
    return result;
  };

  const signOut = async () => {
    setIsSigningOut(true);
    const email = user?.email;
    const result = await authService.signOut();
    
    if (!result.error && email) {
      setTimeout(() => {
        supabase.from('system_logs').insert({
          level: 'info',
          category: 'authentication',
          action: 'logout',
          message: `تسجيل خروج للمستخدم ${email}`,
          metadata: { email }
        });
      }, 500);
    }
    
    return result;
  };

  const updateProfile = async (updates: any) => {
    if (!user) return { error: new Error('No user logged in') };
    return authService.updateProfile(user.id, updates);
  };

  const changePassword = async (newPassword: string) => {
    return authService.changePassword(newPassword);
  };

  const validateSession = async () => {
    if (!session) {
      logger.log('📝 [AUTH_CONTEXT] No session to validate');
      return false;
    }
    
    try {
      logger.log('📝 [AUTH_CONTEXT] Validating session...');
      const now = Date.now() / 1000;
      if (session.expires_at && session.expires_at < now) {
        logger.log('📝 [AUTH_CONTEXT] Session expired, attempting refresh...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          logger.error('📝 [AUTH_CONTEXT] Session refresh failed:', error);
          // If it's a token expiration error, clear local storage
          if (error?.message && error.message.includes('invalid JWT')) {
            logger.log('📝 [AUTH_CONTEXT] Invalid JWT during refresh, clearing local storage');
            localStorage.removeItem('sb-qwhunliohlkkahbspfiu-auth-token');
            localStorage.removeItem('sb-qwhunliohlkkahbspfiu-refresh-token');
          }
          if (!isSigningOut) {
            setSessionError('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
          }
          return false;
        }
        
        logger.log('📝 [AUTH_CONTEXT] Session refreshed successfully');
        setSession(data.session);
        setSessionError(null);
        
        // Clear error and refresh user
        setSessionError(null);
        refreshUser();
        
        return true;
      }
      
      logger.log('📝 [AUTH_CONTEXT] Session is still valid');
      return true;
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session validation error:', error);
      // Handle invalid JWT errors
      if (error?.message && error.message.includes('invalid JWT')) {
        console.log('📝 [AUTH_CONTEXT] Invalid JWT during validation, clearing local storage');
        localStorage.removeItem('sb-qwhunliohlkkahbspfiu-auth-token');
        localStorage.removeItem('sb-qwhunliohlkkahbspfiu-refresh-token');
        setUser(null);
        setSession(null);
      }
      if (!isSigningOut) {
        setSessionError('خطأ في التحقق من صحة الجلسة');
      }
      return false;
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      try {
        const authUser = await authService.getCurrentUser();
        setUser(authUser);
      } catch (error) {
        console.error('📝 [AUTH_CONTEXT] Error refreshing user:', error);
      }
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    sessionError,
    validateSession,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};