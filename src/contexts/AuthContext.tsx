// SECURITY FIX: Removed @ts-nocheck and added proper TypeScript types
import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
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

// ============================================================================
// LOCAL STORAGE CACHE KEYS
// ============================================================================
const AUTH_CACHE_KEY = 'fleetify_auth_cache';
const CACHE_VERSION = '1.0';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache

interface AuthCache {
  user: AuthUser;
  timestamp: number;
  version: string;
}

// Helper to get cached user data
const getCachedUser = (): AuthUser | null => {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    
    const data: AuthCache = JSON.parse(cached);
    
    // Check version
    if (data.version !== CACHE_VERSION) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    
    // Check TTL
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.warn('📝 [AUTH_CACHE] Failed to load cache:', error);
    return null;
  }
};

// Helper to save user to cache
const cacheUser = (user: AuthUser) => {
  try {
    const cacheData: AuthCache = {
      user,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('📝 [AUTH_CACHE] Failed to save cache:', error);
  }
};

// Helper to clear cache
const clearCachedUser = () => {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch (error) {
    console.warn('📝 [AUTH_CACHE] Failed to clear cache:', error);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getCachedUser);
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
      console.log('📝 [AUTH_CONTEXT] Already initialized, skipping...');
      return;
    }

    const initStartTime = Date.now();
    console.log('📝 [AUTH_CONTEXT] Starting initialization...');
    isInitialized.current = true;

    try {
      // Add timeout to getSession call to prevent hanging (increased to 8s for slow networks)
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 8000) // Increased from 5s to 8s
      );
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]).catch(() => {
        console.warn('📝 [AUTH_CONTEXT] Session check timeout (5s), continuing without session');
        return { data: { session: null }, error: null };
      });
      
      if (error) {
        console.error('📝 [AUTH_CONTEXT] Error getting session:', error);
        if (mountedRef.current) {
          setSessionError('خطأ في التحقق من جلسة تسجيل الدخول');
          setLoading(false);
        }
        return;
      }
      
      const sessionCheckTime = Date.now() - initStartTime;
      console.log(`📝 [AUTH_CONTEXT] Session check complete in ${sessionCheckTime}ms:`, session ? 'Session found' : 'No session');

      // If we have a session, load user profile immediately
      if (session?.user) {
        if (mountedRef.current) {
          setSession(session);
          
          // 🚀 OPTIMIZATION: Try to use cached user first
          const cachedUser = getCachedUser();
          if (cachedUser && cachedUser.id === session.user.id) {
            setUser(cachedUser);
            setLoading(false);
            console.log(`📝 [AUTH_CONTEXT] UI unblocked at ${Date.now() - initStartTime}ms with cached user (instant!)`);
          } else {
            // Set basic user immediately to unblock UI
            setUser(session.user as AuthUser);
            setLoading(false);
            console.log(`📝 [AUTH_CONTEXT] UI unblocked at ${Date.now() - initStartTime}ms with basic user`);
          }
        }
        
        // Load full profile in background with timeout (increased to 10s for slower networks)
        const profilePromise = authService.getCurrentUser();
        const profileTimeout = new Promise<null>((resolve) => {
          const timeoutId = setTimeout(() => {
            console.warn('⚠️ [AUTH_CONTEXT] Profile fetch timeout (10s) - using basic user');
            console.warn('⚠️ [AUTH_CONTEXT] This may indicate slow network. Profile will load automatically when ready.');
            resolve(null);
          }, 10000); // Increased from 5s to 10s
          
          // Clear timeout if profile loads successfully
          profilePromise.then(() => {
            clearTimeout(timeoutId);
          }).catch(() => {
            clearTimeout(timeoutId);
          });
        });
        
        try {
          const authUser = await Promise.race([profilePromise, profileTimeout]);
          if (mountedRef.current && authUser) {
            setUser(authUser);
            cacheUser(authUser); // 🚀 Save to cache
            setSessionError(null);
            console.log(`📝 [AUTH_CONTEXT] Full profile loaded at ${Date.now() - initStartTime}ms`);
          } else if (mountedRef.current && !authUser) {
            // Profile timeout occurred, but continue trying in background
            profilePromise.then((user) => {
              if (mountedRef.current && user) {
                console.log(`📝 [AUTH_CONTEXT] Profile loaded after timeout at ${Date.now() - initStartTime}ms`);
                setUser(user);
                cacheUser(user); // 🚀 Save to cache
              }
            }).catch(() => {
              // Silent fail - basic user already loaded
            });
          }
        } catch (error) {
          console.error('📝 [AUTH_CONTEXT] Error fetching user profile (background):', error);
          // Don't show error - we already have basic user loaded
        }
      } else {
        // No session - user is not logged in
        if (mountedRef.current) {
          setLoading(false);
          console.log(`📝 [AUTH_CONTEXT] No session - completed in ${Date.now() - initStartTime}ms`);
        }
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
              clearCachedUser(); // 🚀 Clear cache
              setIsSigningOut(false);
              return;
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('🔍 [AUTH_CONTEXT] SIGNED_IN event received - session:', session.user.email);
              setSession(session);
              
              try {
                console.log('🔍 [AUTH_CONTEXT] Fetching current user profile...');
                const authUser = await authService.getCurrentUser();
                if (mountedRef.current && authUser) {
                  console.log('🔍 [AUTH_CONTEXT] Setting user state with full profile:', authUser.email);
                  setUser(authUser);
                  cacheUser(authUser); // 🚀 Save to cache
                  setSessionError(null);
                }
              } catch (error) {
                console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
                if (mountedRef.current) {
                  console.log('🔍 [AUTH_CONTEXT] Setting user state with basic user:', session.user.email);
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
        console.log(`📝 [AUTH_CONTEXT] Auth initialization complete in ${Date.now() - initStartTime}ms`);
      }
    }
  };

  // Safety timeout to prevent infinite loading (reduced to 2 seconds since we load basic user immediately)
  React.useEffect(() => {
    mountedRef.current = true;
    
    console.log('📝 [AUTH_CONTEXT] Component mounted, initializing auth...');
    
    // In development mode (HMR), reset initialization flag to allow re-initialization
    // This prevents issues where HMR reloads the component but isInitialized stays true
    if (import.meta.env.DEV && isInitialized.current) {
      console.log('📝 [AUTH_CONTEXT] HMR detected - resetting initialization flag');
      isInitialized.current = false;
    }
    
    // Only initialize if not already done (prevents HMR issues)
    if (!isInitialized.current) {
      initializeAuth();
      
      // Safety timeout - if still loading after 10 seconds, force loading to false
      // This should rarely trigger since we unblock UI immediately with basic user
      // Increased from 6s to 10s to accommodate slower networks
      initTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && loading) {
          console.warn('⚠️ [AUTH_CONTEXT] Auth initialization timeout (10s) - forcing loading to false');
          console.warn('⚠️ [AUTH_CONTEXT] This timeout should rarely occur. If you see this often, check network connectivity.');
          setLoading(false);
        }
      }, 10000); // Increased from 6s to 10s
    } else {
      console.log('📝 [AUTH_CONTEXT] Auth already initialized, skipping init');
      // If already initialized but still loading, force it to false
      if (loading) {
        console.warn('⚠️ [AUTH_CONTEXT] Already initialized but still loading - forcing to false');
        setLoading(false);
      }
    }

    return () => {
      mountedRef.current = false;
      
      // In development, allow re-initialization on HMR
      // In production, keep initialization flag to prevent unnecessary re-initialization
      if (import.meta.env.DEV) {
        // Reset initialization flag on unmount in development to allow HMR to work properly
        isInitialized.current = false;
      }

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
    console.log('🔍 [AUTH_CONTEXT] signIn called with email:', email);
    const result = await authService.signIn(email, password);
    console.log('🔍 [AUTH_CONTEXT] authService.signIn completed with error:', result.error);

    if (!result.error) {
      console.log('🔍 [AUTH_CONTEXT] Login successful - setting up logging timeout');
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
    clearCachedUser(); // 🚀 Clear cache
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
        if (authUser) {
          setUser(authUser);
          cacheUser(authUser); // 🚀 Save to cache
        }
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