import React, { useState, useEffect } from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { VisualRegressionTester, DeviceTestMatrix, PerformanceTestSuite } from '@/utils/responsiveTesting'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  Play,
  Download,
  Eye,
  AlertTriangle
} from 'lucide-react'

// Test configuration interfaces
interface TestDevice {
  name: string
  type: 'mobile' | 'tablet' | 'desktop'
  viewport: { width: number; height: number }
  userAgent: string
  touchEnabled: boolean
}

interface TestResult {
  id: string
  device: TestDevice
  route: string
  status: 'passed' | 'failed' | 'warning' | 'running'
  screenshot?: string
  performanceMetrics?: {
    loadTime: number
    renderTime: number
    memoryUsage: number
  }
  errors?: string[]
  timestamp: number
}

interface ResponsiveTestSuiteProps {
  routes?: string[]
  autoRun?: boolean
  onTestComplete?: (results: TestResult[]) => void
}

// Test device configurations
const TEST_DEVICES: TestDevice[] = [
  {
    name: 'iPhone SE',
    type: 'mobile',
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    touchEnabled: true
  },
  {
    name: 'iPhone 14',
    type: 'mobile', 
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    touchEnabled: true
  },
  {
    name: 'Samsung Galaxy S23',
    type: 'mobile',
    viewport: { width: 360, height: 780 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B)',
    touchEnabled: true
  },
  {
    name: 'iPad Mini',
    type: 'tablet',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
    touchEnabled: true
  },
  {
    name: 'iPad Pro',
    type: 'tablet',
    viewport: { width: 1024, height: 1366 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
    touchEnabled: true
  },
  {
    name: 'MacBook',
    type: 'desktop',
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    touchEnabled: false
  },
  {
    name: 'Windows Desktop',
    type: 'desktop',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    touchEnabled: false
  },
  {
    name: 'Large Monitor',
    type: 'desktop',
    viewport: { width: 2560, height: 1440 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    touchEnabled: false
  }
]

// Device preview component
function DevicePreview({ device, route, onTest }: { 
  device: TestDevice
  route: string
  onTest: (device: TestDevice, route: string) => void
}) {
  const getDeviceIcon = (type: TestDevice['type']) => {
    switch (type) {
      case 'mobile': return Smartphone
      case 'tablet': return Tablet
      case 'desktop': return Monitor
      default: return Monitor
    }
  }

  const Icon = getDeviceIcon(device.type)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <CardTitle className="text-sm">{device.name}</CardTitle>
          </div>
          <Badge variant={device.touchEnabled ? 'default' : 'secondary'}>
            {device.touchEnabled ? 'Touch' : 'Mouse'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {device.viewport.width} × {device.viewport.height}
          </div>
          
          <div 
            className="border rounded-md bg-white overflow-hidden"
            style={{
              aspectRatio: `${device.viewport.width}/${device.viewport.height}`,
              maxHeight: '200px'
            }}
          >
            <iframe
              src={route}
              width={device.viewport.width}
              height={device.viewport.height}
              style={{
                transform: `scale(${Math.min(200 / device.viewport.height, 300 / device.viewport.width)})`,
                transformOrigin: 'top left',
                border: 'none'
              }}
              title={`${device.name} preview`}
            />
          </div>
          
          <Button 
            size="sm" 
            className="w-full"
            onClick={() => onTest(device, route)}
          >
            <Play size={14} className="mr-2" />
            Test Device
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Test results component
function TestResults({ results }: { results: TestResult[] }) {
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="text-green-500" size={16} />
      case 'failed': return <XCircle className="text-red-500" size={16} />
      case 'warning': return <AlertTriangle className="text-yellow-500" size={16} />
      case 'running': return <Clock className="text-blue-500" size={16} />
      default: return <Clock className="text-gray-500" size={16} />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800', 
      warning: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800'
    }

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result) => (
            <div 
              key={result.id}
              className="flex items-center justify-between p-3 border rounded-md"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <div>
                  <div className="font-medium text-sm">
                    {result.device.name} - {result.route}
                  </div>
                  {result.performanceMetrics && (
                    <div className="text-xs text-muted-foreground">
                      Load: {result.performanceMetrics.loadTime}ms | 
                      Render: {result.performanceMetrics.renderTime}ms
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(result.status)}
                {result.screenshot && (
                  <Button size="sm" variant="outline">
                    <Eye size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Visual test grid component
export function VisualTestGrid({ routes = ['/'] }: { routes?: string[] }) {
  const [selectedRoute, setSelectedRoute] = useState(routes[0])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runSingleTest = async (device: TestDevice, route: string) => {
    const testId = `${device.name}-${route}-${Date.now()}`
    
    // Add running test result
    const runningResult: TestResult = {
      id: testId,
      device,
      route,
      status: 'running',
      timestamp: Date.now()
    }
    
    setTestResults(prev => [...prev, runningResult])

    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate test results
      const success = Math.random() > 0.2 // 80% success rate
      const updatedResult: TestResult = {
        ...runningResult,
        status: success ? 'passed' : 'failed',
        performanceMetrics: {
          loadTime: Math.floor(Math.random() * 3000) + 500,
          renderTime: Math.floor(Math.random() * 500) + 100,
          memoryUsage: Math.floor(Math.random() * 50) + 20
        },
        errors: success ? [] : ['Layout shift detected', 'Touch target too small']
      }
      
      setTestResults(prev => 
        prev.map(result => result.id === testId ? updatedResult : result)
      )
    } catch (error) {
      console.error('Test failed:', error)
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    for (const device of TEST_DEVICES) {
      for (const route of routes) {
        await runSingleTest(device, route)
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Visual Testing Grid</h3>
          <div className="flex gap-2">
            {routes.map(route => (
              <Button
                key={route}
                size="sm"
                variant={selectedRoute === route ? 'default' : 'outline'}
                onClick={() => setSelectedRoute(route)}
              >
                {route}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={isRunning}>
            <Play size={16} className="mr-2" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {TEST_DEVICES.map(device => (
          <DevicePreview
            key={device.name}
            device={device}
            route={selectedRoute}
            onTest={runSingleTest}
          />
        ))}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <TestResults results={testResults} />
      )}
    </div>
  )
}

// Main responsive test suite component
export function ResponsiveTestSuite({ 
  routes = ['/dashboard', '/fleet', '/finance', '/contracts', '/hr'],
  autoRun = false,
  onTestComplete
}: ResponsiveTestSuiteProps) {
  const { deviceType } = useEnhancedResponsive()
  const [activeTab, setActiveTab] = useState<'visual' | 'performance' | 'accessibility'>('visual')
  const [testResults, setTestResults] = useState<TestResult[]>([])

  useEffect(() => {
    if (autoRun) {
      // Auto-run tests when component mounts
      runFullTestSuite()
    }
  }, [autoRun])

  const runFullTestSuite = async () => {
    const results: TestResult[] = []
    
    for (const device of TEST_DEVICES) {
      for (const route of routes) {
        try {
          const result = await runDeviceTest(device, route)
          results.push(result)
        } catch (error) {
          console.error(`Test failed for ${device.name} on ${route}:`, error)
        }
      }
    }
    
    setTestResults(results)
    onTestComplete?.(results)
  }

  const runDeviceTest = async (device: TestDevice, route: string): Promise<TestResult> => {
    // This would integrate with actual testing tools like Playwright or Puppeteer
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `${device.name}-${route}-${Date.now()}`,
          device,
          route,
          status: Math.random() > 0.15 ? 'passed' : 'failed',
          performanceMetrics: {
            loadTime: Math.floor(Math.random() * 3000) + 500,
            renderTime: Math.floor(Math.random() * 500) + 100,
            memoryUsage: Math.floor(Math.random() * 50) + 20
          },
          timestamp: Date.now()
        })
      }, 1000)
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Responsive Testing Suite</h2>
        <Badge>Current: {deviceType}</Badge>
      </div>

      {/* Test Tabs */}
      <div className="flex border-b">
        {[
          { key: 'visual', label: 'Visual Testing' },
          { key: 'performance', label: 'Performance' },
          { key: 'accessibility', label: 'Accessibility' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 border-b-2 font-medium transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'visual' && (
        <VisualTestGrid routes={routes} />
      )}

      {activeTab === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-4" />
              <p>Performance testing framework will be implemented here</p>
              <p className="text-sm">Metrics: Core Web Vitals, Bundle Size, Memory Usage</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'accessibility' && (
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Eye size={48} className="mx-auto mb-4" />
              <p>Accessibility testing framework will be implemented here</p>
              <p className="text-sm">WCAG 2.1 AA compliance, Screen reader support, Keyboard navigation</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Export test utilities
export { TEST_DEVICES }
export type { TestDevice, TestResult }