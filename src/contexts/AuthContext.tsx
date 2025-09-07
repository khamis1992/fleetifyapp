// Import React polyfill first to ensure hooks are available
import '../utils/react-polyfill';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
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
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Comprehensive safety checks for React hooks availability
  if (typeof useState === 'undefined' || typeof useEffect === 'undefined' || typeof useContext === 'undefined') {
    console.error('React hooks are not available. This might be a React version conflict.');
    console.error('useState available:', typeof useState !== 'undefined');
    console.error('useEffect available:', typeof useEffect !== 'undefined');
    console.error('useContext available:', typeof useContext !== 'undefined');
    console.error('React object:', React);
    
    // Try to use React hooks directly from React object as fallback
    if (React && React.useState) {
      console.log('Attempting to use React hooks directly from React object...');
    } else {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '5px',
          margin: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2>خطأ في تحميل النظام</h2>
          <p>يرجى إعادة تحميل الصفحة أو الاتصال بالدعم الفني</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
  }
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Session validation helper with improved error handling
  const validateSession = useCallback(async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession) {
      return false;
    }

    try {
      // Check if session is expired
      const now = Date.now() / 1000;
      if (currentSession.expires_at && currentSession.expires_at < now) {
        console.log('📝 [AUTH_CONTEXT] Session expired, attempting refresh...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          console.error('📝 [AUTH_CONTEXT] Session refresh failed:', error);
          // Only set session error if we're not in the middle of signing out
          if (!isSigningOut) {
            setSessionError('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
          }
          return false;
        }
        
        console.log('📝 [AUTH_CONTEXT] Session refreshed successfully');
        setSession(data.session);
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session validation error:', error);
      // Only set session error if we're not in the middle of signing out
      if (!isSigningOut) {
        setSessionError('خطأ في التحقق من صحة الجلسة');
      }
      return false;
    }
  }, [isSigningOut]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📝 [AUTH_CONTEXT] Auth state change:', event, !!session);
        
        // Clear previous errors except when signing out
        if (event !== 'SIGNED_OUT' || !isSigningOut) {
          setSessionError(null);
        }
        
        if (event === 'SIGNED_OUT') {
          // Only clear user/session if this is an intentional sign out
          if (isSigningOut) {
            setUser(null);
            setSession(null);
            setIsSigningOut(false);
          } else {
            // For unexpected sign outs, try to refresh the session first
            console.log('📝 [AUTH_CONTEXT] Unexpected sign out, attempting to refresh session...');
            const { data, error } = await supabase.auth.refreshSession();
            if (error || !data.session) {
              console.log('📝 [AUTH_CONTEXT] Session refresh failed, clearing user data');
              setUser(null);
              setSession(null);
            } else {
              console.log('📝 [AUTH_CONTEXT] Session restored successfully');
              setSession(data.session);
              // Re-fetch user profile
              try {
                const authUser = await authService.getCurrentUser();
                setUser(authUser);
              } catch (error) {
                console.error('📝 [AUTH_CONTEXT] Error fetching user profile after refresh:', error);
                setUser(data.session.user as AuthUser);
              }
            }
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
        }
        
        if (session?.user && event !== 'SIGNED_OUT') {
          // Validate session before proceeding
          const isValidSession = await validateSession(session);
          if (!isValidSession && !isSigningOut) {
            setUser(null);
            setSession(null);
            setLoading(false);
            return;
          }

          if (!isSigningOut) {
            console.log('📝 [AUTH_CONTEXT] Valid session found, fetching profile...');
            setSession(session);
            
            // Defer the profile fetch to avoid blocking the auth state change
            setTimeout(async () => {
              try {
                const authUser = await authService.getCurrentUser();
                console.log('📝 [AUTH_CONTEXT] Profile loaded:', authUser?.profile?.company_id);
                setUser(authUser);
                setSessionError(null);
              } catch (error) {
                console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
                setUser(session.user as AuthUser);
                if (!isSigningOut) {
                  setSessionError('خطأ في تحميل بيانات المستخدم');
                }
              }
            }, 0);
          }
        } else if (event !== 'TOKEN_REFRESHED' && !isSigningOut) {
          console.log('📝 [AUTH_CONTEXT] No user session');
          setUser(null);
          setSession(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('📝 [AUTH_CONTEXT] Error getting session:', error);
          setSessionError('خطأ في التحقق من جلسة تسجيل الدخول');
          setLoading(false);
          return;
        }

        if (session?.user) {
          const isValidSession = await validateSession(session);
          if (isValidSession) {
            setSession(session);
            try {
              const authUser = await authService.getCurrentUser();
              setUser(authUser);
            } catch (error) {
              console.error('📝 [AUTH_CONTEXT] Error fetching user profile on init:', error);
              setUser(session.user as AuthUser);
              setSessionError('خطأ في تحميل بيانات المستخدم');
            }
          }
        }
      } catch (error) {
        console.error('📝 [AUTH_CONTEXT] Session initialization error:', error);
        setSessionError('خطأ في تهيئة جلسة تسجيل الدخول');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [isSigningOut, validateSession]);

  const signUp = async (email: string, password: string, userData?: any) => {
    return authService.signUp(email, password, userData);
  };

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    
    if (!result.error) {
      // Log successful login
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
      // Log successful logout
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
    validateSession: () => validateSession(session)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};