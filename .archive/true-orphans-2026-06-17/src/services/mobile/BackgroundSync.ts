import { logger } from '@/lib/logger';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'custom';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependsOn?: string[]; // IDs of other sync items that must complete first
  metadata?: Record<string, any>;
}

interface SyncConfig {
  enableBackgroundSync: boolean;
  enableOfflineMode: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
  timeout: number; // milliseconds
  storageKey: string;
  enableCompression: boolean;
  enableEncryption: boolean;
  syncOnResume: boolean;
  syncOnConnectivityChange: boolean;
}

interface SyncResult {
  id: string;
  success: boolean;
  timestamp: number;
  error?: string;
  duration: number;
  response?: any;
}

interface SyncStats {
  totalItems: number;
  pendingItems: number;
  successfulItems: number;
  failedItems: number;
  lastSyncTime: number;
  averageSyncTime: number;
  successRate: number;
}

interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  expiry?: number;
  version?: string;
  compressed: boolean;
  encrypted: boolean;
}

export class BackgroundSync {
  private config: SyncConfig;
  private syncQueue: SyncQueueItem[] = [];
  private cache: Map<string, CacheItem> = new Map();
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      enableBackgroundSync: true,
      enableOfflineMode: true,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      timeout: 30000, // 30 seconds
      storageKey: 'background_sync_queue',
      enableCompression: true,
      enableEncryption: false,
      syncOnResume: true,
      syncOnConnectivityChange: true,
      ...config
    };

    this.setupEventListeners();
    this.loadFromStorage();
    this.startBackgroundSync();
  }

  private setupEventListeners(): void {
    // Network connectivity changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online');
      if (this.config.syncOnConnectivityChange) {
        this.triggerSync();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline');
    });

    // DISABLED: Page visibility and focus listeners cause tab freezing
    // These events trigger sync too frequently and cause performance issues
    // The periodic sync (syncInterval) is sufficient for background sync
    
    // // Page visibility changes
    // document.addEventListener('visibilitychange', () => {
    //   if (!document.hidden && this.config.syncOnResume) {
    //     this.triggerSync();
    //   }
    // });

    // // App focus/blur
    // window.addEventListener('focus', () => {
    //   if (this.config.syncOnResume) {
    //     this.triggerSync();
    //   }
    // });
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.syncQueue = data.queue || [];
        this.emit('queueLoaded', { itemCount: this.syncQueue.length });
      }
    } catch (error) {
      logger.error('Failed to load sync queue from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        queue: this.syncQueue,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save sync queue to storage:', error);
    }
  }

  private startBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.config.enableBackgroundSync) {
        this.processQueue();
      }
    }, this.config.syncInterval);
  }

  // Queue management
  addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): string {
    const queueItem: SyncQueueItem = {
      ...item,
      id: this.generateItemId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(queueItem);
    this.saveToStorage();
    this.emit('itemAdded', queueItem);

    // Trigger immediate sync for critical items
    if (item.priority === 'critical' && this.isOnline) {
      setTimeout(() => this.processQueue(), 100);
    }

    return queueItem.id;
  }

  private generateItemId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  removeFromQueue(id: string): boolean {
    const index = this.syncQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      const removed = this.syncQueue.splice(index, 1)[0];
      this.saveToStorage();
      this.emit('itemRemoved', removed);
      return true;
    }
    return false;
  }

  updateQueueItem(id: string, updates: Partial<SyncQueueItem>): boolean {
    const item = this.syncQueue.find(item => item.id === id);
    if (item) {
      Object.assign(item, updates);
      this.saveToStorage();
      this.emit('itemUpdated', item);
      return true;
    }
    return false;
  }

  // Sync processing
  async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    this.emit('syncStart');

    try {
      const batch = this.getNextBatch();
      const results = await this.processBatch(batch);

      // Handle results
      for (const result of results) {
        if (result.success) {
          this.removeFromQueue(result.id);
          this.emit('itemSynced', result);
        } else {
          await this.handleSyncFailure(result);
        }
      }

      this.emit('syncComplete', { processed: batch.length, results });
    } catch (error) {
      logger.error('Error during sync processing:', error);
      this.emit('syncError', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private getNextBatch(): SyncQueueItem[] {
    // Sort by priority and timestamp
    const sortedQueue = [...this.syncQueue].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Filter items that can be processed (dependencies satisfied)
    const readyItems = sortedQueue.filter(item => {
      if (!item.dependsOn || item.dependsOn.length === 0) return true;
      return item.dependsOn.every(depId => !this.syncQueue.find(q => q.id === depId));
    });

    return readyItems.slice(0, this.config.batchSize);
  }

  private async processBatch(batch: SyncQueueItem[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const item of batch) {
      const startTime = Date.now();
      let result: SyncResult;

      try {
        const response = await this.executeSyncItem(item);
        const duration = Date.now() - startTime;

        result = {
          id: item.id,
          success: true,
          timestamp: Date.now(),
          duration,
          response
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        result = {
          id: item.id,
          success: false,
          timestamp: Date.now(),
          duration,
          error: error instanceof Error ? error.message : String(error)
        };
      }

      results.push(result);
    }

    return results;
  }

  private async executeSyncItem(item: SyncQueueItem): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers
        },
        body: item.payload ? JSON.stringify(item.payload) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async handleSyncFailure(result: SyncResult): Promise<void> {
    const item = this.syncQueue.find(q => q.id === result.id);
    if (!item) return;

    item.retryCount++;

    if (item.retryCount >= item.maxRetries) {
      // Max retries reached, remove from queue
      this.removeFromQueue(item.id);
      this.emit('itemFailed', { ...result, item });
    } else {
      // Update retry timestamp and wait for next attempt
      item.timestamp = Date.now() + (this.config.retryDelay * Math.pow(2, item.retryCount - 1));
      this.emit('itemRetry', { ...result, item });
    }
  }

  // Cache management
  async cacheData(key: string, data: any, options?: {
    expiry?: number; // milliseconds
    version?: string;
    compress?: boolean;
    encrypt?: boolean;
  }): Promise<void> {
    const cacheItem: CacheItem = {
      key,
      data: await this.processDataForStorage(data, options),
      timestamp: Date.now(),
      expiry: options?.expiry ? Date.now() + options.expiry : undefined,
      version: options?.version,
      compressed: options?.compress ?? this.config.enableCompression,
      encrypted: options?.encrypt ?? this.config.enableEncryption
    };

    this.cache.set(key, cacheItem);
    this.persistCacheToStorage();
  }

  async getCachedData(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      this.persistCacheToStorage();
      return null;
    }

    return this.processDataFromStorage(item.data, item);
  }

  private async processDataForStorage(data: any, options?: { compress?: boolean; encrypt?: boolean }): Promise<any> {
    let processed = JSON.stringify(data);

    // Compression (simplified - in production, use proper compression library)
    if (options?.compress ?? this.config.enableCompression) {
      // Placeholder for compression logic
      // processed = await compress(processed);
    }

    // Encryption (simplified - in production, use proper encryption)
    if (options?.encrypt ?? this.config.enableEncryption) {
      // Placeholder for encryption logic
      // processed = await encrypt(processed);
    }

    return processed;
  }

  private async processDataFromStorage(data: any, item: CacheItem): Promise<any> {
    let processed = data;

    // Decryption
    if (item.encrypted) {
      // Placeholder for decryption logic
      // processed = await decrypt(processed);
    }

    // Decompression
    if (item.compressed) {
      // Placeholder for decompression logic
      // processed = await decompress(processed);
    }

    return JSON.parse(processed);
  }

  private async persistCacheToStorage(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem(`${this.config.storageKey}_cache`, JSON.stringify(cacheObject));
    } catch (error) {
      logger.error('Failed to persist cache to storage:', error);
    }
  }

  private async loadCacheFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(`${this.config.storageKey}_cache`);
      if (stored) {
        const cacheObject = JSON.parse(stored);
        this.cache = new Map(Object.entries(cacheObject));
      }
    } catch (error) {
      logger.error('Failed to load cache from storage:', error);
    }
  }

  // Utility methods
  triggerSync(): void {
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }

  clearQueue(): void {
    this.syncQueue = [];
    this.saveToStorage();
    this.emit('queueCleared');
  }

  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(`${this.config.storageKey}_cache`);
    this.emit('cacheCleared');
  }

  getQueueStats(): SyncStats {
    const successfulItems = this.syncQueue.filter(item => item.retryCount > 0).length;
    const pendingItems = this.syncQueue.filter(item => item.retryCount === 0).length;

    return {
      totalItems: this.syncQueue.length,
      pendingItems,
      successfulItems,
      failedItems: this.syncQueue.filter(item => item.retryCount >= item.maxRetries).length,
      lastSyncTime: Date.now(), // Would track actual last sync time
      averageSyncTime: 0, // Would calculate from history
      successRate: this.syncQueue.length > 0 ? (successfulItems / this.syncQueue.length) * 100 : 100
    };
  }

  getQueueItems(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  isItemInQueue(id: string): boolean {
    return this.syncQueue.some(item => item.id === id);
  }

  getItemStatus(id: string): 'pending' | 'processing' | 'success' | 'failed' | 'not_found' {
    const item = this.syncQueue.find(item => item.id === id);
    if (!item) return 'not_found';
    if (item.retryCount >= item.maxRetries) return 'failed';
    if (item.retryCount > 0) return 'processing';
    return 'pending';
  }

  // Event handling
  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error(`Error in sync event listener for ${event}:`, error);
      }
    });
  }

  // Configuration
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    this.startBackgroundSync();
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  isReady(): boolean {
    return this.isOnline;
  }

  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.saveToStorage();
    this.persistCacheToStorage();
    this.eventListeners.clear();
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSync();

// React hook for easy integration
export const useBackgroundSync = () => {
  const [syncStats, setSyncStats] = React.useState<SyncStats>(backgroundSync.getQueueStats());
  const [isOnline, setIsOnline] = React.useState(backgroundSync['isOnline']);

  React.useEffect(() => {
    const unsubscribeOnline = backgroundSync.on('online', () => setIsOnline(true));
    const unsubscribeOffline = backgroundSync.on('offline', () => setIsOnline(false));
    const unsubscribeSyncComplete = () => setSyncStats(backgroundSync.getQueueStats());

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeSyncComplete();
    };
  }, []);

  const addToQueue = React.useCallback((item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    return backgroundSync.addToQueue(item);
  }, []);

  const triggerSync = React.useCallback(() => {
    backgroundSync.triggerSync();
  }, []);

  const cacheData = React.useCallback((key: string, data: any, options?: any) => {
    return backgroundSync.cacheData(key, data, options);
  }, []);

  const getCachedData = React.useCallback((key: string) => {
    return backgroundSync.getCachedData(key);
  }, []);

  return {
    syncStats,
    isOnline,
    addToQueue,
    triggerSync,
    cacheData,
    getCachedData,
    getQueueItems: () => backgroundSync.getQueueItems(),
    clearQueue: () => backgroundSync.clearQueue(),
    clearCache: () => backgroundSync.clearCache(),
    isItemInQueue: (id: string) => backgroundSync.isItemInQueue(id),
    getItemStatus: (id: string) => backgroundSync.getItemStatus(id)
  };
};