import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Enhanced session validation with retry logic
  const validateSession = async (currentSession: Session | null, retryCount = 0): Promise<boolean> => {
    if (!currentSession) {
      console.log('📝 [AUTH_CONTEXT] No session to validate');
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
          
          // Retry once if this is the first attempt
          if (retryCount === 0) {
            console.log('📝 [AUTH_CONTEXT] Retrying session refresh...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return validateSession(currentSession, 1);
          }
          
          setSessionError('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
          return false;
        }
        
        console.log('📝 [AUTH_CONTEXT] Session refreshed successfully');
        setSession(data.session);
        return true;
      }
      
      // Validate that session still works with a simple query
      const { error: testError } = await supabase.auth.getUser();
      if (testError) {
        console.error('📝 [AUTH_CONTEXT] Session validation failed:', testError);
        if (retryCount === 0) {
          console.log('📝 [AUTH_CONTEXT] Retrying session validation...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return validateSession(currentSession, 1);
        }
        setSessionError('خطأ في التحقق من صحة الجلسة');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session validation error:', error);
      if (retryCount === 0) {
        console.log('📝 [AUTH_CONTEXT] Retrying after error...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return validateSession(currentSession, 1);
      }
      setSessionError('خطأ في التحقق من صحة الجلسة');
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📝 [AUTH_CONTEXT] Auth state change:', event, !!session);
        
        // Clear previous errors
        setSessionError(null);
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setSession(session);
          }
        }
        
        if (session?.user) {
          // Validate session before proceeding
          const isValidSession = await validateSession(session);
          if (!isValidSession) {
            setUser(null);
            setSession(null);
            setLoading(false);
            return;
          }

          console.log('📝 [AUTH_CONTEXT] Valid session found, fetching profile...');
          setSession(session);
          
          // Defer the profile fetch to avoid blocking the auth state change
          setTimeout(async () => {
            // Simplified retry logic with faster fallback
            try {
              console.log('📝 [AUTH_CONTEXT] Fetching user data for session:', session?.user?.id);
              
              // Single attempt with timeout
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('User data fetch timeout')), 5000)
              );
              
              const userData = await Promise.race([
                authService.getCurrentUser(),
                timeoutPromise
              ]) as AuthUser | null;

              if (userData) {
                console.log('📝 [AUTH_CONTEXT] Successfully fetched user data');
                setUser(userData);
                setSessionError(null);
              } else {
                throw new Error('No user data returned');
              }
            } catch (error) {
              console.error('📝 [AUTH_CONTEXT] Failed to fetch user data, using fallback:', error);
              
              // Create fallback user immediately
              const fallbackUser: AuthUser = {
                ...session.user,
                profile: {
                  id: session.user.id,
                  first_name: session.user.user_metadata?.first_name || 'مستخدم',
                  last_name: session.user.user_metadata?.last_name || '',
                  company_id: session.user.user_metadata?.company_id || null
                },
                roles: ['user'], // Default role
                company_id: session.user.user_metadata?.company_id || null
              };
              setUser(fallbackUser);
              setSessionError(null); // Clear error since we have a working fallback
              console.log('📝 [AUTH_CONTEXT] Using fallback user data');
            }
          }, 0);
        } else {
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
              if (authUser) {
                setUser(authUser);
                console.log('📝 [AUTH_CONTEXT] Initial user loaded successfully');
              } else {
                throw new Error('No user data returned on initialization');
              }
            } catch (error) {
              console.error('📝 [AUTH_CONTEXT] Error fetching user profile on init:', error);
              // Create fallback user for initialization
              const fallbackUser: AuthUser = {
                ...session.user,
                profile: {
                  id: session.user.id,
                  first_name: session.user.user_metadata?.first_name || 'مستخدم',
                  last_name: session.user.user_metadata?.last_name || '',
                  company_id: session.user.user_metadata?.company_id || null
                },
                roles: ['user'],
                company_id: session.user.user_metadata?.company_id || null
              };
              setUser(fallbackUser);
              setSessionError('تم تحميل بيانات أساسية للمستخدم');
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

    return () => subscription.unsubscribe();
  }, []);

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