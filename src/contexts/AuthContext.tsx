// SECURITY FIX: Removed @ts-nocheck and added proper TypeScript types
import React, { createContext, useContext, useState, useMemo, ReactNode, useRef } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, AuthContextType, authService } from '@/lib/auth';
import { capacitorStorage } from '@/lib/capacitorStorage';

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
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours - cache is for instant initial state; actual auth is validated via Supabase session

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
  const lastKnownUserRef = useRef<AuthUser | null>(null);
  const lastRecoveryAttemptRef = useRef<number>(0);
  const isSigningOutRef = useRef(false);

  // CRITICAL FIX: When user object exists but is missing company/profile data
  // (happens when session.user is set as a "basic" user during token refresh or
  // navigation), merge the full profile from the localStorage cache to ensure
  // companyId is always available. This prevents queries from seeing null companyId
  // and showing 0 values across pages.
  React.useEffect(() => {
    if (
      user?.id &&
      !user?.company?.id &&
      !(user as any)?.profile?.company_id &&
      !isSigningOutRef.current
    ) {
      const cached = getCachedUser();
      if (cached?.id === user.id && (cached.company?.id || cached.profile?.company_id)) {
        if (import.meta.env.DEV) {
          console.log('📝 [AUTH_CONTEXT] Restoring full user from cache (basic user detected without company)');
        }
        setUser(cached);
      }
    }
  }, [user?.id, user?.company?.id, (user as any)?.profile?.company_id]);

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
    // DEVELOPMENT BYPASS: تسجيل دخول تلقائي في البيئة المحلية فقط
    // تأكد من أن هذا الكود لا يعمل في الإنتاج أو في تطبيق الجوال
    const isDevMode = import.meta.env.DEV;
    const isLocalhost = window.location.hostname === 'localhost';
    const isNativeApp = Capacitor.isNativePlatform();
    
    // تسجيل دخول تلقائي فقط في المتصفح المحلي، وليس في التطبيق المحمول
    // DISABLED: Auto-login causes timeout issues when network is slow/unavailable
    if (false && isDevMode && isLocalhost && !isNativeApp) {
      console.log('🔓 [AUTH_CONTEXT] Development mode - auto login disabled to prevent timeouts');
      
      try {
        // Add timeout to prevent hanging
        const loginPromise = supabase.auth.signInWithPassword({
          email: 'khamis-1992@hotmail.com',
          password: '123456789',
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auto-login timeout')), 5000)
        );
        
        const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('🔓 [AUTH_CONTEXT] Auto login failed:', error);
          setLoading(false);
          isInitialized.current = true;
          return;
        } else if (data?.user && data?.session) {
          console.log('✅ [AUTH_CONTEXT] Auto login successful');
          // Fetch full user profile using getCurrentUser
          const authUser = await authService.getCurrentUser();
          if (authUser) {
            setUser(authUser);
            setSession(data.session);
            cacheUser(authUser);
          }
        }
        
        setLoading(false);
        isInitialized.current = true;
        return;
      } catch (err) {
        console.error('🔓 [AUTH_CONTEXT] Auto login error (skipping):', err);
        // Continue with normal initialization
      }
    }

    // Prevent double initialization in development (HMR)
    if (isInitialized.current) {
      if (import.meta.env.DEV) {
        console.log('📝 [AUTH_CONTEXT] Already initialized, skipping...');
      }
      return;
    }

    // Try to acquire initialization lock
    if (!acquireInitLock()) {
      if (import.meta.env.DEV) {
        console.log('📝 [AUTH_CONTEXT] Another tab is initializing, waiting...');
      }
      
      // Wait a bit then use cached data
      await new Promise(resolve => setTimeout(resolve, 1000));
      const cachedUser = getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
        if (import.meta.env.DEV) {
          console.log('📝 [AUTH_CONTEXT] Using cached user from another tab initialization');
        }
      }
      return;
    }

    const initStartTime = Date.now();
    if (import.meta.env.DEV) {
      console.log('📝 [AUTH_CONTEXT] Starting initialization...');
    }
    isInitialized.current = true;

    try {
      // CRITICAL: On native platforms, wait for Capacitor Storage to sync
      // This ensures auth tokens are loaded from Preferences to localStorage
      if (Capacitor.isNativePlatform()) {
        console.log('📱 [AUTH_CONTEXT] Native platform detected - waiting for storage sync...');
        await capacitorStorage.waitForSync();
        console.log('✅ [AUTH_CONTEXT] Storage sync complete');
      }
      
      // 🚀 OPTIMIZATION: Check if we even have a token in localStorage before calling getSession
      // This avoids the 5-8s timeout if the user is definitely not logged in
      // Use the correct Supabase storage key pattern
      const hasToken = typeof window !== 'undefined' && (() => {
        // Check for any Supabase auth token (pattern: sb-*-auth-token)
        const keys = Object.keys(localStorage);
        const foundToken = keys.some(key => key.startsWith('sb-') && key.includes('-auth-token')) || 
               localStorage.getItem('fleetify_auth_cache');
        
        if (Capacitor.isNativePlatform()) {
          console.log('📱 [AUTH_CONTEXT] Token check on native:', {
            foundToken,
            localStorageKeys: keys.filter(k => k.startsWith('sb-')),
            hasCache: !!localStorage.getItem('fleetify_auth_cache')
          });
        }
        
        return foundToken;
      })();
      
      if (!hasToken && !window.location.hash.includes('access_token')) {
        if (import.meta.env.DEV) {
          console.log('📝 [AUTH_CONTEXT] No token found in storage - skipping getSession');
        }
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
              // User-initiated signout - clear immediately
              if (isSigningOutRef.current) {
                setUser(null);
                setSession(null);
                clearCachedUser();
                lastKnownUserRef.current = null;
                isSigningOutRef.current = false;
                setIsSigningOut(false);
                return;
              }
              
              // Unexpected signout (e.g. token refresh failure on tab restore) - try to recover
              console.log('⚠️ [AUTH_CONTEXT] Unexpected SIGNED_OUT - attempting recovery...');
              try {
                // Try refreshSession first (more likely to work than getSession after Supabase cleared it)
                const { data: refreshData } = await supabase.auth.refreshSession();
                if (refreshData?.session?.user && mountedRef.current) {
                  console.log('✅ [AUTH_CONTEXT] Session recovered via refreshSession after unexpected SIGNED_OUT');
                  setSession(refreshData.session);
                  const authUser = await authService.getCurrentUser();
                  if (mountedRef.current && authUser) {
                    setUser(authUser);
                    cacheUser(authUser);
                  } else if (mountedRef.current && lastKnownUserRef.current) {
                    setUser(lastKnownUserRef.current);
                  }
                  return;
                }
                // Fallback: try getSession in case session is still in storage
                const { data: { session: recoveredSession } } = await supabase.auth.getSession();
                if (recoveredSession?.user && mountedRef.current) {
                  console.log('✅ [AUTH_CONTEXT] Session recovered via getSession after unexpected SIGNED_OUT');
                  setSession(recoveredSession);
                  const authUser = await authService.getCurrentUser();
                  if (mountedRef.current && authUser) {
                    setUser(authUser);
                    cacheUser(authUser);
                  } else if (mountedRef.current && lastKnownUserRef.current) {
                    setUser(lastKnownUserRef.current);
                  }
                  return;
                }
              } catch (error) {
                console.warn('⚠️ [AUTH_CONTEXT] Session recovery failed:', error);
              }
              
              // Recovery failed - clear state and stop future recovery attempts
              lastKnownUserRef.current = null;
              setUser(null);
              setSession(null);
              clearCachedUser();
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
                // If user is missing company data, refresh profile in background
                const currentUser = lastKnownUserRef.current;
                if (currentUser && !currentUser.company?.id) {
                  authService.getCurrentUser().then(authUser => {
                    if (mountedRef.current && authUser) {
                      setUser(authUser);
                      cacheUser(authUser);
                    }
                  }).catch(() => {});
                }
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

  // Track last known user for session recovery after unexpected signout
  React.useEffect(() => {
    if (user) {
      lastKnownUserRef.current = user;
    }
  }, [user]);

  // CRITICAL FIX: Recover session when tab becomes visible after minimize/restore
  React.useEffect(() => {
    const attemptRecovery = async () => {
      if (!mountedRef.current) return;
      if (!lastKnownUserRef.current) return;
      
      const now = Date.now();
      if (now - lastRecoveryAttemptRef.current < 5000) return;
      lastRecoveryAttemptRef.current = now;
      
      console.log('🔄 [AUTH_CONTEXT] Attempting session recovery...');
      
      try {
        // Try refreshSession first, then fallback to getSession
        const { data: refreshData } = await supabase.auth.refreshSession();
        const recoveredSession = refreshData?.session;
        
        if (!recoveredSession) {
          const { data: { session: storedSession } } = await supabase.auth.getSession();
          if (storedSession?.user && mountedRef.current) {
            setSession(storedSession);
            const authUser = await authService.getCurrentUser();
            if (mountedRef.current && authUser) {
              setUser(authUser);
              cacheUser(authUser);
              setSessionError(null);
              console.log('✅ [AUTH_CONTEXT] Session recovered via getSession');
            }
            return;
          }
          console.log('⚠️ [AUTH_CONTEXT] No session found during recovery');
          return;
        }
        
        if (recoveredSession.user && mountedRef.current) {
          console.log('✅ [AUTH_CONTEXT] Session recovered via refreshSession');
          setSession(recoveredSession);
          
          const authUser = await authService.getCurrentUser();
          if (mountedRef.current && authUser) {
            setUser(authUser);
            cacheUser(authUser);
            setSessionError(null);
          } else if (mountedRef.current && lastKnownUserRef.current) {
            setUser(lastKnownUserRef.current);
            setSessionError(null);
          }
        }
      } catch (error) {
        console.warn('⚠️ [AUTH_CONTEXT] Session recovery failed:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (user) return;
      attemptRecovery();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also attempt recovery immediately if user just became null while tab is visible
    if (!user && lastKnownUserRef.current && document.visibilityState === 'visible') {
      attemptRecovery();
    }
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

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

    if (import.meta.env.DEV) {
      console.log('📝 [AUTH_CONTEXT] Component mounted, initializing auth...');
    }

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
      if (import.meta.env.DEV) {
        console.log('📝 [AUTH_CONTEXT] Auth already initialized, skipping init');
      }
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
      if (profilePromiseRef.current && import.meta.env.DEV) {
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
      console.log('🔍 [AUTH_CONTEXT] Login successful - fetching user session immediately');
      
      // CRITICAL FIX: Immediately fetch and set user session after successful login
      // This ensures the UI updates instantly instead of waiting for onAuthStateChange
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!sessionError && session?.user) {
          console.log('✅ [AUTH_CONTEXT] Session fetched successfully, setting user:', session.user.email);
          setSession(session);
          setUser(session.user as AuthUser);
          setSessionError(null);
          
          // Fetch full profile in background
          authService.getCurrentUser().then(authUser => {
            if (mountedRef.current && authUser) {
              setUser(authUser);
              cacheUser(authUser);
              console.log('✅ [AUTH_CONTEXT] Full profile loaded:', authUser.email);
            }
          }).catch(error => {
            console.warn('⚠️ [AUTH_CONTEXT] Failed to load full profile, using basic user:', error);
          });
        }
      } catch (error) {
        console.error('❌ [AUTH_CONTEXT] Error fetching session after login:', error);
      }
      
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
    isSigningOutRef.current = true;
    setIsSigningOut(true);
    const email = user?.email;
    clearCachedUser();
    let result: { error: Error | null };
    try {
      result = await authService.signOut();
    } catch (error) {
      isSigningOutRef.current = false;
      setIsSigningOut(false);
      return { error: error instanceof Error ? error : new Error('Sign out failed') };
    }

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

  // OPTIMIZATION: Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
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
  }), [
    user,
    session,
    loading,
    sessionError,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    validateSession,
    refreshUser,
    forceRefreshUserData
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};