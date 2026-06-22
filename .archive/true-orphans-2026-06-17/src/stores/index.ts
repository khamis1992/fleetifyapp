/**
 * Minimal App Store - UI State Only
 * 
 * This store manages ONLY client-side UI state.
 * All server state (customers, vehicles, contracts, invoices) is managed by React Query.
 * 
 * See: plans/zustand-usage-restriction-and-migration-plan.md
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';

// Types for our state
export interface User {
  id: string;
  email: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    company_id: string;
    avatar_url?: string;
  };
}

export interface Company {
  id: string;
  name: string;
  name_ar: string;
  logo_url?: string;
  settings: {
    currency: string;
    language: string;
    timezone: string;
    date_format: string;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  autoClose?: boolean;
}

// Main store interface - UI state only (server state removed - now managed by React Query)
export interface AppStore {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Company state
  company: Company | null;

  // UI state
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  notifications: Notification[];

  // Actions
  setAuth: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setCompany: (company: Company | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Reset actions
  resetAuth: () => void;
}

// Create store
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          user: null,
          isAuthenticated: false,
          isLoading: true,

          company: null,

          theme: 'system',
          sidebarOpen: true,
          notifications: [],

          // Auth actions
          setAuth: (user) => {
            set({
              user,
              isAuthenticated: !!user,
              isLoading: false,
            });
          },

          setLoading: (loading) => {
            set({ isLoading: loading });
          },

          setCompany: (company) => {
            set({ company });
          },

          setTheme: (theme) => {
            set({ theme });
            // Apply theme to document
            const root = window.document.documentElement;
            if (theme === 'dark') {
              root.classList.add('dark');
            } else if (theme === 'light') {
              root.classList.remove('dark');
            } else {
              // system theme
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              root.classList.toggle('dark', prefersDark);
            }
          },

          toggleSidebar: () => {
            set((state) => ({ sidebarOpen: !state.sidebarOpen }));
          },

          // Notification actions
          addNotification: (notification) => {
            const id = Date.now().toString();
            const newNotification: Notification = {
              ...notification,
              id,
              timestamp: new Date(),
              read: false,
              autoClose: notification.type === 'success',
            };

            set((state) => ({
              notifications: [newNotification, ...state.notifications],
            }));

            // Auto close after 5 seconds
            if (newNotification.autoClose) {
              setTimeout(() => {
                get().markNotificationRead(id);
                setTimeout(() => {
                  set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== id),
                  }));
                }, 1000);
              }, 5000);
            }
          },

          markNotificationRead: (id) => {
            set((state) => ({
              notifications: state.notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
              ),
            }));
          },

          clearNotifications: () => {
            set({ notifications: [] });
          },

          // Reset actions
          resetAuth: () => {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          },
        }),
        {
          name: 'fleetify-app-store',
          version: 2,
          partialize: (state) => ({
            user: state.user,
            company: state.company,
            theme: state.theme,
            sidebarOpen: state.sidebarOpen,
            // Don't persist notifications
          }),
        }
      )
    ),
    {
      name: 'app-store',
    }
  )
);

// Selectors for efficient state access
export const useAuth = () => {
  const store = useAppStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    setAuth: store.setAuth,
    setLoading: store.setLoading,
    resetAuth: store.resetAuth,
  };
};

export const useCompany = () => {
  const store = useAppStore();
  return {
    company: store.company,
    setCompany: store.setCompany,
  };
};

export const useUI = () => {
  const store = useAppStore();
  return {
    theme: store.theme,
    sidebarOpen: store.sidebarOpen,
    setTheme: store.setTheme,
    toggleSidebar: store.toggleSidebar,
  };
};

export const useNotifications = () => {
  const store = useAppStore();
  return {
    notifications: store.notifications,
    addNotification: store.addNotification,
    markNotificationRead: store.markNotificationRead,
    clearNotifications: store.clearNotifications,
  };
};

// Debug utilities
export const useStoreDebug = () => {
  const store = useAppStore();

  return {
    getState: store,
    subscribe: store.subscribe,
    // Log all state changes in development
    logState: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Current Store State:', store.getState());
      }
    },
  };
};
