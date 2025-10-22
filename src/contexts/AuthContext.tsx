// SECURITY FIX: Removed @ts-nocheck and added proper TypeScript types
import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, AuthContextType, authService } from '@/lib/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const authListenerRef = useRef<{ subscription: { unsubscribe: () => void } } | null>(null);
  const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);
  const mountedRef = useRef(true);

  const initializeAuth = async () => {
    // Prevent double initialization in development (HMR)
    if (isInitialized.current) {
      return;
    }

    isInitialized.current = true;

    try {
      // Check for existing session FIRST (faster than setting up listener)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('📝 [AUTH_CONTEXT] Error getting session:', error);
        if (mountedRef.current) {
          setSessionError('خطأ في التحقق من جلسة تسجيل الدخول');
          setLoading(false);
        }
        return;
      }

      // If we have a session, load user profile immediately
      if (session?.user) {
        if (mountedRef.current) {
          setSession(session);
        }
        
        try {
          const authUser = await authService.getCurrentUser();
          if (mountedRef.current) {
            setUser(authUser);
            setSessionError(null);
          }
        } catch (error) {
          console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
          // Fallback to basic user object if profile fetch fails
          if (mountedRef.current) {
            setUser(session.user as AuthUser);
            setSessionError('خطأ في تحميل بيانات المستخدم');
          }
        }
      } else {
      }
      
      // Only set up listener if not already set
      if (!authListenerRef.current) {
        // Set up auth state listener for future changes (AFTER initial load)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            
            if (!mountedRef.current) return;
            
            // Clear session error for successful events
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setSessionError(null);
            }
            
            if (event === 'SIGNED_OUT') {
              setUser(null);
              setSession(null);
              setIsSigningOut(false);
              return;
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
              setSession(session);
              
              try {
                const authUser = await authService.getCurrentUser();
                if (mountedRef.current) {
                  setUser(authUser);
                  setSessionError(null);
                }
              } catch (error) {
                console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
                if (mountedRef.current) {
                  setUser(session.user as AuthUser);
                  setSessionError('خطأ في تحميل بيانات المستخدم');
                }
              }
            }
            
            if (event === 'TOKEN_REFRESHED' && session) {
              if (mountedRef.current) {
                setSession(session);
              }
            }
          }
        );

        authListenerRef.current = { subscription };
      }
      
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session initialization error:', error);
      if (mountedRef.current) {
        setSessionError('خطأ في تهيئة جلسة تسجيل الدخول');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Safety timeout to prevent infinite loading (reduced to 4 seconds since we optimized)
  React.useEffect(() => {
    mountedRef.current = true;
    
    // Only initialize if not already done (prevents HMR issues)
    if (!isInitialized.current) {
      initializeAuth();
      
      // Safety timeout - if still loading after 4 seconds, force loading to false
      initTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('⚠️ [AUTH_CONTEXT] Auth initialization timeout - forcing loading to false');
          setLoading(false);
        }
      }, 4000);
    }

    return () => {
      mountedRef.current = false;
      // DON'T reset isInitialized on HMR - only on real unmount
      // isInitialized will naturally reset when the module is actually reloaded

      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
      }
    };
  }, []);


  const signUp = async (email: string, password: string, userData?: Record<string, unknown>) => {
    return authService.signUp(email, password, userData);
  };

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);

    if (!result.error) {
      // MEMORY LEAK FIX: Clear existing timeout before creating new one
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
      }
      logTimeoutRef.current = setTimeout(() => {
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
      // MEMORY LEAK FIX: Clear existing timeout before creating new one
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
      }
      logTimeoutRef.current = setTimeout(() => {
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

  const updateProfile = async (updates: Record<string, unknown>) => {
    if (!user) return { error: new Error('No user logged in') };
    return authService.updateProfile(user.id, updates);
  };

  const changePassword = async (newPassword: string) => {
    return authService.changePassword(newPassword);
  };

  const validateSession = async () => {
    if (!session) {
      return false;
    }
    
    try {
      const now = Date.now() / 1000;
      if (session.expires_at && session.expires_at < now) {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          console.error('📝 [AUTH_CONTEXT] Session refresh failed:', error);
          if (!isSigningOut) {
            setSessionError('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
          }
          return false;
        }
        
        setSession(data.session);
        setSessionError(null);
        
        // Clear error and refresh user
        setSessionError(null);
        refreshUser();
        
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session validation error:', error);
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

  const value: AuthContextType = {
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