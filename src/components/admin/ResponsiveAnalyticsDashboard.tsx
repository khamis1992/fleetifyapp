import React, { useState, useEffect } from 'react'
import { useResponsiveAnalytics } from '@/utils/responsiveAnalytics'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { ResponsiveCard, ResponsiveButton } from '@/components/responsive/ResponsiveComponents'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Smartphone,
  Tablet,
  Monitor,
  Clock,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  Eye,
  MousePointer,
  Zap,
  Target
} from 'lucide-react'

interface AnalyticsDashboardProps {
  userId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ResponsiveAnalyticsDashboard({
  userId,
  autoRefresh = true,
  refreshInterval = 30000
}: AnalyticsDashboardProps) {
  const { deviceType } = useEnhancedResponsive()
  const { generateReport, trackInteraction } = useResponsiveAnalytics(userId)
  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Auto-refresh functionality
  useEffect(() => {
    loadReport()
    
    if (autoRefresh) {
      const interval = setInterval(loadReport, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const newReport = generateReport()
      setReport(newReport)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to generate analytics report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadReport = () => {
    if (!report) return
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `responsive-analytics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    trackInteraction('analytics_dashboard', 'download_report', true)
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return Smartphone
      case 'tablet': return Tablet
      case 'desktop': return Monitor
      default: return Monitor
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Responsive Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights into responsive design performance
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <ResponsiveButton
            variant="outline"
            onClick={loadReport}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={cn("mr-2", isLoading && "animate-spin")} />
            Refresh
          </ResponsiveButton>
          <ResponsiveButton
            variant="outline"
            onClick={downloadReport}
          >
            <Download size={16} className="mr-2" />
            Export
          </ResponsiveButton>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResponsiveCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{formatNumber(report.summary.totalEvents)}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </ResponsiveCard>

        <ResponsiveCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Session Duration</p>
              <p className="text-2xl font-bold">{formatDuration(report.summary.sessionDuration)}</p>
            </div>
            <Clock className="h-8 w-8 text-green-500" />
          </div>
        </ResponsiveCard>

        <ResponsiveCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Interactions</p>
              <p className="text-2xl font-bold">{formatNumber(report.summary.interactionCount)}</p>
            </div>
            <MousePointer className="h-8 w-8 text-purple-500" />
          </div>
        </ResponsiveCard>

        <ResponsiveCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-red-600">{report.summary.errorCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </ResponsiveCard>
      </div>

      {/* Device Distribution */}
      <ResponsiveCard title="Device Distribution">
        <div className="space-y-4">
          {Object.entries(report.summary.deviceDistribution).map(([device, count]: [string, any]) => {
            const DeviceIcon = getDeviceIcon(device)
            const percentage = (count / report.summary.totalEvents) * 100
            
            return (
              <div key={device} className="flex items-center gap-4">
                <DeviceIcon size={20} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="capitalize font-medium">{device}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              </div>
            )
          })}
        </div>
      </ResponsiveCard>

      {/* Performance Metrics */}
      {report.performanceMetrics && Object.keys(report.performanceMetrics).length > 0 && (
        <ResponsiveCard title="Performance Metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.performanceMetrics.avgLoadTime && (
              <div className="text-center p-4 border rounded-lg">
                <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Avg Load Time</p>
                <p className="text-lg font-bold">
                  {formatDuration(report.performanceMetrics.avgLoadTime)}
                </p>
              </div>
            )}
            
            {report.performanceMetrics.avgRenderTime && (
              <div className="text-center p-4 border rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-muted-foreground">Avg Render Time</p>
                <p className="text-lg font-bold">
                  {formatDuration(report.performanceMetrics.avgRenderTime)}
                </p>
              </div>
            )}
            
            {report.performanceMetrics.avgMemoryUsage && (
              <div className="text-center p-4 border rounded-lg">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground">Avg Memory Usage</p>
                <p className="text-lg font-bold">
                  {formatBytes(report.performanceMetrics.avgMemoryUsage)}
                </p>
              </div>
            )}
            
            {report.performanceMetrics.avgFPS && (
              <div className="text-center p-4 border rounded-lg">
                <Activity className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-muted-foreground">Avg FPS</p>
                <p className="text-lg font-bold">
                  {report.performanceMetrics.avgFPS.toFixed(1)}
                </p>
              </div>
            )}
          </div>
        </ResponsiveCard>
      )}

      {/* Device Breakdown */}
      <ResponsiveCard title="Device Analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(report.deviceBreakdown).map(([device, data]: [string, any]) => {
            const DeviceIcon = getDeviceIcon(device)
            
            return (
              <div key={device} className="space-y-3">
                <div className="flex items-center gap-2">
                  <DeviceIcon size={20} />
                  <h3 className="font-semibold capitalize">{device}</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Events:</span>
                    <span className="font-medium">{data.events}</span>
                  </div>
                  
                  {data.avgWidth && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Width:</span>
                      <span className="font-medium">{Math.round(data.avgWidth)}px</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Touch Support:</span>
                    <span className="font-medium">
                      {data.touchSupport} / {data.events}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ResponsiveCard>

      {/* Error Analysis */}
      {report.errorAnalysis && report.errorAnalysis.totalErrors > 0 && (
        <ResponsiveCard title="Error Analysis" className="border-red-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              <span className="font-semibold">
                {report.errorAnalysis.totalErrors} total errors detected
              </span>
            </div>
            
            {/* Errors by Device */}
            <div>
              <h4 className="font-medium mb-2">Errors by Device</h4>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(report.errorAnalysis.errorsByDevice).map(([device, count]: [string, any]) => (
                  <div key={device} className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground capitalize">{device}</p>
                    <p className="text-lg font-bold text-red-600">{count}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top Errors */}
            <div>
              <h4 className="font-medium mb-2">Most Common Errors</h4>
              <div className="space-y-2">
                {Object.entries(report.errorAnalysis.errorsByType)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([error, count]: [string, any]) => (
                    <div key={error} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm truncate flex-1 mr-2">{error}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </ResponsiveCard>
      )}

      {/* User Behavior Insights */}
      {report.userBehaviorInsights && Object.keys(report.userBehaviorInsights).length > 0 && (
        <ResponsiveCard title="User Behavior Insights">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.userBehaviorInsights.avgScrollDepth !== undefined && (
              <div className="text-center p-4 border rounded-lg">
                <Eye className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-muted-foreground">Avg Scroll Depth</p>
                <p className="text-lg font-bold">
                  {report.userBehaviorInsights.avgScrollDepth.toFixed(1)}%
                </p>
              </div>
            )}
            
            {report.userBehaviorInsights.avgTimeOnPage !== undefined && (
              <div className="text-center p-4 border rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground">Avg Time on Page</p>
                <p className="text-lg font-bold">
                  {formatDuration(report.userBehaviorInsights.avgTimeOnPage)}
                </p>
              </div>
            )}
            
            {report.userBehaviorInsights.avgClickCount !== undefined && (
              <div className="text-center p-4 border rounded-lg">
                <MousePointer className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-muted-foreground">Avg Click Count</p>
                <p className="text-lg font-bold">
                  {report.userBehaviorInsights.avgClickCount.toFixed(1)}
                </p>
              </div>
            )}
            
            {report.userBehaviorInsights.avgFormCompletionRate !== undefined && (
              <div className="text-center p-4 border rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-sm text-muted-foreground">Form Completion Rate</p>
                <p className="text-lg font-bold">
                  {report.userBehaviorInsights.avgFormCompletionRate.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </ResponsiveCard>
      )}

      {/* Current Session Info */}
      <ResponsiveCard title="Current Session">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Session ID</p>
            <p className="font-mono text-sm">{report.sessionId}</p>
          </div>
          
          {report.userId && (
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{report.userId}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground">Current Device</p>
            <div className="flex items-center gap-2">
              {React.createElement(getDeviceIcon(deviceType), { size: 16 })}
              <span className="capitalize">{deviceType}</span>
            </div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  )
}