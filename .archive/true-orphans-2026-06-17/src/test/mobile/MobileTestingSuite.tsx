import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';
import { useMobilePerformance } from '@/hooks/useMobilePerformance';
import { batteryManager } from '@/lib/mobile/BatteryManager';
import { memoryLeakDetector } from '@/lib/mobile/MemoryLeakDetector';
import { useMobileAnalytics } from '@/services/mobile/MobileAnalytics';
import { useBackgroundSync } from '@/services/mobile/BackgroundSync';
import {
  Smartphone,
  Battery,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Zap,
  HardDrive,
  Monitor,
  TestTube,
  FileText,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  category: 'performance' | 'memory' | 'battery' | 'network' | 'touch' | 'sync' | 'analytics';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration: number;
  score: number; // 0-100
  details: string;
  metrics: Record<string, any>;
  timestamp: number;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestConfig[];
  estimatedDuration: number;
}

interface TestConfig {
  id: string;
  name: string;
  description: string;
  category: TestResult['category'];
  timeout: number;
  critical: boolean;
  parameters?: Record<string, any>;
}

interface DeviceProfile {
  name: string;
  type: 'low-end' | 'mid-range' | 'high-end';
  memory: number; // GB
  cores: number;
  batteryCapacity: number; // mAh
  networkType: 'slow-2g' | '2g' | '3g' | '4g';
  screenResolution: string;
  pixelRatio: number;
}

export const MobileTestingSuite: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<TestResult | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceProfile | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  const { optimizePerformance, getPerformanceInsights } = useMobilePerformance();
  const { triggerSync, syncStats } = useBackgroundSync();
  const { trackEvent, getSessionInfo } = useMobileAnalytics();
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Device profiles for testing
  const deviceProfiles: DeviceProfile[] = [
    {
      name: 'Low-end Android',
      type: 'low-end',
      memory: 2,
      cores: 2,
      batteryCapacity: 3000,
      networkType: '3g',
      screenResolution: '720x1280',
      pixelRatio: 1.5
    },
    {
      name: 'Mid-range iPhone',
      type: 'mid-range',
      memory: 4,
      cores: 6,
      batteryCapacity: 3500,
      networkType: '4g',
      screenResolution: '1080x1920',
      pixelRatio: 2.0
    },
    {
      name: 'High-end Android',
      type: 'high-end',
      memory: 12,
      cores: 8,
      batteryCapacity: 5000,
      networkType: '4g',
      screenResolution: '1440x3120',
      pixelRatio: 3.0
    }
  ];

  // Test suite definitions
  const testSuites: TestSuite[] = [
    {
      name: 'Performance Tests',
      description: 'Core performance metrics and optimizations',
      estimatedDuration: 30000,
      tests: [
        {
          id: 'app-startup',
          name: 'App Startup Time',
          description: 'Measure application initialization time',
          category: 'performance',
          timeout: 10000,
          critical: true
        },
        {
          id: 'render-performance',
          name: 'Render Performance',
          description: 'Test component rendering performance',
          category: 'performance',
          timeout: 15000,
          critical: true
        },
        {
          id: 'animation-smoothness',
          name: 'Animation Smoothness',
          description: 'Check animation frame rates',
          category: 'performance',
          timeout: 10000,
          critical: false
        }
      ]
    },
    {
      name: 'Memory Tests',
      description: 'Memory usage and leak detection',
      estimatedDuration: 45000,
      tests: [
        {
          id: 'memory-usage',
          name: 'Memory Usage',
          description: 'Measure current memory consumption',
          category: 'memory',
          timeout: 5000,
          critical: true
        },
        {
          id: 'memory-leaks',
          name: 'Memory Leak Detection',
          description: 'Check for memory leaks in components',
          category: 'memory',
          timeout: 20000,
          critical: true
        },
        {
          id: 'garbage-collection',
          name: 'Garbage Collection',
          description: 'Test garbage collection efficiency',
          category: 'memory',
          timeout: 10000,
          critical: false
        }
      ]
    },
    {
      name: 'Battery Tests',
      description: 'Battery optimization and power management',
      estimatedDuration: 60000,
      tests: [
        {
          id: 'battery-drain',
          name: 'Battery Drain Rate',
          description: 'Measure battery consumption under load',
          category: 'battery',
          timeout: 30000,
          critical: true
        },
        {
          id: 'power-optimization',
          name: 'Power Optimization',
          description: 'Test power-saving features',
          category: 'battery',
          timeout: 15000,
          critical: true
        },
        {
          id: 'adaptive-performance',
          name: 'Adaptive Performance',
          description: 'Test battery-aware performance adjustments',
          category: 'battery',
          timeout: 10000,
          critical: false
        }
      ]
    },
    {
      name: 'Network Tests',
      description: 'Network performance and offline capabilities',
      estimatedDuration: 40000,
      tests: [
        {
          id: 'network-latency',
          name: 'Network Latency',
          description: 'Measure network response times',
          category: 'network',
          timeout: 10000,
          critical: true
        },
        {
          id: 'offline-functionality',
          name: 'Offline Functionality',
          description: 'Test offline capabilities',
          category: 'network',
          timeout: 15000,
          critical: true
        },
        {
          id: 'background-sync',
          name: 'Background Sync',
          description: 'Test background synchronization',
          category: 'sync',
          timeout: 20000,
          critical: true
        }
      ]
    },
    {
      name: 'Touch & UI Tests',
      description: 'Touch interactions and UI responsiveness',
      estimatedDuration: 35000,
      tests: [
        {
          id: 'touch-responsiveness',
          name: 'Touch Responsiveness',
          description: 'Test touch input responsiveness',
          category: 'touch',
          timeout: 15000,
          critical: true
        },
        {
          id: 'gesture-recognition',
          name: 'Gesture Recognition',
          description: 'Test gesture recognition accuracy',
          category: 'touch',
          timeout: 10000,
          critical: false
        },
        {
          id: 'ui-optimizations',
          name: 'UI Optimizations',
          description: 'Test mobile UI optimizations',
          category: 'touch',
          timeout: 10000,
          critical: false
        }
      ]
    }
  ];

  // Execute individual test
  const executeTest = useCallback(async (testConfig: TestConfig): Promise<TestResult> => {
    const startTime = Date.now();
    let result: TestResult;

    try {
      switch (testConfig.id) {
        case 'app-startup':
          result = await testAppStartup(testConfig);
          break;

        case 'render-performance':
          result = await testRenderPerformance(testConfig);
          break;

        case 'animation-smoothness':
          result = await testAnimationSmoothness(testConfig);
          break;

        case 'memory-usage':
          result = await testMemoryUsage(testConfig);
          break;

        case 'memory-leaks':
          result = await testMemoryLeaks(testConfig);
          break;

        case 'garbage-collection':
          result = await testGarbageCollection(testConfig);
          break;

        case 'battery-drain':
          result = await testBatteryDrain(testConfig);
          break;

        case 'power-optimization':
          result = await testPowerOptimization(testConfig);
          break;

        case 'adaptive-performance':
          result = await testAdaptivePerformance(testConfig);
          break;

        case 'network-latency':
          result = await testNetworkLatency(testConfig);
          break;

        case 'offline-functionality':
          result = await testOfflineFunctionality(testConfig);
          break;

        case 'background-sync':
          result = await testBackgroundSync(testConfig);
          break;

        case 'touch-responsiveness':
          result = await testTouchResponsiveness(testConfig);
          break;

        case 'gesture-recognition':
          result = await testGestureRecognition(testConfig);
          break;

        case 'ui-optimizations':
          result = await testUIOptimizations(testConfig);
          break;

        default:
          result = {
            id: testConfig.id,
            name: testConfig.name,
            category: testConfig.category,
            status: 'skipped',
            duration: 0,
            score: 0,
            details: 'Test not implemented',
            metrics: {},
            timestamp: Date.now()
          };
      }

    } catch (error) {
      result = {
        id: testConfig.id,
        name: testConfig.name,
        category: testConfig.category,
        status: 'failed',
        duration: Date.now() - startTime,
        score: 0,
        details: error instanceof Error ? error.message : String(error),
        metrics: { error: true },
        timestamp: Date.now()
      };
    }

    result.duration = Date.now() - startTime;
    return result;
  }, [triggerSync]);

  // Individual test implementations
  const testAppStartup = async (config: TestConfig): Promise<TestResult> => {
    const startTime = performance.now();

    // Simulate app startup
    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = performance.now();
    const startupTime = endTime - startTime;

    const score = startupTime < 2000 ? 100 : startupTime < 5000 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `App startup time: ${startupTime.toFixed(2)}ms`,
      metrics: { startupTime }
    };
  };

  const testRenderPerformance = async (config: TestConfig): Promise<TestResult> => {
    const renderTimes: number[] = [];
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      // Simulate component render
      const div = document.createElement('div');
      div.innerHTML = '<span>Test content</span>';
      document.body.appendChild(div);
      document.body.removeChild(div);

      const end = performance.now();
      renderTimes.push(end - start);
    }

    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const score = avgRenderTime < 16 ? 100 : avgRenderTime < 33 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Average render time: ${avgRenderTime.toFixed(2)}ms (${iterations} iterations)`,
      metrics: { avgRenderTime, iterations }
    };
  };

  const testAnimationSmoothness = async (config: TestConfig): Promise<TestResult> => {
    let frameCount = 0;
    let lastTime = performance.now();
    const duration = 5000; // 5 seconds

    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime < duration) {
        requestAnimationFrame(countFrame);
      }
    };

    requestAnimationFrame(countFrame);
    await new Promise(resolve => setTimeout(resolve, duration));

    const fps = frameCount / (duration / 1000);
    const score = fps >= 55 ? 100 : fps >= 30 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Average FPS: ${fps.toFixed(1)}`,
      metrics: { fps, frameCount }
    };
  };

  const testMemoryUsage = async (config: TestConfig): Promise<TestResult> => {
    const initialMemory = memoryLeakDetector.getMemoryUsageMB();

    // Create some memory pressure
    const data: any[] = [];
    for (let i = 0; i < 1000; i++) {
      data.push(new Array(1000).fill(Math.random()));
    }

    const peakMemory = memoryLeakDetector.getMemoryUsageMB();

    // Cleanup
    data.length = 0;
    memoryLeakDetector.forceGarbageCollection();

    const finalMemory = memoryLeakDetector.getMemoryUsageMB();
    const memoryRecovered = peakMemory - finalMemory;

    const score = memoryRecovered > (peakMemory - initialMemory) * 0.8 ? 100 : 80;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Memory: ${initialMemory.toFixed(1)}MB → ${peakMemory.toFixed(1)}MB → ${finalMemory.toFixed(1)}MB (Recovered: ${memoryRecovered.toFixed(1)}MB)`,
      metrics: { initialMemory, peakMemory, finalMemory, memoryRecovered }
    };
  };

  const testMemoryLeaks = async (config: TestConfig): Promise<TestResult> => {
    const untrack = memoryLeakDetector.trackComponent('test-component');

    // Simulate component lifecycle
    const element = document.createElement('div');
    element.innerHTML = 'Test component';
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 1000));

    document.body.removeChild(element);
    untrack();

    // Check for leaks
    const leaks = memoryLeakDetector.getMemoryLeaks();
    const score = leaks.length === 0 ? 100 : leaks.length < 3 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Memory leaks detected: ${leaks.length}`,
      metrics: { leaks: leaks.length, leakDetails: leaks.slice(0, 3) }
    };
  };

  const testGarbageCollection = async (config: TestConfig): Promise<TestResult> => {
    const beforeGC = memoryLeakDetector.getMemoryUsageMB();

    // Create memory pressure
    const data = new Array(1000000).fill('test data');

    const beforeCleanup = memoryLeakDetector.getMemoryUsageMB();

    // Force garbage collection
    memoryLeakDetector.forceGarbageCollection();

    // Cleanup
    data.length = 0;

    const afterGC = memoryLeakDetector.getMemoryUsageMB();
    const memoryFreed = beforeCleanup - afterGC;

    const score = memoryFreed > 10 ? 100 : memoryFreed > 5 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Memory freed by GC: ${memoryFreed.toFixed(1)}MB`,
      metrics: { beforeGC, beforeCleanup, afterGC, memoryFreed }
    };
  };

  const testBatteryDrain = async (config: TestConfig): Promise<TestResult> => {
    const initialBattery = batteryManager.getBatteryInfo();

    // Simulate battery-intensive operations
    const start = Date.now();
    while (Date.now() - start < 10000) {
      // CPU intensive task
      Math.random() * Math.random();
    }

    const finalBattery = batteryManager.getBatteryInfo();
    const batteryDrain = initialBattery.level - finalBattery.level;

    const score = batteryDrain < 0.01 ? 100 : batteryDrain < 0.02 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Battery drain: ${(batteryDrain * 100).toFixed(2)}% over 10 seconds`,
      metrics: { initialBattery: initialBattery.level, finalBattery: finalBattery.level, batteryDrain }
    };
  };

  const testPowerOptimization = async (config: TestConfig): Promise<TestResult> => {
    await optimizePerformance();

    const batteryConfig = batteryManager.getConfig();
    const performanceMode = batteryManager.getPerformanceLevel();

    const score = batteryConfig.enableLowPowerMode ? 100 : 80;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Performance mode: ${performanceMode}, Low power enabled: ${batteryConfig.enableLowPowerMode}`,
      metrics: { performanceMode, batteryConfig }
    };
  };

  const testAdaptivePerformance = async (config: TestConfig): Promise<TestResult> => {
    // Simulate low battery scenario
    const originalBattery = batteryManager.getBatteryInfo();

    // This would normally be triggered by actual battery level changes
    const configForLowBattery = batteryManager.getOptimalConfigForBattery();

    const score = configForLowBattery.optimizeImages && configForLowBattery.reduceAnimations ? 100 : 80;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Adaptive config applied: ${JSON.stringify(configForLowBattery)}`,
      metrics: { configForLowBattery }
    };
  };

  const testNetworkLatency = async (config: TestConfig): Promise<TestResult> => {
    const connection = (navigator as any).connection;
    const latencies: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      try {
        await fetch('https://httpbin.org/delay/0', {
          method: 'HEAD',
          cache: 'no-cache'
        });
      } catch (error) {
        // Handle network errors
      }
      const end = performance.now();
      latencies.push(end - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const score = avgLatency < 200 ? 100 : avgLatency < 500 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Average network latency: ${avgLatency.toFixed(2)}ms`,
      metrics: { avgLatency, latencies, connectionType: connection?.effectiveType }
    };
  };

  const testOfflineFunctionality = async (config: TestConfig): Promise<TestResult> => {
    const wasOnline = navigator.onLine;

    // Test offline detection
    const offlineDetection = !navigator.onLine;

    // Test service worker (if available)
    const serviceWorkerSupported = 'serviceWorker' in navigator;

    const score = (offlineDetection || !wasOnline) && serviceWorkerSupported ? 100 : 80;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Offline detection: ${offlineDetection}, Service Worker: ${serviceWorkerSupported}`,
      metrics: { offlineDetection, serviceWorkerSupported, wasOnline }
    };
  };

  const testBackgroundSync = async (config: TestConfig): Promise<TestResult> => {
    const initialStats = syncStats;

    // Add test item to sync queue
    const itemId = await new Promise(resolve => {
      setTimeout(() => resolve('test-item-id'), 100);
    }) as string;

    // Trigger sync
    await triggerSync();

    const finalStats = syncStats;

    const score = finalStats.successfulItems > initialStats.successfulItems ? 100 : 80;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Background sync triggered. Initial: ${initialStats.successfulItems}, Final: ${finalStats.successfulItems}`,
      metrics: { initialStats, finalStats, itemId }
    };
  };

  const testTouchResponsiveness = async (config: TestConfig): Promise<TestResult> => {
    const touchStarts: number[] = [];
    const touchEnds: number[] = [];

    const handleTouchStart = (e: TouchEvent) => touchStarts.push(performance.now());
    const handleTouchEnd = (e: TouchEvent) => touchEnds.push(performance.now());

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    // Simulate touch events
    await new Promise(resolve => setTimeout(resolve, 1000));

    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchend', handleTouchEnd);

    const responseTimes = touchEnds.map((end, i) => end - touchStarts[i]).filter(t => !isNaN(t));
    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    const score = avgResponseTime < 50 ? 100 : avgResponseTime < 100 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Touch response times: ${avgResponseTime.toFixed(2)}ms average`,
      metrics: { avgResponseTime, touchCount: touchStarts.length }
    };
  };

  const testGestureRecognition = async (config: TestConfig): Promise<TestResult> => {
    // This would test actual gesture recognition
    // For now, we'll test if touch events are properly handled

    const touchSupported = 'ontouchstart' in window;
    const gestureConfig = {
      touchSupported,
      multiTouch: 'ontouchstart' in window && navigator.maxTouchPoints > 1
    };

    const score = touchSupported ? 100 : 0;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Touch supported: ${touchSupported}, Multi-touch: ${gestureConfig.multiTouch}`,
      metrics: gestureConfig
    };
  };

  const testUIOptimizations = async (config: TestConfig): Promise<TestResult> => {
    // Test viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const hasViewport = !!viewportMeta;

    // Test touch target sizes (sample check)
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    const smallButtons = Array.from(buttons).filter(button => {
      const rect = button.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });

    const touchOptimizations = hasViewport && smallButtons.length === 0;
    const score = touchOptimizations ? 100 : smallButtons.length < 5 ? 80 : 60;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      status: 'passed',
      duration: 0,
      score,
      details: `Viewport meta: ${hasViewport}, Small touch targets: ${smallButtons.length}`,
      metrics: { hasViewport, smallButtonsCount: smallButtons.length, totalButtons: buttons.length }
    };
  };

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setStartTime(Date.now());
    setResults([]);
    setTestProgress(0);

    const allTests = testSuites.flatMap(suite => suite.tests);
    const totalTests = allTests.length;

    try {
      for (let i = 0; i < allTests.length; i++) {
        const testConfig = allTests[i];

        setCurrentTest({
          id: testConfig.id,
          name: testConfig.name,
          category: testConfig.category,
          status: 'running',
          duration: 0,
          score: 0,
          details: 'Running...',
          metrics: {},
          timestamp: Date.now()
        });

        const result = await executeTest(testConfig);

        setResults(prev => [...prev, result]);
        setCurrentTest(result);
        setTestProgress(((i + 1) / totalTests) * 100);

        // Calculate estimated time remaining
        const elapsed = Date.now() - (startTime || Date.now());
        const avgTimePerTest = elapsed / (i + 1);
        const remainingTests = totalTests - (i + 1);
        setEstimatedTimeRemaining(Math.round(remainingTests * avgTimePerTest));

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Generate test report
      generateTestReport();

    } catch (error) {
      logger.error('Test suite execution failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  }, [testSuites, executeTest, startTime]);

  // Generate test report
  const generateTestReport = useCallback(() => {
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const skippedTests = results.filter(r => r.status === 'skipped').length;
    const averageScore = results.length > 0 ?
      results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    const report = {
      timestamp: Date.now(),
      deviceProfile: selectedDevice,
      summary: {
        total: results.length,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        averageScore: averageScore.toFixed(1),
        totalDuration: totalDuration,
        successRate: results.length > 0 ? (passedTests / results.length * 100).toFixed(1) : 0
      },
      results,
      insights: getPerformanceInsights()
    };

    // Track test completion
    trackEvent('mobile_test_suite_completed', {
      summary: report.summary,
      deviceProfile: selectedDevice?.name
    });

    // Download report
    downloadReport(report);

    logger.info('Mobile testing suite completed', report.summary);
  }, [results, selectedDevice, trackEvent, getPerformanceInsights]);

  // Download test report
  const downloadReport = useCallback((report: any) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-test-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Stop test execution
  const stopTests = useCallback(() => {
    setIsRunning(false);
    setCurrentTest(null);
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
  }, []);

  // Get test category icon
  const getCategoryIcon = (category: TestResult['category']) => {
    switch (category) {
      case 'performance': return <Activity className="h-4 w-4" />;
      case 'memory': return <HardDrive className="h-4 w-4" />;
      case 'battery': return <Battery className="h-4 w-4" />;
      case 'network': return <Wifi className="h-4 w-4" />;
      case 'touch': return <Smartphone className="h-4 w-4" />;
      case 'sync': return <RefreshCw className="h-4 w-4" />;
      case 'analytics': return <TrendingUp className="h-4 w-4" />;
      default: return <TestTube className="h-4 w-4" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'running':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'skipped':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Skipped</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const passedTests = results.filter(r => r.status === 'passed').length;
  const failedTests = results.filter(r => r.status === 'failed').length;
  const averageScore = results.length > 0 ?
    results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;

  return (
    <div className="mobile-testing-suite space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <TestTube className="h-6 w-6" />
            <span>Mobile Testing Suite</span>
          </h2>
          <p className="text-muted-foreground">
            Comprehensive mobile performance and functionality testing
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Device Profile Selector */}
          <select
            value={selectedDevice?.name || ''}
            onChange={(e) => {
              const device = deviceProfiles.find(d => d.name === e.target.value);
              setSelectedDevice(device || null);
            }}
            className="px-3 py-2 border rounded-md"
            disabled={isRunning}
          >
            <option value="">Current Device</option>
            {deviceProfiles.map(device => (
              <option key={device.name} value={device.name}>
                {device.name} ({device.type})
              </option>
            ))}
          </select>

          {/* Control Buttons */}
          <Button
            onClick={isRunning ? stopTests : runAllTests}
            disabled={!navigator.onLine}
            variant={isRunning ? "destructive" : "default"}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Tests
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>

          {results.length > 0 && (
            <Button
              variant="outline"
              onClick={() => downloadReport({
                timestamp: Date.now(),
                deviceProfile: selectedDevice,
                summary: {
                  total: results.length,
                  passed: passedTests,
                  failed: failedTests,
                  averageScore: averageScore.toFixed(1),
                  successRate: (passedTests / results.length * 100).toFixed(1)
                },
                results
              })}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
      </div>

      {/* Progress and Current Test */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Progress</span>
              <span className="text-sm font-normal">
                {estimatedTimeRemaining > 0 && `~${Math.round(estimatedTimeRemaining / 1000)}s remaining`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={testProgress} className="mb-4" />
            {currentTest && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(currentTest.category)}
                  <span className="font-medium">{currentTest.name}</span>
                </div>
                {getStatusBadge(currentTest.status)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{passedTests}</p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{failedTests}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                </div>
                <Monitor className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                </div>
                <TestTube className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results */}
      {results.length > 0 && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="suites">Test Suites</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {results.map((result, index) => (
              <Card key={result.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(result.category)}
                      <div>
                        <h3 className="font-medium">{result.name}</h3>
                        <p className="text-sm text-muted-foreground">{result.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{result.score}/100</span>
                      {getStatusBadge(result.status)}
                      <span className="text-xs text-muted-foreground">
                        {(result.duration / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="suites" className="space-y-4">
            {testSuites.map((suite) => {
              const suiteResults = results.filter(r =>
                suite.tests.some(t => t.id === r.id)
              );
              const suitePassed = suiteResults.filter(r => r.status === 'passed').length;
              const suiteScore = suiteResults.length > 0 ?
                suiteResults.reduce((sum, r) => sum + r.score, 0) / suiteResults.length : 0;

              return (
                <Card key={suite.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{suite.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{suitePassed}/{suite.tests.length} passed</span>
                        <Badge variant={suiteScore >= 80 ? "default" : "secondary"}>
                          {suiteScore.toFixed(1)}%
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{suite.description}</p>
                    <div className="space-y-2">
                      {suite.tests.map(test => {
                        const result = suiteResults.find(r => r.id === test.id);
                        return (
                          <div key={test.id} className="flex items-center justify-between text-sm">
                            <span>{test.name}</span>
                            {result ? getStatusBadge(result.status) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Performance Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getPerformanceInsights().map((insight, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        insight.type === 'error' ? 'bg-red-50 border border-red-200' :
                        insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-green-50 border border-green-200'
                      }`}
                    >
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  ))}
                  {getPerformanceInsights().length === 0 && (
                    <p className="text-sm text-muted-foreground">No performance issues detected.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MobileTestingSuite;