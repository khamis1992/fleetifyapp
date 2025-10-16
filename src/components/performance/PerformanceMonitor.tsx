import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { logger } from '@/lib/logger';
import {
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  Wifi,
  Battery,
  MemoryStick,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Settings,
  Download,
  Upload
} from 'lucide-react';

interface PerformanceMonitorProps {
  showDetailed?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  showDetailed = false 
}) => {
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint();
  const { 
    getPerformanceReport, 
    memoryUsage, 
    config, 
    updateConfig 
  } = usePerformanceOptimization();
  
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const updatePerformanceData = () => {
      const report = getPerformanceReport();
      setPerformanceData(report);
    };

    const detectConnection = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      }
    };

    const detectDevice = () => {
      setDeviceInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency || 'Unknown',
        memory: (navigator as any).deviceMemory || 'Unknown',
        pixelRatio: window.devicePixelRatio,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    };

    updatePerformanceData();
    detectConnection();
    detectDevice();

    const interval = setInterval(updatePerformanceData, 2000);
    return () => clearInterval(interval);
  }, [getPerformanceReport]);

  const getDeviceIcon = () => {
    if (isMobile) return <Smartphone className="h-4 w-4" />;
    if (isTablet) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceType = () => {
    if (isMobile) return 'Mobile';
    if (isTablet) return 'Tablet';
    return 'Desktop';
  };

  const getMemoryStatus = () => {
    if (memoryUsage < 50) return { status: 'good', color: 'bg-green-500', icon: CheckCircle };
    if (memoryUsage < 80) return { status: 'warning', color: 'bg-yellow-500', icon: AlertTriangle };
    return { status: 'critical', color: 'bg-red-500', icon: AlertTriangle };
  };

  const getConnectionStatus = () => {
    if (!connectionInfo) return { status: 'unknown', color: 'bg-gray-500', text: 'Unknown' };
    
    const { effectiveType } = connectionInfo;
    if (effectiveType === '4g') return { status: 'excellent', color: 'bg-green-500', text: '4G' };
    if (effectiveType === '3g') return { status: 'good', color: 'bg-yellow-500', text: '3G' };
    if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      return { status: 'poor', color: 'bg-red-500', text: '2G' };
    }
    return { status: 'good', color: 'bg-blue-500', text: effectiveType?.toUpperCase() || 'WiFi' };
  };

  const optimizePerformance = async () => {
    setIsOptimizing(true);
    
    try {
      // Auto-optimize based on current conditions
      const optimizedConfig = {
        ...config,
        enableLazyLoading: true,
        imageOptimization: true,
        enableVirtualization: memoryUsage > 60,
        maxConcurrentImages: memoryUsage > 80 ? 2 : memoryUsage > 60 ? 3 : 5,
        prefetchCriticalResources: memoryUsage < 70
      };

      // Additional mobile optimizations
      if (isMobile) {
        optimizedConfig.maxConcurrentImages = Math.min(optimizedConfig.maxConcurrentImages, 3);
        
        // Reduce quality on slow connections
        if (connectionInfo?.effectiveType === '2g' || connectionInfo?.effectiveType === 'slow-2g') {
          optimizedConfig.maxConcurrentImages = 1;
        }
      }

      updateConfig(optimizedConfig);
      
      // Clear some caches if memory usage is high
      if (memoryUsage > 80 && 'caches' in window) {
        const cacheNames = await caches.keys();
        const dynamicCaches = cacheNames.filter(name => name.includes('dynamic'));
        
        for (const cacheName of dynamicCaches) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          // Remove half of the cached items
          const keysToDelete = keys.slice(0, Math.floor(keys.length / 2));
          await Promise.all(keysToDelete.map(key => cache.delete(key)));
        }
      }
      
      logger.log('🚀 Performance optimized successfully');
    } catch (error) {
      logger.error('❌ Error optimizing performance:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const memoryStatus = getMemoryStatus();
  const connectionStatus = getConnectionStatus();

  if (!showDetailed) {
    // Compact view for mobile/embedded usage
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </CardTitle>
            <div className="flex items-center gap-2">
              {getDeviceIcon()}
              <Badge variant="secondary" className="text-xs">
                {getDeviceType()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Memory</span>
            <div className="flex items-center gap-2">
              <Progress value={memoryUsage} className="w-20 h-2" />
              <span className="text-xs font-medium">{memoryUsage.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connection</span>
            <Badge 
              variant="secondary" 
              className={`text-xs ${connectionStatus.color} text-white`}
            >
              {connectionStatus.text}
            </Badge>
          </div>
          
          {memoryUsage > 70 && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={optimizePerformance}
              disabled={isOptimizing}
              className="w-full"
            >
              <Zap className="h-3 w-3 mr-2" />
              {isOptimizing ? 'Optimizing...' : 'Optimize Performance'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Detailed view
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Memory Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{memoryUsage.toFixed(1)}%</span>
                <memoryStatus.icon className={`h-5 w-5 text-white p-1 rounded ${memoryStatus.color}`} />
              </div>
              <Progress value={memoryUsage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {memoryStatus.status === 'good' && 'Healthy Memory'}
                {memoryStatus.status === 'warning' && 'Moderate Usage'}
                {memoryStatus.status === 'critical' && 'High Usage'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Device Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {getDeviceIcon()}
              Device Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-semibold">{getDeviceType()}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{deviceInfo?.viewport?.width}×{deviceInfo?.viewport?.height}</div>
                <div>{deviceInfo?.cores} cores</div>
                {deviceInfo?.memory !== 'Unknown' && (
                  <div>{deviceInfo?.memory}GB RAM</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge 
                variant="secondary" 
                className={`${connectionStatus.color} text-white`}
              >
                {connectionStatus.text}
              </Badge>
              {connectionInfo && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span>{connectionInfo.downlink} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span>{connectionInfo.rtt}ms</span>
                  </div>
                  {connectionInfo.saveData && (
                    <div className="text-orange-600">Data Saver Active</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {performanceData ? Math.round(100 - memoryUsage / 2) : '--'}
              </div>
              <div className="text-xs text-muted-foreground">
                out of 100 points
              </div>
              <Button 
                size="sm" 
                onClick={optimizePerformance}
                disabled={isOptimizing}
                className="w-full"
              >
                <Zap className="h-3 w-3 mr-2" />
                {isOptimizing ? 'Optimizing...' : 'Optimize'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="config">Settings</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
            </TabsList>
            
            <TabsContent value="metrics" className="space-y-4">
              {performanceData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {performanceData.navigationTiming && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Load Times</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>DOM Content Loaded:</span>
                          <span>{performanceData.navigationTiming.domContentLoaded}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Load Complete:</span>
                          <span>{performanceData.navigationTiming.loadComplete}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>First Byte:</span>
                          <span>{performanceData.navigationTiming.firstByte}ms</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {performanceData.paintMetrics && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Paint Metrics</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(performanceData.paintMetrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span>{(value as number).toFixed(1)}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Optimization Settings</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Lazy Loading:</span>
                      <Badge variant={config.enableLazyLoading ? "default" : "secondary"}>
                        {config.enableLazyLoading ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Image Optimization:</span>
                      <Badge variant={config.imageOptimization ? "default" : "secondary"}>
                        {config.imageOptimization ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Virtualization:</span>
                      <Badge variant={config.enableVirtualization ? "default" : "secondary"}>
                        {config.enableVirtualization ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Concurrent Images:</span>
                      <span>{config.maxConcurrentImages}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4">
              {connectionInfo ? (
                <div className="space-y-2">
                  <h4 className="font-medium">Network Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Connection Type:</span>
                        <span>{connectionInfo.effectiveType?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Download Speed:</span>
                        <span>{connectionInfo.downlink} Mbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span>{connectionInfo.rtt}ms</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Data Saver:</span>
                        <Badge variant={connectionInfo.saveData ? "destructive" : "default"}>
                          {connectionInfo.saveData ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Network information not available</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;