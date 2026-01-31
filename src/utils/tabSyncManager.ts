/**
 * Tab Sync Manager
 * 
 * Manages communication and synchronization between multiple browser tabs
 * using BroadcastChannel API
 */

type TabSyncMessage = 
  | { type: 'TAB_OPENED'; tabId: string; timestamp: number }
  | { type: 'TAB_CLOSED'; tabId: string; timestamp: number }
  | { type: 'QUERY_INVALIDATE'; queryKey: string; timestamp: number }
  | { type: 'AUTH_CHANGED'; action: 'login' | 'logout'; timestamp: number }
  | { type: 'CACHE_CLEAR'; timestamp: number }
  | { type: 'PING'; tabId: string; timestamp: number }
  | { type: 'PONG'; tabId: string; timestamp: number };

class TabSyncManager {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private listeners: Map<string, Set<(message: TabSyncMessage) => void>> = new Map();
  private isInitialized = false;
  private activeTabs: Set<string> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  // CRITICAL FIX: localStorage fallback for unsupported browsers
  private useFallback: boolean = false;
  private fallbackInterval: ReturnType<typeof setInterval> | null = null;
  private lastFallbackCheck: number = 0;
  private readonly FALLBACK_KEY = 'fleetify_tab_sync_fallback';

  constructor() {
    this.tabId = this.generateTabId();
    this.initChannel();
  }

  /**
   * Generate unique tab ID with exception handling
   * CRITICAL FIX: Handle storage exceptions (iOS private mode, quota exceeded)
   */
  private generateTabId(): string {
    try {
      let tabId = sessionStorage.getItem('fleetify_tab_id');
      if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          sessionStorage.setItem('fleetify_tab_id', tabId);
        } catch (storageError) {
          console.warn('🔄 [TAB_SYNC] Cannot write to sessionStorage (private mode or quota exceeded):', storageError);
          // Continue with in-memory tabId only
        }
      }
      return tabId;
    } catch (error) {
      console.error('🔄 [TAB_SYNC] Error generating tab ID:', error);
      // Fallback: use timestamp-based ID without storage
      return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Initialize BroadcastChannel with fallback
   * CRITICAL FIX: Add localStorage fallback for unsupported browsers
   */
  private initChannel(): void {
    try {
      // Check if BroadcastChannel is supported
      if (typeof BroadcastChannel === 'undefined') {
        console.warn('🔄 [TAB_SYNC] BroadcastChannel not supported - using localStorage fallback');
        this.setupLocalStorageFallback();
        return;
      }

      this.channel = new BroadcastChannel('fleetify-app-sync');
      
      // Listen for messages from other tabs
      this.channel.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      // Notify other tabs that this tab is opened
      this.broadcast({
        type: 'TAB_OPENED',
        tabId: this.tabId,
        timestamp: Date.now()
      });

      // Start ping mechanism to track active tabs
      this.startPingMechanism();

      // Listen for tab close
      window.addEventListener('beforeunload', () => {
        this.broadcast({
          type: 'TAB_CLOSED',
          tabId: this.tabId,
          timestamp: Date.now()
        });
        this.cleanup();
      });

      this.isInitialized = true;
      console.log(`🔄 [TAB_SYNC] Initialized for tab: ${this.tabId}`);
    } catch (error) {
      console.error('🔄 [TAB_SYNC] Error initializing BroadcastChannel:', error);
      // CRITICAL FIX: Fallback to localStorage on error
      this.setupLocalStorageFallback();
    }
  }
  
  /**
   * CRITICAL FIX: localStorage fallback for browsers without BroadcastChannel
   * Used in: iOS Safari private mode, older browsers, Capacitor apps
   */
  private setupLocalStorageFallback(): void {
    console.log('🔄 [TAB_SYNC] Setting up localStorage fallback');
    this.useFallback = true;
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === this.FALLBACK_KEY && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as TabSyncMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('🔄 [TAB_SYNC] Error parsing fallback message:', error);
        }
      }
    });
    
    // Poll for messages (as backup for storage events)
    this.fallbackInterval = setInterval(() => {
      this.checkFallbackMessages();
    }, 1000); // Check every second
    
    // Notify other tabs
    this.broadcastViaFallback({
      type: 'TAB_OPENED',
      tabId: this.tabId,
      timestamp: Date.now()
    });
    
    // Start ping mechanism
    this.startPingMechanism();
    
    // Listen for tab close
    window.addEventListener('beforeunload', () => {
      this.broadcastViaFallback({
        type: 'TAB_CLOSED',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    });
    
    this.isInitialized = true;
    console.log(`🔄 [TAB_SYNC] Fallback initialized for tab: ${this.tabId}`);
  }
  
  /**
   * Broadcast message via localStorage fallback
   */
  private broadcastViaFallback(message: TabSyncMessage): void {
    try {
      const messageStr = JSON.stringify(message);
      localStorage.setItem(this.FALLBACK_KEY, messageStr);
      
      // Clear after a short delay to allow other tabs to read
      setTimeout(() => {
        try {
          const current = localStorage.getItem(this.FALLBACK_KEY);
          if (current === messageStr) {
            localStorage.removeItem(this.FALLBACK_KEY);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }, 100);
    } catch (error) {
      console.error('🔄 [TAB_SYNC] Error broadcasting via fallback:', error);
      // If localStorage also fails, we're in extreme conditions
      // Continue without sync (isolated tab mode)
    }
  }
  
  /**
   * Check for fallback messages
   */
  private checkFallbackMessages(): void {
    try {
      const messageStr = localStorage.getItem(this.FALLBACK_KEY);
      if (messageStr) {
        const message = JSON.parse(messageStr) as TabSyncMessage;
        
        // Only process if message is recent (within last 2 seconds)
        if (Date.now() - message.timestamp < 2000) {
          this.handleMessage(message);
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  /**
   * Start ping mechanism to track active tabs
   */
  private startPingMechanism(): void {
    // Send ping every 5 seconds
    this.pingInterval = setInterval(() => {
      this.broadcast({
        type: 'PING',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }, 5000);

    // Clean up inactive tabs after 10 seconds
    setInterval(() => {
      const now = Date.now();
      this.activeTabs.forEach(tabId => {
        // Remove tabs that haven't pinged in 10 seconds
        // This is a simple implementation - you might want to track timestamps
      });
    }, 10000);
  }

  /**
   * Handle incoming messages from other tabs
   */
  private handleMessage(message: TabSyncMessage): void {
    // Don't process messages from this tab
    if ('tabId' in message && message.tabId === this.tabId) {
      return;
    }

    console.log(`🔄 [TAB_SYNC] Received message:`, message);

    // Track active tabs
    if (message.type === 'TAB_OPENED' || message.type === 'PING') {
      this.activeTabs.add(message.tabId);
    } else if (message.type === 'TAB_CLOSED') {
      this.activeTabs.delete(message.tabId);
    }

    // Respond to ping
    if (message.type === 'PING') {
      this.broadcast({
        type: 'PONG',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }

    // Notify listeners
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => listener(message));
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => listener(message));
    }
  }

  /**
   * Broadcast message to all other tabs
   * CRITICAL FIX: Support both BroadcastChannel and localStorage fallback
   */
  broadcast(message: TabSyncMessage): void {
    if (this.useFallback) {
      this.broadcastViaFallback(message);
      return;
    }
    
    if (!this.channel) {
      console.warn('🔄 [TAB_SYNC] Channel not initialized, cannot broadcast');
      return;
    }

    try {
      this.channel.postMessage(message);
      console.log(`🔄 [TAB_SYNC] Broadcasted message:`, message);
    } catch (error) {
      console.error('🔄 [TAB_SYNC] Error broadcasting message:', error);
      // CRITICAL FIX: Fallback to localStorage if broadcast fails
      this.broadcastViaFallback(message);
    }
  }

  /**
   * Subscribe to specific message types
   */
  on(messageType: TabSyncMessage['type'] | '*', callback: (message: TabSyncMessage) => void): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    
    this.listeners.get(messageType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(messageType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Get current tab ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Get active tabs count
   */
  getActiveTabsCount(): number {
    return this.activeTabs.size + 1; // +1 for current tab
  }

  /**
   * Check if this is the primary tab (first opened)
   */
  isPrimaryTab(): boolean {
    // The tab with the smallest timestamp in ID is the primary
    const allTabIds = Array.from(this.activeTabs).concat(this.tabId);
    const sortedIds = allTabIds.sort();
    return sortedIds[0] === this.tabId;
  }

  /**
   * Cleanup resources
   * CRITICAL FIX: Also cleanup fallback resources
   */
  cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.listeners.clear();
    this.isInitialized = false;
    console.log(`🔄 [TAB_SYNC] Cleaned up for tab: ${this.tabId}`);
  }

  /**
   * Check if manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Create singleton instance
export const tabSyncManager = new TabSyncManager();

// Export helper functions
export const broadcastQueryInvalidation = (queryKey: string) => {
  tabSyncManager.broadcast({
    type: 'QUERY_INVALIDATE',
    queryKey,
    timestamp: Date.now()
  });
};

export const broadcastAuthChange = (action: 'login' | 'logout') => {
  tabSyncManager.broadcast({
    type: 'AUTH_CHANGED',
    action,
    timestamp: Date.now()
  });
};

export const broadcastCacheClear = () => {
  tabSyncManager.broadcast({
    type: 'CACHE_CLEAR',
    timestamp: Date.now()
  });
};
