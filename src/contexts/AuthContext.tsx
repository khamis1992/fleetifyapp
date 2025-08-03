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

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('📝 [AUTH_CONTEXT] Auth state change:', event, !!session?.user);
        setSession(session);
        
        if (session?.user) {
          console.log('📝 [AUTH_CONTEXT] User session found, fetching profile...');
          try {
            const authUser = await authService.getCurrentUser();
            if (isMounted) {
              console.log('📝 [AUTH_CONTEXT] Profile loaded successfully:', authUser?.profile?.company_id);
              setUser(authUser);
              setLoading(false);
            }
          } catch (error) {
            console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
            if (isMounted) {
              setUser(session.user as AuthUser);
              setLoading(false);
            }
          }
        } else {
          console.log('📝 [AUTH_CONTEXT] No user session');
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      console.log('📝 [AUTH_CONTEXT] Initial session check:', !!session?.user);
      setSession(session);
      
      if (session?.user) {
        authService.getCurrentUser().then(authUser => {
          if (isMounted) {
            console.log('📝 [AUTH_CONTEXT] Initial profile loaded:', authUser?.profile?.company_id);
            setUser(authUser);
            setLoading(false);
          }
        }).catch((error) => {
          console.error('📝 [AUTH_CONTEXT] Initial profile load error:', error);
          if (isMounted) {
            setUser(session.user as AuthUser);
            setLoading(false);
          }
        });
      } else {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};