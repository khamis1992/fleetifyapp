import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { batteryManager } from '@/lib/mobile/BatteryManager';
import { memoryLeakDetector } from '@/lib/mobile/MemoryLeakDetector';
import { useMobileAnalytics } from '@/services/mobile/MobileAnalytics';
import { useBackgroundSync } from '@/services/mobile/BackgroundSync';
import { useTouchOptimization } from '@/components/mobile/TouchOptimization';
import {
  Battery,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Trash2,
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown,
  Cpu,
  HardDrive,
  Radio,
  Database,
  Shield,
  Gauge
} from 'lucide-react';

interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  battery: {
    level: number;
    charging: boolean;
    mode: 'high' | 'medium' | 'low';
    estimatedTime: number;
  };
  network: {
    type: string;
    speed: number;
    latency: number;
    online: boolean;
  };
  sync: {
    pending: number;
    successful: number;
    failed: number;
    lastSync: number;
    progress: number;
  };
  analytics: {
    sessionDuration: number;
    pageViews: number;
    interactions: number;
    errors: number;
    crashReports: number;
  };
  device: {
    cores: number;
    memory: number;
    pixelRatio: number;
    viewport: string;
    platform: string;
  };
}

interface HistoricalData {
  timestamp: number;
  memoryUsage: number;
  batteryLevel: number;
  networkLatency: number;
  errorCount: number;
}

export const MobilePerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  const { trackEvent, getSessionInfo } = useMobileAnalytics();
  const { syncStats, isOnline } = useBackgroundSync();
  const { triggerHapticFeedback } = useTouchOptimization();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Collect comprehensive metrics
  const collectMetrics = useCallback(() => {
    try {
      // Memory metrics
      const memoryInfo = memoryLeakDetector.getCurrentMemoryInfo();
      const memoryUsageMB = memoryLeakDetector.getMemoryUsageMB();
      const memoryPercentage = memoryLeakDetector.getMemoryUsagePercentage();

      // Battery metrics
      const batteryInfo = batteryManager.getBatteryInfo();
      const batteryLevel = Math.round(batteryInfo.level * 100);
      const performanceLevel = batteryManager.getPerformanceLevel();

      // Network metrics
      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection;

      const networkType = connection?.effectiveType || 'unknown';
      const networkSpeed = connection?.downlink || 0;
      const networkLatency = connection?.rtt || 0;

      // Device metrics
      const deviceInfo = {
        cores: navigator.hardwareConcurrency || 1,
        memory: (navigator as any).deviceMemory || 4,
        pixelRatio: window.devicePixelRatio || 1,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform
      };

      // Analytics metrics
      const sessionInfo = getSessionInfo();
      const analyticsMetrics = {
        sessionDuration: sessionInfo.duration || 0,
        pageViews: sessionInfo.pageViews?.length || 0,
        interactions: sessionInfo.interactions?.length || 0,
        errors: sessionInfo.errors?.length || 0,
        crashReports: memoryLeakDetector.getMemoryLeaks().length
      };

      // Calculate trends
      const previousMemory = historicalData[historicalData.length - 1]?.memoryUsage || memoryUsageMB;
      const memoryTrend = memoryUsageMB > previousMemory * 1.05 ? 'up' :
                        memoryUsageMB < previousMemory * 0.95 ? 'down' : 'stable';

      const newMetrics: PerformanceMetrics = {
        memory: {
          used: memoryUsageMB,
          total: memoryInfo ? memoryInfo.jsHeapSizeLimit / (1024 * 1024) : 0,
          percentage: memoryPercentage,
          trend: memoryTrend as 'up' | 'down' | 'stable'
        },
        battery: {
          level: batteryLevel,
          charging: batteryInfo.charging,
          mode: performanceLevel,
          estimatedTime: batteryInfo.dischargingTime
        },
        network: {
          type: networkType,
          speed: networkSpeed,
          latency: networkLatency,
          online: navigator.onLine
        },
        sync: {
          pending: syncStats.pendingItems,
          successful: syncStats.successfulItems,
          failed: syncStats.failedItems,
          lastSync: syncStats.lastSyncTime,
          progress: syncStats.totalItems > 0 ? (syncStats.successfulItems / syncStats.totalItems) * 100 : 100
        },
        analytics: analyticsMetrics,
        device: deviceInfo
      };

      setMetrics(newMetrics);
      setLastUpdate(new Date());

      // Update historical data (keep last 50 data points)
      const newHistoricalPoint: HistoricalData = {
        timestamp: Date.now(),
        memoryUsage: memoryUsageMB,
        batteryLevel: batteryLevel,
        networkLatency: networkLatency,
        errorCount: analyticsMetrics.errors
      };

      setHistoricalData(prev => [...prev.slice(-49), newHistoricalPoint]);

    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }, [getSessionInfo, syncStats, historicalData]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      memoryLeakDetector.stopMonitoring();
    } else {
      intervalRef.current = setInterval(collectMetrics, 2000);
      memoryLeakDetector.startMonitoring(5000);
      collectMetrics(); // Initial collection
    }
    setIsMonitoring(!isMonitoring);
    triggerHapticFeedback('light');
  }, [isMonitoring, collectMetrics, triggerHapticFeedback]);

  // Manual cleanup
  const performCleanup = useCallback(() => {
    memoryLeakDetector.forceGarbageCollection();
    collectMetrics();
    triggerHapticFeedback('medium');
    trackEvent('performance_cleanup', { source: 'mobile_dashboard' });
  }, [collectMetrics, triggerHapticFeedback, trackEvent]);

  // Initialize monitoring
  useEffect(() => {
    collectMetrics();
    intervalRef.current = setInterval(collectMetrics, 2000);
    memoryLeakDetector.startMonitoring(5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      memoryLeakDetector.stopMonitoring();
    };
  }, [collectMetrics]);

  // Status badge helper
  const getStatusBadge = (value: number, thresholds: { good: number; warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <Badge variant="destructive">Critical</Badge>;
    if (value >= thresholds.warning) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="default">Good</Badge>;
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <div className="h-4 w-4 bg-slate-400 rounded-full" />;
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading performance metrics...</span>
      </div>
    );
  }

  return (
    <div className="mobile-performance-dashboard space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Mobile Performance</h3>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Minimize' : 'Expand'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={performCleanup}
            disabled={!isMonitoring}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Cleanup
          </Button>

          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            onClick={toggleMonitoring}
          >
            <Activity className="h-4 w-4 mr-1" />
            {isMonitoring ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Memory Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{metrics.memory.used.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">MB</span>
              {getTrendIcon(metrics.memory.trend)}
            </div>
            <Progress value={metrics.memory.percentage} className="mt-2" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {metrics.memory.percentage.toFixed(1)}%
              </span>
              {getStatusBadge(metrics.memory.percentage, { good: 50, warning: 75, critical: 90 })}
            </div>
          </CardContent>
        </Card>

        {/* Battery Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery</CardTitle>
            <Battery className={`h-4 w-4 ${metrics.battery.charging ? 'text-green-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{metrics.battery.level}%</span>
              {metrics.battery.charging && <Zap className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant={metrics.battery.mode === 'low' ? 'destructive' :
                             metrics.battery.mode === 'medium' ? 'secondary' : 'default'}>
                {metrics.battery.mode.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {Math.floor(metrics.battery.estimatedTime / 60)}m left
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Network Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            {metrics.network.online ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize">{metrics.network.type}</div>
            <div className="text-sm text-muted-foreground">
              {metrics.network.speed > 0 ? `${metrics.network.speed} Mbps` : 'Unknown speed'}
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <Radio className="h-3 w-3" />
              <span className="text-xs">{metrics.network.latency}ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Sync Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sync.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
            <Progress value={metrics.sync.progress} className="mt-2" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-green-600">{metrics.sync.successful}</span>
              <span className="text-xs text-red-600">{metrics.sync.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      {isExpanded && (
        <Tabs defaultValue="memory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="battery">Battery</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5" />
                  <span>Memory Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Used</label>
                    <div className="text-lg">{metrics.memory.used.toFixed(1)} MB</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total</label>
                    <div className="text-lg">{metrics.memory.total.toFixed(1)} MB</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Active Components</label>
                    <div className="text-lg">{memoryLeakDetector.getComponentCount()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Memory Leaks</label>
                    <div className="text-lg">{memoryLeakDetector.getMemoryLeaks().length}</div>
                  </div>
                </div>

                {memoryLeakDetector.getMemoryLeaks().length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-red-600">Memory Leaks Detected</label>
                    <div className="space-y-2 mt-2">
                      {memoryLeakDetector.getMemoryLeaks().slice(0, 3).map((leak, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded">
                          <div className="font-medium">{leak.component}</div>
                          <div className="text-xs text-muted-foreground">
                            {leak.leakSize.toFixed(2)}MB - {leak.severity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="battery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Battery className="h-5 w-5" />
                  <span>Battery Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Level</label>
                    <div className="text-lg">{metrics.battery.level}%</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="text-lg">{metrics.battery.charging ? 'Charging' : 'Discharging'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Performance Mode</label>
                    <div className="text-lg capitalize">{metrics.battery.mode}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Est. Time</label>
                    <div className="text-lg">
                      {Math.floor(metrics.battery.estimatedTime / 60)}m
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wifi className="h-5 w-5" />
                  <span>Network Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Connection</label>
                    <div className="text-lg capitalize">{metrics.network.type}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Speed</label>
                    <div className="text-lg">{metrics.network.speed} Mbps</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Latency</label>
                    <div className="text-lg">{metrics.network.latency}ms</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="text-lg">{metrics.network.online ? 'Online' : 'Offline'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>Session Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Session Duration</label>
                    <div className="text-lg">{Math.floor(metrics.analytics.sessionDuration / 60000)}m</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Page Views</label>
                    <div className="text-lg">{metrics.analytics.pageViews}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Interactions</label>
                    <div className="text-lg">{metrics.analytics.interactions}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Errors</label>
                    <div className="text-lg text-red-600">{metrics.analytics.errors}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Device Info */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Device Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <label className="font-medium">Platform</label>
                <div>{metrics.device.platform}</div>
              </div>
              <div>
                <label className="font-medium">CPU Cores</label>
                <div>{metrics.device.cores}</div>
              </div>
              <div>
                <label className="font-medium">Memory</label>
                <div>{metrics.device.memory} GB</div>
              </div>
              <div>
                <label className="font-medium">Pixel Ratio</label>
                <div>{metrics.device.pixelRatio}</div>
              </div>
              <div>
                <label className="font-medium">Viewport</label>
                <div>{metrics.device.viewport}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobilePerformanceDashboard;