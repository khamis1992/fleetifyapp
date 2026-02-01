// SECURITY FIX: Removed @ts-nocheck and added proper TypeScript types
import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
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
  tabId?: string;
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

// CRITICAL FIX: Generate unique tab ID with exception handling
const generateTabId = (): string => {
  const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    sessionStorage.setItem('tab_id', tabId);
  } catch (error) {
    console.warn('📝 [AUTH_CONTEXT] Cannot write to sessionStorage (private mode or quota exceeded):', error);
    // Continue with in-memory tabId only
  }
  return tabId;
};

// CRITICAL FIX: Get or create tab ID with exception handling
const getTabId = (): string => {
  try {
    let tabId = sessionStorage.getItem('tab_id');
    if (!tabId) {
      tabId = generateTabId();
    }
    return tabId;
  } catch (error) {
    console.warn('📝 [AUTH_CONTEXT] Cannot read from sessionStorage:', error);
    // Fallback: generate new ID without storage
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper to save user to cache
const cacheUser = (user: AuthUser) => {
  try {
    const cacheData: AuthCache = {
      user,
      timestamp: Date.now(),
      version: CACHE_VERSION,
      tabId: getTabId()
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));
    
    // Notify other tabs about cache update
    localStorage.setItem(AUTH_CACHE_KEY + '_updated', Date.now().toString());
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
  const [loading, setLoadingState] = useState(true);
  const loadingRef = useRef(true);
  
  const setLoading = (isLoading: boolean) => {
    loadingRef.current = isLoading;
    setLoadingState(isLoading);
  };
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const authListenerRef = useRef<{ subscription: { unsubscribe: () => void } } | null>(null);
  const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profilePromiseRef = useRef<Promise<any> | null>(null);
  const isInitialized = useRef(false);
  const mountedRef = useRef(true);

  // CRITICAL FIX: Lock mechanism with proper exception handling
  const acquireInitLock = (): boolean => {
    try {
      const lockKey = 'auth_init_lock';
      const lockTimeout = 5000; // 5 seconds
      
      try {
        const existingLock = localStorage.getItem(lockKey);
        if (existingLock) {
          const lockTime = parseInt(existingLock);
          if (Date.now() - lockTime < lockTimeout) {
            // Active lock from another tab
            return false;
          }
        }
      } catch (readError) {
        console.warn('📝 [AUTH_CONTEXT] Cannot read lock (storage disabled):', readError);
        // If we can't read, assume no lock exists
      }
      
      // Acquire the lock
      try {
        localStorage.setItem(lockKey, Date.now().toString());
      } catch (writeError) {
        console.warn('📝 [AUTH_CONTEXT] Cannot write lock (storage disabled):', writeError);
        // Continue without lock in extreme cases (iOS private mode)
      }
      
      return true;
    } catch (error) {
      console.warn('📝 [AUTH_CONTEXT] Failed to acquire lock:', error);
      return true; // Allow initialization on error
    }
  };

  const releaseInitLock = () => {
    try {
      localStorage.removeItem('auth_init_lock');
    } catch (error) {
      console.warn('📝 [AUTH_CONTEXT] Failed to release lock (storage disabled):', error);
      // Ignore - lock will expire naturally
    }
  };

  const initializeAuth = async () => {
    // CRITICAL: Check if we're in a native mobile app FIRST
    const isNativeApp = Capacitor.isNativePlatform();
    const isDevMode = import.meta.env.DEV;
    const isLocalhost = window.location.hostname === 'localhost';
    const isMobilePath = window.location.pathname.startsWith('/mobile');
    
    // MOBILE APP: Skip auto-login completely for native apps and mobile paths
    if (isNativeApp || isMobilePath) {
      console.log('📱 [AUTH_CONTEXT] Mobile app detected - skipping auto-login');
      // Don't auto-login, just check existing session
    } else if (isDevMode && isLocalhost) {
      // DEVELOPMENT BYPASS: Auto-login only for desktop localhost
      console.log('🔓 [AUTH_CONTEXT] Development mode (desktop) - auto login');
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'khamis-1992@hotmail.com',
          password: '123456789',
        });
        
        if (error) {
          console.error('🔓 [AUTH_CONTEXT] Auto login failed:', error);
          const mockUser: AuthUser = {
            id: 'dev-user-id',
            email: 'khamis-1992@hotmail.com',
            user_metadata: {},
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          };
          setUser(mockUser);
        } else if (data.user) {
          console.log('✅ [AUTH_CONTEXT] Auto login successful');
          const authUser = authService.mapSupabaseUser(data.user);
          setUser(authUser);
          setSession(data.session);
          cacheUser(authUser);
        }
        
        setLoading(false);
        isInitialized.current = true;
        return;
      } catch (err) {
        console.error('🔓 [AUTH_CONTEXT] Auto login error:', err);
      }
    }

    // Prevent double initialization in development (HMR)
    if (isInitialized.current) {
      console.log('📝 [AUTH_CONTEXT] Already initialized, skipping...');
      return;
    }

    // Try to acquire initialization lock
    if (!acquireInitLock()) {
      console.log('📝 [AUTH_CONTEXT] Another tab is initializing, waiting...');
      
      // Wait a bit then use cached data
      await new Promise(resolve => setTimeout(resolve, 1000));
      const cachedUser = getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
        console.log('📝 [AUTH_CONTEXT] Using cached user from another tab initialization');
      }
      return;
    }

    const initStartTime = Date.now();
    console.log('📝 [AUTH_CONTEXT] Starting initialization...');
    isInitialized.current = true;

    try {
      // 🚀 OPTIMIZATION: Check if we even have a token in localStorage before calling getSession
      // This avoids the 5-8s timeout if the user is definitely not logged in
      // Use the correct Supabase storage key pattern
      const hasToken = typeof window !== 'undefined' && (() => {
        // Check for any Supabase auth token (pattern: sb-*-auth-token)
        const keys = Object.keys(localStorage);
        return keys.some(key => key.startsWith('sb-') && key.includes('-auth-token')) || 
               localStorage.getItem('fleetify_auth_cache');
      })();
      
      if (!hasToken && !window.location.hash.includes('access_token')) {
        console.log('📝 [AUTH_CONTEXT] No token found in storage - skipping getSession');
        setLoading(false);
        return;
      }

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
        // CRITICAL FIX: Store background promise in ref for cleanup
        const profilePromise = authService.getCurrentUser();
        profilePromiseRef.current = profilePromise;
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

              // CRITICAL FIX: Set basic user IMMEDIATELY to unblock UI
              if (mountedRef.current) {
                console.log('🔍 [AUTH_CONTEXT] Setting basic user IMMEDIATELY:', session.user.email);
                setUser(session.user as AuthUser);
                setSessionError(null);
              }

              // Then try to fetch full profile in background (with timeout)
              try {
                console.log('🔍 [AUTH_CONTEXT] Fetching full user profile in background...');
                const profilePromise = authService.getCurrentUser();
                const timeoutPromise = new Promise<null>((resolve) => 
                  setTimeout(() => {
                    console.warn('⚠️ [AUTH_CONTEXT] Profile fetch timeout - using basic user');
                    resolve(null);
                  }, 5000)
                );
                
                const authUser = await Promise.race([profilePromise, timeoutPromise]);
                if (mountedRef.current && authUser) {
                  console.log('🔍 [AUTH_CONTEXT] Updating with full profile:', authUser.email);
                  setUser(authUser);
                  cacheUser(authUser); // 🚀 Save to cache
                }
              } catch (error) {
                console.error('📝 [AUTH_CONTEXT] Error fetching user profile:', error);
                // Don't worry - basic user already set above
                console.log('🔍 [AUTH_CONTEXT] Continuing with basic user (profile fetch failed)');
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
      // Release the initialization lock
      releaseInitLock();
      
      if (mountedRef.current) {
        setLoading(false);
        // Clear the force timeout since we are done
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        console.log(`📝 [AUTH_CONTEXT] Auth initialization complete in ${Date.now() - initStartTime}ms`);
      }
    }
  };

  // Storage event listener for cross-tab sync
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!mountedRef.current) return;

      // Listen for auth token changes from other tabs
      // Check for any Supabase auth token key (pattern: sb-*-auth-token)
      if (e.key && e.key.startsWith('sb-') && e.key.includes('-auth-token') && e.newValue !== e.oldValue) {
        console.log('🔄 [AUTH_CONTEXT] Auth state changed in another tab');
        
        if (e.newValue) {
          // User signed in from another tab
          console.log('🔄 [AUTH_CONTEXT] User signed in from another tab - reinitializing');
          isInitialized.current = false;
          initializeAuth();
        } else {
          // User signed out from another tab
          console.log('🔄 [AUTH_CONTEXT] User signed out from another tab');
          setUser(null);
          setSession(null);
          clearCachedUser();
        }
      }
      
      // Listen for cache changes from other tabs
      if (e.key === AUTH_CACHE_KEY && e.newValue !== e.oldValue) {
        console.log('🔄 [AUTH_CONTEXT] User cache changed in another tab');
        
        if (e.newValue) {
          const cachedUser = getCachedUser();
          if (cachedUser) {
            setUser(cachedUser);
          }
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Safety timeout to prevent infinite loading - FIXED: Ensure loading state is always cleared
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
      // CRITICAL FIX: Set timeout BEFORE calling initializeAuth
      // This ensures it's stored in initTimeoutRef before the finally block runs
      const forceLoadingTimeout = setTimeout(() => {
        if (mountedRef.current && loadingRef.current) {
          console.warn('⚠️ [AUTH_CONTEXT] Force clearing loading state after 5s to prevent navigation hang');
          setLoading(false);
        }
      }, 5000);

      initTimeoutRef.current = forceLoadingTimeout;
      
      // Now call initializeAuth which will clear the timeout in its finally block
      initializeAuth();
    } else {
      console.log('📝 [AUTH_CONTEXT] Auth already initialized, skipping init');
      // CRITICAL FIX: Always clear loading if we're in a potentially stuck state
      const currentLoadingState = loadingRef.current;
      const checkStuckTimeout = setTimeout(() => {
        if (mountedRef.current && loadingRef.current) {
          console.warn('⚠️ [AUTH_CONTEXT] Stuck loading state detected - forcing to false');
          setLoading(false);
        }
      }, 1000);
      initTimeoutRef.current = checkStuckTimeout;
    }

    return () => {
      mountedRef.current = false;

      // In development, allow re-initialization on HMR
      // In production, keep initialization flag to prevent unnecessary re-initialization
      if (import.meta.env.DEV) {
        // Reset initialization flag on unmount in development to allow HMR to work properly
        isInitialized.current = false;
      }

      // CRITICAL FIX: Cancel background promise on cleanup to prevent memory leaks and stale state updates
      if (profilePromiseRef.current) {
        // The promise is stored in a ref, we can't directly cancel it
        // But we can set mountedRef to false to prevent state updates
        console.log('📝 [AUTH_CONTEXT] Cleanup: Background profile promise will be ignored due to unmount');
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

  // Add a function to force refresh user data
  const forceRefreshUserData = async () => {
    if (session?.user) {
      try {
        const authUser = await authService.getCurrentUser();
        if (authUser) {
          setUser(authUser);
          cacheUser(authUser);
          setSessionError(null);
        }
      } catch (error) {
        console.error('📝 [AUTH_CONTEXT] Error refreshing user data:', error);
      }
    }
  };


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
    loading: loading, // Use state value for render
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    sessionError,
    validateSession,
    refreshUser,
    forceRefreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};