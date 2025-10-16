/**
 * Offline Storage Utility
 * 
 * Uses IndexedDB for offline data caching of critical application data
 * Provides fallback to localStorage for browsers with limited IndexedDB support
 */

const DB_NAME = 'fleetify-offline';
const DB_VERSION = 1;
const STORES = {
  DASHBOARD: 'dashboard',
  CUSTOMERS: 'customers',
  CONTRACTS: 'contracts',
  VEHICLES: 'vehicles',
  SETTINGS: 'settings',
  USER_DATA: 'user_data',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

interface CachedData<T = any> {
  data: T;
  timestamp: number;
  expiry?: number; // Time in ms until data expires
}

/**
 * Initialize IndexedDB
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
    };
  });
};

/**
 * Save data to IndexedDB
 */
export const saveToOfflineStorage = async <T>(
  store: StoreName,
  key: string,
  data: T,
  expiryMs?: number
): Promise<boolean> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);

    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiryMs,
    };

    const request = objectStore.put(cachedData, key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ Saved to offline storage: ${store}/${key}`);
        resolve(true);
      };
      request.onerror = () => {
        console.error(`❌ Error saving to offline storage: ${store}/${key}`);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    // Fallback to localStorage
    return saveToLocalStorage(store, key, data, expiryMs);
  }
};

/**
 * Load data from IndexedDB
 */
export const loadFromOfflineStorage = async <T>(
  store: StoreName,
  key: string
): Promise<T | null> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(store, 'readonly');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cachedData = request.result as CachedData<T> | undefined;

        if (!cachedData) {
          resolve(null);
          return;
        }

        // Check if data has expired
        if (cachedData.expiry) {
          const age = Date.now() - cachedData.timestamp;
          if (age > cachedData.expiry) {
            console.log(`⏰ Cached data expired: ${store}/${key}`);
            resolve(null);
            return;
          }
        }

        console.log(`✅ Loaded from offline storage: ${store}/${key}`);
        resolve(cachedData.data);
      };
      request.onerror = () => {
        console.error(`❌ Error loading from offline storage: ${store}/${key}`);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    // Fallback to localStorage
    return loadFromLocalStorage<T>(store, key);
  }
};

/**
 * Delete data from IndexedDB
 */
export const deleteFromOfflineStorage = async (
  store: StoreName,
  key: string
): Promise<boolean> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.delete(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ Deleted from offline storage: ${store}/${key}`);
        resolve(true);
      };
      request.onerror = () => {
        console.error(`❌ Error deleting from offline storage: ${store}/${key}`);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error deleting from IndexedDB:', error);
    return deleteFromLocalStorage(store, key);
  }
};

/**
 * Clear all data from a store
 */
export const clearOfflineStore = async (store: StoreName): Promise<boolean> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ Cleared offline store: ${store}`);
        resolve(true);
      };
      request.onerror = () => {
        console.error(`❌ Error clearing offline store: ${store}`);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error clearing IndexedDB store:', error);
    return clearLocalStorageStore(store);
  }
};

/**
 * Get all keys in a store
 */
export const getOfflineStorageKeys = async (
  store: StoreName
): Promise<string[]> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(store, 'readonly');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.getAllKeys();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting IndexedDB keys:', error);
    return getLocalStorageKeys(store);
  }
};

// ============================================================================
// LocalStorage Fallback Functions
// ============================================================================

const getLocalStorageKey = (store: StoreName, key: string) => {
  return `${DB_NAME}:${store}:${key}`;
};

const saveToLocalStorage = <T>(
  store: StoreName,
  key: string,
  data: T,
  expiryMs?: number
): boolean => {
  try {
    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiryMs,
    };
    localStorage.setItem(getLocalStorageKey(store, key), JSON.stringify(cachedData));
    console.log(`✅ Saved to localStorage: ${store}/${key}`);
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

const loadFromLocalStorage = <T>(
  store: StoreName,
  key: string
): T | null => {
  try {
    const item = localStorage.getItem(getLocalStorageKey(store, key));
    if (!item) return null;

    const cachedData = JSON.parse(item) as CachedData<T>;

    // Check if data has expired
    if (cachedData.expiry) {
      const age = Date.now() - cachedData.timestamp;
      if (age > cachedData.expiry) {
        console.log(`⏰ Cached data expired (localStorage): ${store}/${key}`);
        localStorage.removeItem(getLocalStorageKey(store, key));
        return null;
      }
    }

    console.log(`✅ Loaded from localStorage: ${store}/${key}`);
    return cachedData.data;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

const deleteFromLocalStorage = (store: StoreName, key: string): boolean => {
  try {
    localStorage.removeItem(getLocalStorageKey(store, key));
    console.log(`✅ Deleted from localStorage: ${store}/${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting from localStorage:', error);
    return false;
  }
};

const clearLocalStorageStore = (store: StoreName): boolean => {
  try {
    const prefix = `${DB_NAME}:${store}:`;
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => localStorage.removeItem(key));
    console.log(`✅ Cleared localStorage store: ${store}`);
    return true;
  } catch (error) {
    console.error('Error clearing localStorage store:', error);
    return false;
  }
};

const getLocalStorageKeys = (store: StoreName): string[] => {
  try {
    const prefix = `${DB_NAME}:${store}:`;
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.replace(prefix, ''));
      }
    }
    
    return keys;
  } catch (error) {
    console.error('Error getting localStorage keys:', error);
    return [];
  }
};

// ============================================================================
// Convenience Functions for Common Use Cases
// ============================================================================

/**
 * Cache dashboard data (expires in 5 minutes)
 */
export const cacheDashboardData = <T>(data: T) => {
  return saveToOfflineStorage(STORES.DASHBOARD, 'summary', data, 5 * 60 * 1000);
};

/**
 * Get cached dashboard data
 */
export const getCachedDashboardData = <T>() => {
  return loadFromOfflineStorage<T>(STORES.DASHBOARD, 'summary');
};

/**
 * Cache user settings (no expiry)
 */
export const cacheUserSettings = <T>(data: T) => {
  return saveToOfflineStorage(STORES.SETTINGS, 'user', data);
};

/**
 * Get cached user settings
 */
export const getCachedUserSettings = <T>() => {
  return loadFromOfflineStorage<T>(STORES.SETTINGS, 'user');
};

/**
 * Cache customer list (expires in 10 minutes)
 */
export const cacheCustomers = <T>(data: T) => {
  return saveToOfflineStorage(STORES.CUSTOMERS, 'list', data, 10 * 60 * 1000);
};

/**
 * Get cached customers
 */
export const getCachedCustomers = <T>() => {
  return loadFromOfflineStorage<T>(STORES.CUSTOMERS, 'list');
};

/**
 * Clear all offline data
 */
export const clearAllOfflineData = async (): Promise<void> => {
  const stores = Object.values(STORES);
  await Promise.all(stores.map(store => clearOfflineStore(store)));
};

/**
 * Check if offline storage is available
 */
export const isOfflineStorageAvailable = (): boolean => {
  try {
    return 'indexedDB' in window || 'localStorage' in window;
  } catch {
    return false;
  }
};

// Export store names for external use
export { STORES };
export type { StoreName };
