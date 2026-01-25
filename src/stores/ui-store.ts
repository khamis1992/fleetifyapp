/**
 * UI Store - Minimal Zustand Store
 * 
 * This store manages ONLY client-side UI state.
 * All server state is managed by React Query.
 * 
 * See: plans/zustand-usage-restriction-and-migration-plan.md
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export type Theme = 'light' | 'dark' | 'system';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  autoClose?: boolean;
}

export interface FeatureFlags {
  [key: string]: boolean;
}

// Store interface
export interface UIStore {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // Feature flags
  featureFlags: FeatureFlags;
  setFeatureFlag: (key: string, value: boolean) => void;
  setFeatureFlags: (flags: FeatureFlags) => void;
  
  // Browsing mode (for multi-company access)
  browsingMode: boolean;
  setBrowsingMode: (enabled: boolean) => void;
  browsedCompanyId: string | null;
  setBrowsedCompanyId: (companyId: string | null) => void;
}

// Create store
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        theme: 'system',
        sidebarOpen: true,
        notifications: [],
        globalLoading: false,
        featureFlags: {},
        browsingMode: false,
        browsedCompanyId: null,
        
        // Theme actions
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
        
        // Sidebar actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
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
              useUIStore.getState().markNotificationRead(id);
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
        
        clearNotifications: () => set({ notifications: [] }),
        
        // Global loading actions
        setGlobalLoading: (loading) => set({ globalLoading: loading }),
        
        // Feature flags actions
        setFeatureFlag: (key, value) => set((state) => ({
          featureFlags: { ...state.featureFlags, [key]: value },
        })),
        
        setFeatureFlags: (flags) => set({ featureFlags: flags }),
        
        // Browsing mode actions
        setBrowsingMode: (enabled) => set({ browsingMode: enabled, browsedCompanyId: null }),
        setBrowsedCompanyId: (companyId) => set({ browsedCompanyId: companyId }),
      }),
      {
        name: 'fleetify-ui-store',
        version: 2,
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          featureFlags: state.featureFlags,
          // Don't persist notifications or globalLoading
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// Selectors for efficient state access
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useUnreadNotifications = () => useUIStore((state) => 
  state.notifications.filter(n => !n.read)
);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);
export const useFeatureFlags = () => useUIStore((state) => state.featureFlags);
export const useBrowsingMode = () => useUIStore((state) => ({
  browsingMode: state.browsingMode,
  browsedCompanyId: state.browsedCompanyId,
}));
