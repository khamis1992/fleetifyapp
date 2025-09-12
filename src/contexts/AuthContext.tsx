import * as React from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, AuthContextType, authService } from '@/lib/auth';

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthProviderState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  sessionError: string | null;
  isSigningOut: boolean;
}

export class AuthProvider extends React.Component<AuthProviderProps, AuthProviderState> {
  private authListener: any;

  constructor(props: AuthProviderProps) {
    super(props);
    
    this.state = {
      user: null,
      session: null,
      loading: true,
      sessionError: null,
      isSigningOut: false
    };
  }

  componentDidMount() {
    this.initializeAuth();
  }

  componentWillUnmount() {
    if (this.authListener) {
      this.authListener.subscription.unsubscribe();
    }
  }

  initializeAuth = async () => {
    try {
      // Set up auth state listener
      this.authListener = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('📝 [AUTH_CONTEXT] Auth state change:', event, !!session);
          
          if (event !== 'SIGNED_OUT' || !this.state.isSigningOut) {
            this.setState({ sessionError: null });
          }
          
          if (event === 'SIGNED_OUT') {
            if (this.state.isSigningOut) {
              this.setState({
                user: null,
                session: null,
                isSigningOut: false
              });
            }
          }
          
          if (session?.user && event !== 'SIGNED_OUT') {
            console.log('📝 [AUTH_CONTEXT] Valid session found, fetching profile...');
            this.setState({ session });
            
            try {
              const authUser = await authService.getCurrentUser();
              console.log('📝 [AUTH_CONTEXT] Profile loaded:', authUser?.profile?.company_id);
              this.setState({
                user: authUser,
                sessionError: null
              });
            } catch (error) {
              console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
              this.setState({
                user: session.user as AuthUser,
                sessionError: 'خطأ في تحميل بيانات المستخدم'
              });
            }
          } else if (event !== 'TOKEN_REFRESHED' && !this.state.isSigningOut) {
            console.log('📝 [AUTH_CONTEXT] No user session');
            this.setState({
              user: null,
              session: null
            });
          }
          
          this.setState({ loading: false });
        }
      );

      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('📝 [AUTH_CONTEXT] Error getting session:', error);
        this.setState({
          sessionError: 'خطأ في التحقق من جلسة تسجيل الدخول',
          loading: false
        });
        return;
      }

      if (session?.user) {
        this.setState({ session });
        try {
          const authUser = await authService.getCurrentUser();
          this.setState({ user: authUser });
        } catch (error) {
          console.error('📝 [AUTH_CONTEXT] Error fetching user profile on init:', error);
          this.setState({
            user: session.user as AuthUser,
            sessionError: 'خطأ في تحميل بيانات المستخدم'
          });
        }
      }
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session initialization error:', error);
      this.setState({
        sessionError: 'خطأ في تهيئة جلسة تسجيل الدخول'
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  signUp = async (email: string, password: string, userData?: any) => {
    return authService.signUp(email, password, userData);
  };

  signIn = async (email: string, password: string) => {
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

  signOut = async () => {
    this.setState({ isSigningOut: true });
    const email = this.state.user?.email;
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

  updateProfile = async (updates: any) => {
    if (!this.state.user) return { error: new Error('No user logged in') };
    return authService.updateProfile(this.state.user.id, updates);
  };

  changePassword = async (newPassword: string) => {
    return authService.changePassword(newPassword);
  };

  validateSession = async () => {
    if (!this.state.session) return false;
    
    try {
      const now = Date.now() / 1000;
      if (this.state.session.expires_at && this.state.session.expires_at < now) {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          console.error('📝 [AUTH_CONTEXT] Session refresh failed:', error);
          if (!this.state.isSigningOut) {
            this.setState({ sessionError: 'انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.' });
          }
          return false;
        }
        
        this.setState({ session: data.session });
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('📝 [AUTH_CONTEXT] Session validation error:', error);
      if (!this.state.isSigningOut) {
        this.setState({ sessionError: 'خطأ في التحقق من صحة الجلسة' });
      }
      return false;
    }
  };

  refreshUser = async () => {
    if (this.state.session?.user) {
      try {
        const authUser = await authService.getCurrentUser();
        this.setState({ user: authUser });
      } catch (error) {
        console.error('📝 [AUTH_CONTEXT] Error refreshing user:', error);
      }
    }
  };

  render() {
    const value: AuthContextType = {
      user: this.state.user,
      session: this.state.session,
      loading: this.state.loading,
      signUp: this.signUp,
      signIn: this.signIn,
      signOut: this.signOut,
      updateProfile: this.updateProfile,
      changePassword: this.changePassword,
      sessionError: this.state.sessionError,
      validateSession: this.validateSession,
      refreshUser: this.refreshUser
    };

    return (
      <AuthContext.Provider value={value}>
        {this.props.children}
      </AuthContext.Provider>
    );
  }
}