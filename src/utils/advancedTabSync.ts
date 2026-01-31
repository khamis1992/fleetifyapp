/**
 * Advanced Tab Synchronization Manager
 * 
 * Features:
 * - Shared cache across tabs
 * - Leader election
 * - Conflict detection and resolution
 * - Smart data synchronization
 * - Health monitoring
 */

import { QueryClient } from '@tanstack/react-query';

type TabSyncMessage = 
  | { type: 'TAB_OPENED'; tabId: string; timestamp: number }
  | { type: 'TAB_CLOSED'; tabId: string; timestamp: number }
  | { type: 'DATA_UPDATE'; queryKey: any[]; data: any; timestamp: number; version: number; tabId: string }
  | { type: 'INVALIDATE'; queryKey: any[]; timestamp: number; tabId: string }
  | { type: 'SYNC_REQUEST'; tabId: string; timestamp: number }
  | { type: 'SYNC_RESPONSE'; queries: any[]; tabId: string; timestamp: number }
  | { type: 'LEADER_ELECTION'; tabId: string; timestamp: number; priority: number }
  | { type: 'LEADER_HEARTBEAT'; tabId: string; timestamp: number }
  | { type: 'CONFLICT_DETECTED'; queryKey: any[]; versions: number[]; tabId: string }
  | { type: 'PING'; tabId: string; timestamp: number }
  | { type: 'PONG'; tabId: string; timestamp: number };

interface TabInfo {
  tabId: string;
  lastSeen: number;
  isLeader: boolean;
  priority: number;
}

interface QueuedMessage {
  message: TabSyncMessage;
  timestamp: number;
}

class AdvancedTabSyncManager {
  private channel: BroadcastChannel | null = null;
  private tabId: string = '';
  private queryClient: QueryClient | null = null;
  private activeTabs: Map<string, TabInfo> = new Map();
  private isLeader: boolean = false;
  private leaderTabId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  
  // Versioning للبيانات
  private dataVersions: Map<string, number> = new Map();
  
  // Timers
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  // CRITICAL FIX: Message throttling to prevent message storms
  private messageQueue: QueuedMessage[] = [];
  private isThrottled: boolean = false;
  private readonly THROTTLE_DELAY = 100; // Max 10 messages/second per tab
  
  // CRITICAL FIX: Deduplication for invalidations
  private recentInvalidations: Map<string, number> = new Map();
  private readonly INVALIDATION_COOLDOWN = 5000; // 5 seconds between same query invalidations

  initialize(queryClient: QueryClient, tabId: string) {
    this.queryClient = queryClient;
    this.tabId = tabId;
    
    // CRITICAL FIX: Better error handling for BroadcastChannel
    try {
      // التحقق من دعم BroadcastChannel
      if (typeof BroadcastChannel === 'undefined') {
        console.warn('🔄 [ADVANCED_SYNC] BroadcastChannel not supported - tab sync disabled');
        return;
      }
      
      // إنشاء BroadcastChannel
      this.channel = new BroadcastChannel('fleetify-advanced-sync');
    } catch (error) {
      console.error('🔄 [ADVANCED_SYNC] Failed to create BroadcastChannel:', error);
      console.warn('🔄 [ADVANCED_SYNC] Tab sync disabled - each tab will work independently');
      return;
    }
    
    // الاستماع للرسائل
    this.channel.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
    
    // إعلان فتح التبويبة
    this.broadcast({
      type: 'TAB_OPENED',
      tabId: this.tabId,
      timestamp: Date.now()
    });
    
    // طلب مزامنة البيانات من التبويبات الموجودة
    setTimeout(() => {
      this.broadcast({
        type: 'SYNC_REQUEST',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }, 100);
    
    // بدء Leader Election
    this.startLeaderElection();
    
    // بدء Heartbeat
    this.startHeartbeat();
    
    // بدء Cleanup للتبويبات المغلقة
    this.startCleanup();
    
    // الاستماع لإغلاق التبويبة
    window.addEventListener('beforeunload', () => {
      this.broadcast({
        type: 'TAB_CLOSED',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    });
    
    console.log(`🚀 [ADVANCED_SYNC] Initialized for tab: ${this.tabId}`);
  }

  private handleMessage(message: TabSyncMessage) {
    // تجاهل الرسائل من نفس التبويبة
    if ('tabId' in message && message.tabId === this.tabId) {
      return;
    }

    switch (message.type) {
      case 'TAB_OPENED':
        this.handleTabOpened(message);
        break;
        
      case 'TAB_CLOSED':
        this.handleTabClosed(message);
        break;
        
      case 'DATA_UPDATE':
        this.handleDataUpdate(message);
        break;
        
      case 'INVALIDATE':
        this.handleInvalidate(message);
        break;
        
      case 'SYNC_REQUEST':
        this.handleSyncRequest(message);
        break;
        
      case 'SYNC_RESPONSE':
        this.handleSyncResponse(message);
        break;
        
      case 'LEADER_ELECTION':
        this.handleLeaderElection(message);
        break;
        
      case 'LEADER_HEARTBEAT':
        this.handleLeaderHeartbeat(message);
        break;
        
      case 'CONFLICT_DETECTED':
        this.handleConflictDetected(message);
        break;
        
      case 'PING':
        this.handlePing(message);
        break;
        
      case 'PONG':
        this.handlePong(message);
        break;
    }
    
    // إشعار المستمعين
    this.notifyListeners(message.type, message);
  }

  // ============ Tab Management ============
  
  private handleTabOpened(message: TabSyncMessage & { type: 'TAB_OPENED' }) {
    this.activeTabs.set(message.tabId, {
      tabId: message.tabId,
      lastSeen: message.timestamp,
      isLeader: false,
      priority: message.timestamp
    });
    
    console.log(`📂 [ADVANCED_SYNC] Tab opened: ${message.tabId}`);
    console.log(`📊 [ADVANCED_SYNC] Active tabs: ${this.activeTabs.size + 1}`);
    
    // إذا كنت القائد، أرسل البيانات للتبويبة الجديدة
    if (this.isLeader) {
      setTimeout(() => {
        this.sendCacheToTab(message.tabId);
      }, 200);
    }
  }

  private handleTabClosed(message: TabSyncMessage & { type: 'TAB_CLOSED' }) {
    this.activeTabs.delete(message.tabId);
    
    console.log(`📂 [ADVANCED_SYNC] Tab closed: ${message.tabId}`);
    
    // إذا كان القائد، ابدأ انتخاب جديد
    if (message.tabId === this.leaderTabId) {
      this.leaderTabId = null;
      this.startLeaderElection();
    }
  }

  // ============ Data Synchronization ============
  
  private handleDataUpdate(message: TabSyncMessage & { type: 'DATA_UPDATE' }) {
    // DISABLED: Direct data updates cause conflicts and performance issues
    // Instead, we invalidate the query to trigger a fresh fetch
    if (!this.queryClient || !message.queryKey) return;
    
    // CRITICAL FIX: Use deduplication for invalidations
    const queryKeyStr = JSON.stringify(message.queryKey);
    if (!this.shouldInvalidate(queryKeyStr)) {
      console.log(`⏭️ [ADVANCED_SYNC] Skipping duplicate invalidation:`, message.queryKey);
      return;
    }
    
    console.log(`🔄 [ADVANCED_SYNC] Invalidating query from tab ${message.tabId}:`, message.queryKey);
    this.queryClient.invalidateQueries({ queryKey: message.queryKey });
  }

  private handleInvalidate(message: TabSyncMessage & { type: 'INVALIDATE' }) {
    if (!this.queryClient || !message.queryKey) return;
    
    // CRITICAL FIX: Use deduplication for invalidations
    const queryKeyStr = JSON.stringify(message.queryKey);
    if (!this.shouldInvalidate(queryKeyStr)) {
      console.log(`⏭️ [ADVANCED_SYNC] Skipping duplicate invalidation:`, message.queryKey);
      return;
    }
    
    this.queryClient.invalidateQueries({ queryKey: message.queryKey });
    console.log(`🔄 [ADVANCED_SYNC] Query invalidated from tab ${message.tabId}:`, message.queryKey);
  }
  
  /**
   * CRITICAL FIX: Check if query should be invalidated (deduplication)
   */
  private shouldInvalidate(queryKeyStr: string): boolean {
    const lastInvalidation = this.recentInvalidations.get(queryKeyStr);
    const now = Date.now();
    
    // Rate limit: Max 1 invalidation per 5 seconds per query
    if (lastInvalidation && now - lastInvalidation < this.INVALIDATION_COOLDOWN) {
      return false;
    }
    
    // Record this invalidation
    this.recentInvalidations.set(queryKeyStr, now);
    
    // Clean up old entries (older than cooldown period)
    if (this.recentInvalidations.size > 100) {
      this.recentInvalidations.forEach((timestamp, key) => {
        if (now - timestamp > this.INVALIDATION_COOLDOWN) {
          this.recentInvalidations.delete(key);
        }
      });
    }
    
    return true;
  }

  private handleSyncRequest(message: TabSyncMessage & { type: 'SYNC_REQUEST' }) {
    // DISABLED: Sending full cache causes performance issues
    // Let each tab fetch its own data
    console.log(`📤 [ADVANCED_SYNC] Sync request from tab ${message.tabId} (cache sync disabled)`);
    
    // Instead of sending data, just acknowledge the new tab
    // The new tab will fetch data automatically via refetchOnWindowFocus
  }

  private handleSyncResponse(message: TabSyncMessage & { type: 'SYNC_RESPONSE' }) {
    // استقبال البيانات من تبويبة أخرى
    if (this.queryClient && message.queries && Array.isArray(message.queries)) {
      let updatedCount = 0;
      
      message.queries.forEach((query: any) => {
        // تحديث فقط إذا كانت البيانات غير موجودة
        const currentData = this.queryClient!.getQueryData(query.queryKey);
        if (currentData === undefined && query.data !== undefined) {
          this.queryClient!.setQueryData(query.queryKey, query.data);
          this.dataVersions.set(JSON.stringify(query.queryKey), query.version);
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        console.log(`📥 [ADVANCED_SYNC] Received and applied ${updatedCount}/${message.queries.length} queries from tab ${message.tabId}`);
      }
    }
  }

  // ============ Leader Election ============
  
  private startLeaderElection() {
    const priority = Date.now();
    
    this.broadcast({
      type: 'LEADER_ELECTION',
      tabId: this.tabId,
      timestamp: Date.now(),
      priority
    });
    
    // انتظر قليلاً ثم حدد القائد
    setTimeout(() => {
      this.electLeader();
    }, 500);
  }

  private handleLeaderElection(message: TabSyncMessage & { type: 'LEADER_ELECTION' }) {
    this.activeTabs.set(message.tabId, {
      tabId: message.tabId,
      lastSeen: message.timestamp,
      isLeader: false,
      priority: message.priority
    });
  }

  private electLeader() {
    // اختر التبويبة ذات أقل priority (الأقدم)
    const allTabs = [
      { tabId: this.tabId, priority: Date.now() },
      ...Array.from(this.activeTabs.values())
    ];
    
    allTabs.sort((a, b) => a.priority - b.priority);
    const leader = allTabs[0];
    
    this.isLeader = leader.tabId === this.tabId;
    this.leaderTabId = leader.tabId;
    
    console.log(`👑 [ADVANCED_SYNC] Leader elected: ${this.leaderTabId} (${this.isLeader ? 'ME' : 'OTHER'})`);
  }

  private handleLeaderHeartbeat(message: TabSyncMessage & { type: 'LEADER_HEARTBEAT' }) {
    this.leaderTabId = message.tabId;
    
    const tab = this.activeTabs.get(message.tabId);
    if (tab) {
      tab.lastSeen = message.timestamp;
      tab.isLeader = true;
    }
  }

  private startHeartbeat() {
    // CRITICAL FIX: Reduced frequency and only leader sends heartbeat
    this.heartbeatInterval = setInterval(() => {
      // Only leader sends heartbeat
      if (this.isLeader) {
        this.throttledBroadcast({
          type: 'LEADER_HEARTBEAT',
          tabId: this.tabId,
          timestamp: Date.now()
        });
      }
      
      // CRITICAL FIX: Reduced ping frequency from 3s to 10s
      // Only send ping if we haven't sent a message recently
      const lastMessage = this.messageQueue[this.messageQueue.length - 1];
      if (!lastMessage || Date.now() - lastMessage.timestamp > 8000) {
        this.throttledBroadcast({
          type: 'PING',
          tabId: this.tabId,
          timestamp: Date.now()
        });
      }
    }, 10000); // Reduced from 3s to 10s
  }

  // ============ Conflict Resolution ============
  
  private handleConflictDetected(message: TabSyncMessage & { type: 'CONFLICT_DETECTED' }) {
    console.warn(`⚠️ [ADVANCED_SYNC] Conflict detected by tab ${message.tabId}:`, message.queryKey);
    
    // إذا كنت القائد، حل التعارض
    if (this.isLeader && this.queryClient) {
      // استراتيجية: Last Write Wins
      // إعادة جلب البيانات من الخادم
      this.queryClient.invalidateQueries({ queryKey: message.queryKey });
      
      // إشعار جميع التبويبات
      this.broadcast({
        type: 'INVALIDATE',
        queryKey: message.queryKey,
        timestamp: Date.now(),
        tabId: this.tabId
      });
    }
  }

  // ============ Cleanup ============
  
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 10000; // 10 seconds
      
      this.activeTabs.forEach((tab, tabId) => {
        if (now - tab.lastSeen > timeout) {
          console.log(`🗑️ [ADVANCED_SYNC] Removing inactive tab: ${tabId}`);
          this.activeTabs.delete(tabId);
          
          // إذا كان القائد، ابدأ انتخاب جديد
          if (tabId === this.leaderTabId) {
            this.leaderTabId = null;
            this.startLeaderElection();
          }
        }
      });
    }, 5000);
  }

  private handlePing(message: TabSyncMessage & { type: 'PING' }) {
    // رد بـ PONG
    this.broadcast({
      type: 'PONG',
      tabId: this.tabId,
      timestamp: Date.now()
    });
    
    // تحديث lastSeen
    const tab = this.activeTabs.get(message.tabId);
    if (tab) {
      tab.lastSeen = message.timestamp;
    }
  }

  private handlePong(message: TabSyncMessage & { type: 'PONG' }) {
    const tab = this.activeTabs.get(message.tabId);
    if (tab) {
      tab.lastSeen = message.timestamp;
    }
  }

  // ============ Public API ============
  
  /**
   * CRITICAL FIX: Throttled broadcast to prevent message storms
   */
  private throttledBroadcast(message: TabSyncMessage): void {
    this.messageQueue.push({ message, timestamp: Date.now() });
    
    if (!this.isThrottled) {
      this.isThrottled = true;
      
      setTimeout(() => {
        this.processMessageQueue();
        this.isThrottled = false;
      }, this.THROTTLE_DELAY);
    }
  }
  
  /**
   * Process queued messages in batch
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    // Deduplicate messages by type and queryKey
    const uniqueMessages = new Map<string, QueuedMessage>();
    
    this.messageQueue.forEach(item => {
      const key = this.getMessageKey(item.message);
      const existing = uniqueMessages.get(key);
      
      // Keep the most recent message for each key
      if (!existing || item.timestamp > existing.timestamp) {
        uniqueMessages.set(key, item);
      }
    });
    
    // Send deduplicated messages
    uniqueMessages.forEach(item => {
      if (this.channel) {
        try {
          this.channel.postMessage(item.message);
        } catch (error) {
          console.error('🔄 [ADVANCED_SYNC] Error broadcasting message:', error);
        }
      }
    });
    
    // Clear queue
    this.messageQueue = [];
    
    console.log(`📤 [ADVANCED_SYNC] Processed ${uniqueMessages.size} unique messages`);
  }
  
  /**
   * Get unique key for message deduplication
   */
  private getMessageKey(message: TabSyncMessage): string {
    if (message.type === 'DATA_UPDATE' || message.type === 'INVALIDATE') {
      return `${message.type}:${JSON.stringify(message.queryKey)}`;
    }
    return `${message.type}:${message.tabId || 'global'}`;
  }
  
  /**
   * Public broadcast method (uses throttling internally)
   */
  broadcast(message: TabSyncMessage) {
    this.throttledBroadcast(message);
  }

  broadcastDataUpdate(queryKey: any[], data: any, timestamp: number) {
    const queryKeyStr = JSON.stringify(queryKey);
    const version = (this.dataVersions.get(queryKeyStr) || 0) + 1;
    this.dataVersions.set(queryKeyStr, version);
    
    this.broadcast({
      type: 'DATA_UPDATE',
      queryKey,
      data,
      timestamp,
      version,
      tabId: this.tabId
    });
  }

  broadcastInvalidate(queryKey: any[]) {
    this.broadcast({
      type: 'INVALIDATE',
      queryKey,
      timestamp: Date.now(),
      tabId: this.tabId
    });
  }

  onDataUpdate(callback: (update: any) => void): () => void {
    return this.on('DATA_UPDATE', callback);
  }

  onInvalidate(callback: (queryKey: any[]) => void): () => void {
    return this.on('INVALIDATE', (message: any) => callback(message.queryKey));
  }

  onSyncRequest(callback: () => void): () => void {
    return this.on('SYNC_REQUEST', callback);
  }

  private on(type: string, callback: Function): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private notifyListeners(type: string, message: any) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error(`🔄 [ADVANCED_SYNC] Error in listener for ${type}:`, error);
        }
      });
    }
  }

  private sendCacheToTab(targetTabId: string) {
    // DISABLED: Sending cache to new tabs causes performance issues
    console.log(`📤 [ADVANCED_SYNC] New tab ${targetTabId} will fetch its own data`);
    // The new tab will automatically fetch data via refetchOnWindowFocus
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.channel) {
      this.channel.close();
    }
    
    console.log(`🧹 [ADVANCED_SYNC] Cleaned up for tab: ${this.tabId}`);
  }

  getTabId(): string {
    return this.tabId;
  }

  isLeaderTab(): boolean {
    return this.isLeader;
  }

  getActiveTabsCount(): number {
    return this.activeTabs.size + 1;
  }
}

export const advancedTabSync = new AdvancedTabSyncManager();
