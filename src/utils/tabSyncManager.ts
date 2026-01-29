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

  constructor() {
    this.tabId = this.generateTabId();
    this.initChannel();
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    let tabId = sessionStorage.getItem('fleetify_tab_id');
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('fleetify_tab_id', tabId);
    }
    return tabId;
  }

  /**
   * Initialize BroadcastChannel
   */
  private initChannel(): void {
    try {
      // Check if BroadcastChannel is supported
      if (typeof BroadcastChannel === 'undefined') {
        console.warn('🔄 [TAB_SYNC] BroadcastChannel not supported in this browser');
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
   */
  broadcast(message: TabSyncMessage): void {
    if (!this.channel) {
      console.warn('🔄 [TAB_SYNC] Channel not initialized, cannot broadcast');
      return;
    }

    try {
      this.channel.postMessage(message);
      console.log(`🔄 [TAB_SYNC] Broadcasted message:`, message);
    } catch (error) {
      console.error('🔄 [TAB_SYNC] Error broadcasting message:', error);
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
   */
  cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
