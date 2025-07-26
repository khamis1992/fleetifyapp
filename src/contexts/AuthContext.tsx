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
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    console.log('📝 [AUTH_CONTEXT] Initializing AuthProvider...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📝 [AUTH_CONTEXT] Auth state changed:', event, !!session?.user);
        setSession(session);
        
        if (session?.user) {
          setProfileLoading(true);
          try {
            console.log('📝 [AUTH_CONTEXT] Fetching user profile for:', session.user.id);
            const authUser = await authService.getCurrentUser();
            console.log('📝 [AUTH_CONTEXT] Profile loaded successfully:', {
              userId: authUser?.id,
              profileId: authUser?.profile?.id,
              companyId: authUser?.profile?.company_id || authUser?.company?.id,
              hasProfile: !!authUser?.profile,
              hasCompany: !!authUser?.company
            });
            setUser(authUser);
          } catch (error) {
            console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
            // Fallback to basic user data
            setUser(session.user as AuthUser);
          } finally {
            setProfileLoading(false);
          }
        } else {
          console.log('📝 [AUTH_CONTEXT] No user session, clearing state');
          setUser(null);
          setProfileLoading(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📝 [AUTH_CONTEXT] Initial session check:', !!session?.user);
      if (session?.user) {
        setSession(session);
        setProfileLoading(true);
        authService.getCurrentUser().then(authUser => {
          console.log('📝 [AUTH_CONTEXT] Initial profile load success:', {
            userId: authUser?.id,
            companyId: authUser?.profile?.company_id || authUser?.company?.id
          });
          setUser(authUser);
          setLoading(false);
          setProfileLoading(false);
        }).catch((error) => {
          console.error('📝 [AUTH_CONTEXT] Initial profile load error:', error);
          setUser(session.user as AuthUser);
          setLoading(false);
          setProfileLoading(false);
        });
      } else {
        setLoading(false);
        setProfileLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    return authService.signUp(email, password, userData);
  };

  const signIn = async (email: string, password: string) => {
    return authService.signIn(email, password);
  };

  const signOut = async () => {
    return authService.signOut();
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