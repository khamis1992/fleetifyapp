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

  initialize(queryClient: QueryClient, tabId: string) {
    this.queryClient = queryClient;
    this.tabId = tabId;
    
    // التحقق من دعم BroadcastChannel
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('🔄 [ADVANCED_SYNC] BroadcastChannel not supported');
      return;
    }
    
    // إنشاء BroadcastChannel
    this.channel = new BroadcastChannel('fleetify-advanced-sync');
    
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
    const queryKeyStr = JSON.stringify(message.queryKey);
    const currentVersion = this.dataVersions.get(queryKeyStr) || 0;
    
    // كشف التعارض
    if (message.version < currentVersion) {
      console.warn(`⚠️ [ADVANCED_SYNC] Conflict detected for query:`, message.queryKey);
      this.broadcast({
        type: 'CONFLICT_DETECTED',
        queryKey: message.queryKey,
        versions: [currentVersion, message.version],
        tabId: this.tabId
      });
      return;
    }
    
    // تحديث البيانات
    if (this.queryClient && message.data !== undefined) {
      this.queryClient.setQueryData(message.queryKey, message.data);
      this.dataVersions.set(queryKeyStr, message.version);
      
      console.log(`🔄 [ADVANCED_SYNC] Data updated from tab ${message.tabId}:`, message.queryKey);
    }
  }

  private handleInvalidate(message: TabSyncMessage & { type: 'INVALIDATE' }) {
    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey: message.queryKey });
      console.log(`🔄 [ADVANCED_SYNC] Query invalidated from tab ${message.tabId}:`, message.queryKey);
    }
  }

  private handleSyncRequest(message: TabSyncMessage & { type: 'SYNC_REQUEST' }) {
    // إرسال جميع البيانات الحالية للتبويبة الطالبة
    if (this.queryClient) {
      const cache = this.queryClient.getQueryCache();
      const allQueries = cache.getAll();
      
      const queries = allQueries
        .filter(query => query.state.data !== undefined)
        .map(query => ({
          queryKey: query.queryKey,
          data: query.state.data,
          timestamp: query.state.dataUpdatedAt,
          version: this.dataVersions.get(JSON.stringify(query.queryKey)) || 1
        }));
      
      if (queries.length > 0) {
        this.broadcast({
          type: 'SYNC_RESPONSE',
          queries,
          tabId: this.tabId,
          timestamp: Date.now()
        });
        
        console.log(`📤 [ADVANCED_SYNC] Sent ${queries.length} queries to tab ${message.tabId}`);
      }
    }
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
    this.heartbeatInterval = setInterval(() => {
      if (this.isLeader) {
        this.broadcast({
          type: 'LEADER_HEARTBEAT',
          tabId: this.tabId,
          timestamp: Date.now()
        });
      }
      
      // Ping للتبويبات الأخرى
      this.broadcast({
        type: 'PING',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }, 3000);
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
  
  broadcast(message: TabSyncMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.error('🔄 [ADVANCED_SYNC] Error broadcasting message:', error);
      }
    }
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
    if (this.queryClient) {
      const cache = this.queryClient.getQueryCache();
      const allQueries = cache.getAll();
      
      const queries = allQueries
        .filter(query => query.state.data !== undefined)
        .map(query => ({
          queryKey: query.queryKey,
          data: query.state.data,
          timestamp: query.state.dataUpdatedAt,
          version: this.dataVersions.get(JSON.stringify(query.queryKey)) || 1
        }));
      
      if (queries.length > 0) {
        this.broadcast({
          type: 'SYNC_RESPONSE',
          queries,
          tabId: this.tabId,
          timestamp: Date.now()
        });
        
        console.log(`📤 [ADVANCED_SYNC] Sent ${queries.length} queries to new tab`);
      }
    }
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
