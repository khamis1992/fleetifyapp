/**
 * Centralized State Management
 * Replaces multiple contexts with a unified store using Zustand
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

// Entity normalization types
export interface NormalizedState<T> {
  entities: Record<string, T>;
  ids: string[];
  loading: Record<string, boolean>;
  error: Record<string, Error | null>;
}

// Main store interface
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

  // Normalized entities
  customers: NormalizedState<any>;
  vehicles: NormalizedState<any>;
  contracts: NormalizedState<any>;
  invoices: NormalizedState<any>;

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

  // Entity actions
  setEntity: <T>(entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string, data: T) => void;
  removeEntity: (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string) => void;
  setEntityLoading: (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string, loading: boolean) => void;
  setEntityError: (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string, error: Error | null) => void;

  // Batch actions
  setEntities: <T>(entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, entities: T[]) => void;

  // Reset actions
  resetAuth: () => void;
  resetEntities: () => void;
}

// Helper to create normalized state
const createNormalizedState = <T>(): NormalizedState<T> => ({
  entities: {},
  ids: [],
  loading: {},
  error: {},
});

// Create the store
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

          customers: createNormalizedState(),
          vehicles: createNormalizedState(),
          contracts: createNormalizedState(),
          invoices: createNormalizedState(),

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

          // Entity actions
          setEntity: <T>(entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string, data: T) => {
            set((state) => {
              const entityState = state[entityType] as NormalizedState<T>;
              return {
                [entityType]: {
                  ...entityState,
                  entities: {
                    ...entityState.entities,
                    [id]: data,
                  },
                  ids: entityState.ids.includes(id) ? entityState.ids : [...entityState.ids, id],
                  error: {
                    ...entityState.error,
                    [id]: null,
                  },
                },
              };
            });
          },

          removeEntity: (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string) => {
            set((state) => {
              const entityState = state[entityType] as NormalizedState<any>;
              const { [id]: removed, ...entities } = entityState.entities;
              return {
                [entityType]: {
                  ...entityState,
                  entities,
                  ids: entityState.ids.filter(i => i !== id),
                },
              };
            });
          },

          setEntityLoading: (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string, loading: boolean) => {
            set((state) => {
              const entityState = state[entityType] as NormalizedState<any>;
              return {
                [entityType]: {
                  ...entityState,
                  loading: {
                    ...entityState.loading,
                    [id]: loading,
                  },
                },
              };
            });
          },

          setEntityError: (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, id: string, error: Error | null) => {
            set((state) => {
              const entityState = state[entityType] as NormalizedState<any>;
              return {
                [entityType]: {
                  ...entityState,
                  error: {
                    ...entityState.error,
                    [id]: error,
                  },
                },
              };
            });
          },

          // Batch actions
          setEntities: <T>(entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>, entities: T[]) => {
            const normalizedEntities = entities.reduce((acc, entity) => {
              if (entity && entity.id) {
                acc[entity.id] = entity;
              }
              return acc;
            }, {} as Record<string, T>);

            const ids = entities.filter(e => e && e.id).map(e => e.id);

            set((state) => ({
              [entityType]: {
                entities: normalizedEntities,
                ids,
                loading: {},
                error: {},
              },
            }));
          },

          // Reset actions
          resetAuth: () => {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          },

          resetEntities: () => {
            set({
              customers: createNormalizedState(),
              vehicles: createNormalizedState(),
              contracts: createNormalizedState(),
              invoices: createNormalizedState(),
            });
          },
        }),
        {
          name: 'fleetify-app-store',
          version: 1,
          partialize: (state) => ({
            user: state.user,
            company: state.company,
            theme: state.theme,
            sidebarOpen: state.sidebarOpen,
            // Don't persist notifications or entity states
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

// Entity selectors with caching
export const createEntitySelector = <T>(entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>) => {
  return () => {
    const store = useAppStore();
    const entityState = store[entityType] as NormalizedState<T>;

    return {
      entities: entityState.entities,
      ids: entityState.ids,
      loading: entityState.loading,
      error: entityState.error,
      getEntity: (id: string) => entityState.entities[id],
      getEntities: (ids?: string[]) => {
        const idsToUse = ids || entityState.ids;
        return idsToUse.map(id => entityState.entities[id]).filter(Boolean);
      },
      isLoading: (id: string) => entityState.loading[id] || false,
      getError: (id: string) => entityState.error[id],
      setEntity: store.setEntity,
      removeEntity: store.removeEntity,
      setEntities: store.setEntities,
    };
  };
};

// Export entity hooks
export const useCustomers = createEntitySelector('customers');
export const useVehicles = createEntitySelector('vehicles');
export const useContracts = createEntitySelector('contracts');
export const useInvoices = createEntitySelector('invoices');

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

// State synchronization utilities
export const useEntitySync = (entityType: keyof Omit<AppStore, 'theme' | 'sidebarOpen' | 'notifications' | 'user' | 'company' | 'isAuthenticated' | 'isLoading' | 'setAuth' | 'setLoading' | 'setCompany' | 'setTheme' | 'toggleSidebar' | 'addNotification' | 'markNotificationRead' | 'clearNotifications'>) => {
  const store = useAppStore();

  return {
    syncWithApi: async (apiCall: () => Promise<any[]>) => {
      try {
        store.setEntityLoading(entityType, 'list', true);
        const data = await apiCall();
        store.setEntities(entityType, data);
      } catch (error) {
        console.error(`Failed to sync ${entityType}:`, error);
        store.setEntityError(entityType, 'list', error as Error);
      } finally {
        store.setEntityLoading(entityType, 'list', false);
      }
    },
    syncSingle: async (id: string, apiCall: () => Promise<any>) => {
      try {
        store.setEntityLoading(entityType, id, true);
        const data = await apiCall();
        store.setEntity(entityType, id, data);
      } catch (error) {
        console.error(`Failed to sync ${entityType} ${id}:`, error);
        store.setEntityError(entityType, id, error as Error);
      } finally {
        store.setEntityLoading(entityType, id, false);
      }
    },
  };
};