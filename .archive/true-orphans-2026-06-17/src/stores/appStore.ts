/**
 * App Store
 * 
 * Global application state management with Zustand.
 * Replaces excessive Context API usage.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
  company_id?: string;
  roles?: string[];
}

interface Company {
  id: string;
  name: string;
  name_ar?: string;
  currency: string;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AppState {
  // User State
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Company State
  company: Company | null;
  setCompany: (company: Company | null) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Loading States
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // Error State
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
  clearGlobalError: () => void;
}

/**
 * Create the app store
 */
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // User
        user: null,
        setUser: (user) => set({ user }),

        // Company
        company: null,
        setCompany: (company) => set({ company }),

        // Notifications
        notifications: [],
        addNotification: (notification) => set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: `notif-${Date.now()}`,
              timestamp: new Date().toISOString(),
              read: false
            }
          ]
        })),
        markAsRead: (id) => set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          )
        })),
        clearNotifications: () => set({ notifications: [] }),

        // UI State
        sidebarOpen: true,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        // Loading
        globalLoading: false,
        setGlobalLoading: (loading) => set({ globalLoading: loading }),

        // Error
        globalError: null,
        setGlobalError: (error) => set({ globalError: error }),
        clearGlobalError: () => set({ globalError: null })
      }),
      {
        name: 'fleetify-app-store',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          // Don't persist user/company - they come from auth
        })
      }
    )
  )
);

/**
 * Selectors for better performance
 */
export const useUser = () => useAppStore((state) => state.user);
export const useCompany = () => useAppStore((state) => state.company);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useUnreadNotifications = () => useAppStore((state) => 
  state.notifications.filter(n => !n.read)
);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useGlobalLoading = () => useAppStore((state) => state.globalLoading);
export const useGlobalError = () => useAppStore((state) => state.globalError);

