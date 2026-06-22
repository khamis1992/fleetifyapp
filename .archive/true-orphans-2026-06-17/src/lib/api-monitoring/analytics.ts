/**
 * API Monitoring Analytics
 * Advanced analytics and insights for API performance and usage patterns
 */

import type {
  APIMetrics,
  APIEndpoint,
  PerformanceReport,
  OptimizationRecommendation,
  ErrorAnalysis,
  PerformanceTrend,
  TimeWindow,
} from '@/types/api-monitoring';
import { apiMonitor } from './monitor';

export class APIMonitoringAnalytics {
  private static instance: APIMonitoringAnalytics;

  static getInstance(): APIMonitoringAnalytics {
    if (!APIMonitoringAnalytics.instance) {
      APIMonitoringAnalytics.instance = new APIMonitoringAnalytics();
    }
    return APIMonitoringAnalytics.instance;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    timeRange: { start: Date; end: Date },
    endpoints?: string[]
  ): Promise<PerformanceReport> {
    const now = new Date();
    const reportId = `report_${now.getTime()}`;

    // Get metrics for the specified time range
    const allMetrics = apiMonitor.getMetrics(undefined, this.getTimeWindowFromRange(timeRange));

    // Executive summary
    const summary = {
      totalRequests: allMetrics.totalRequests,
      averageResponseTime: allMetrics.averageResponseTime,
      errorRate: allMetrics.errorRate,
      uptime: this.calculateUptime(timeRange),
      score: this.calculateHealthScore(allMetrics),
    };

    // Endpoint breakdown
    const endpointReports = await this.generateEndpointReports(timeRange, endpoints);

    // Error analysis
    const errorAnalysis = await this.analyzeErrors(timeRange, endpoints);

    // Performance trends
    const performanceTrends = await this.analyzeTrends(timeRange, endpoints);

    // Recommendations
    const recommendations = await this.generateRecommendations(endpointReports, errorAnalysis);

    // Comparative analysis (if we have historical data)
    const compareToPrevious = await this.generateComparison(timeRange);

    return {
      id: reportId,
      generatedAt: now,
      timeRange,
      summary,
      endpointBreakdown: endpointReports,
      errorAnalysis,
      performanceTrends,
      recommendations,
      compareToPrevious,
    };
  }

  /**
   * Analyze performance trends over time
   */
  async analyzeTrends(
    timeRange: { start: Date; end: Date },
    endpoints?: string[]
  ): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];
    const metrics = ['responseTime', 'throughput', 'errorRate', 'dataTransferred'];

    for (const metric of metrics) {
      const data = await this.getTimeSeriesData(metric, timeRange, endpoints);
      const analysis = this.analyzeTrendData(data);

      trends.push({
        metric,
        timeframe: this.getTimeRangeString(timeRange),
        data,
        trend: analysis.trend,
        changeRate: analysis.changeRate,
        significance: analysis.significance,
      });
    }

    return trends;
  }

  /**
   * Analyze error patterns and frequencies
   */
  async analyzeErrors(
    timeRange: { start: Date; end: Date },
    endpoints?: string[]
  ): Promise<ErrorAnalysis> {
    // Get error data for the time range
    const errorData = await this.getErrorData(timeRange, endpoints);

    const totalErrors = errorData.length;
    const totalRequests = await this.getTotalRequests(timeRange, endpoints);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Breakdown by category
    const byCategory = this.categorizeErrors(errorData);

    // Breakdown by status code
    const byStatus = this.groupErrorsByStatus(errorData);

    // Top errors
    const topErrors = this.getTopErrors(errorData);

    return {
      totalErrors,
      errorRate,
      byCategory,
      byStatus,
      topErrors,
    };
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations(
    endpointReports: any[],
    errorAnalysis: ErrorAnalysis
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance recommendations
    recommendations.push(...this.generatePerformanceRecommendations(endpointReports));

    // Error handling recommendations
    recommendations.push(...this.generateErrorRecommendations(errorAnalysis));

    // Security recommendations
    recommendations.push(...this.generateSecurityRecommendations(endpointReports));

    // Cost optimization recommendations
    recommendations.push(...this.generateCostRecommendations(endpointReports));

    // Sort by priority and impact
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        // If same priority, sort by combined impact
        const aImpact = a.impact.performance + a.impact.reliability + a.impact.cost;
        const bImpact = b.impact.performance + b.impact.reliability + b.impact.cost;
        return bImpact - aImpact;
      });
  }

  /**
   * Detect anomalies in API performance
   */
  async detectAnomalies(
    timeRange: { start: Date; end: Date },
    threshold: number = 2.5
  ): Promise<Array<{
    timestamp: Date;
    metric: string;
    value: number;
    expectedValue: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>> {
    const anomalies = [];
    const metrics = ['responseTime', 'throughput', 'errorRate'];

    for (const metric of metrics) {
      const data = await this.getTimeSeriesData(metric, timeRange);
      const metricAnomalies = this.detectAnomaliesInData(data, threshold);

      anomalies.push(...metricAnomalies.map(anomaly => ({
        ...anomaly,
        metric,
      })));
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Predict future performance based on historical data
   */
  async predictPerformance(
    metric: string,
    futurePeriod: TimeWindow
  ): Promise<{
    predictions: Array<{ timestamp: Date; predictedValue: number; confidence: number }>;
    modelAccuracy: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  }> {
    // Get historical data for the last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const historicalData = await this.getTimeSeriesData(metric, { start: startDate, end: endDate });

    // Use linear regression for prediction
    const predictions = this.linearRegressionPrediction(historicalData, futurePeriod);

    // Calculate model accuracy
    const modelAccuracy = this.calculatePredictionAccuracy(historicalData);

    // Determine trend direction
    const trendDirection = this.determineTrendDirection(historicalData);

    return {
      predictions,
      modelAccuracy,
      trendDirection,
    };
  }

  /**
   * Analyze API usage patterns and insights
   */
  async analyzeUsagePatterns(
    timeRange: { start: Date; end: Date }
  ): Promise<{
    topEndpoints: Array<{ endpoint: string; requests: number; percentage: number }>;
    peakHours: Array<{ hour: number; requests: number }>;
    userPatterns: Array<{ userId: string; requests: number; endpoints: string[] }>;
    geographicPatterns: Array<{ country: string; requests: number; avgResponseTime: number }>;
    devicePatterns: Array<{ device: string; requests: number; avgResponseTime: number }>;
  }> {
    // This would require access to detailed request logs
    // For now, return placeholder data
    return {
      topEndpoints: [
        { endpoint: '/api/vehicles', requests: 1000, percentage: 35.2 },
        { endpoint: '/api/contracts', requests: 800, percentage: 28.1 },
        { endpoint: '/api/customers', requests: 600, percentage: 21.1 },
        { endpoint: '/api/payments', requests: 445, percentage: 15.6 },
      ],
      peakHours: [
        { hour: 10, requests: 250 },
        { hour: 14, requests: 320 },
        { hour: 16, requests: 280 },
        { hour: 18, requests: 190 },
      ],
      userPatterns: [
        { userId: 'user1', requests: 150, endpoints: ['/api/vehicles', '/api/contracts'] },
        { userId: 'user2', requests: 120, endpoints: ['/api/customers', '/api/payments'] },
      ],
      geographicPatterns: [
        { country: 'US', requests: 1200, avgResponseTime: 150 },
        { country: 'GB', requests: 800, avgResponseTime: 180 },
        { country: 'CA', requests: 600, avgResponseTime: 200 },
      ],
      devicePatterns: [
        { device: 'desktop', requests: 1800, avgResponseTime: 150 },
        { device: 'mobile', requests: 1000, avgResponseTime: 200 },
        { device: 'tablet', requests: 45, avgResponseTime: 180 },
      ],
    };
  }

  // Private helper methods

  private getTimeWindowFromRange(range: { start: Date; end: Date }): TimeWindow {
    const durationMs = range.end.getTime() - range.start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours <= 1) return '1h';
    if (durationHours <= 6) return '6h';
    if (durationHours <= 12) return '12h';
    return '24h';
  }

  private getTimeRangeString(range: { start: Date; end: Date }): string {
    const durationMs = range.end.getTime() - range.start.getTime();
    const durationHours = Math.round(durationMs / (1000 * 60 * 60));

    if (durationHours <= 24) return `${durationHours}h`;
    const durationDays = Math.round(durationHours / 24);
    return `${durationDays}d`;
  }

  private calculateUptime(timeRange: { start: Date; end: Date }): number {
    // This would require detailed uptime data
    // For now, assume 99.9% uptime
    return 99.9;
  }

  private calculateHealthScore(metrics: APIMetrics): number {
    let score = 100;

    // Penalize high error rates
    if (metrics.errorRate > 0.1) {
      score -= 50;
    } else if (metrics.errorRate > 0.05) {
      score -= 25;
    } else if (metrics.errorRate > 0.01) {
      score -= 10;
    }

    // Penalize slow response times
    if (metrics.averageResponseTime > 5000) {
      score -= 30;
    } else if (metrics.averageResponseTime > 2000) {
      score -= 15;
    } else if (metrics.averageResponseTime > 1000) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  private async generateEndpointReports(
    timeRange: { start: Date; end: Date },
    endpoints?: string[]
  ): Promise<any[]> {
    // This would generate detailed reports for each endpoint
    // For now, return placeholder data
    return [
      {
        endpoint: '/api/vehicles',
        method: 'GET',
        requests: 1000,
        averageResponseTime: 150,
        p95ResponseTime: 300,
        p99ResponseTime: 500,
        errorRate: 0.02,
        throughput: 16.7,
        rank: {
          byRequests: 1,
          byResponseTime: 3,
          byErrors: 2,
        },
        slowQueries: [],
        errorPatterns: [],
      },
    ];
  }

  private async getTimeSeriesData(
    metric: string,
    timeRange: { start: Date; end: Date },
    endpoints?: string[]
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    // This would fetch time series data from the monitoring database
    // For now, generate sample data
    const data = [];
    const interval = 60 * 60 * 1000; // 1 hour intervals
    let currentTime = timeRange.start.getTime();

    while (currentTime <= timeRange.end.getTime()) {
      const timestamp = new Date(currentTime);
      let value = 0;

      switch (metric) {
        case 'responseTime':
          value = 150 + Math.random() * 100;
          break;
        case 'throughput':
          value = 50 + Math.random() * 100;
          break;
        case 'errorRate':
          value = Math.random() * 0.1;
          break;
        case 'dataTransferred':
          value = 1000000 + Math.random() * 500000;
          break;
      }

      data.push({ timestamp, value });
      currentTime += interval;
    }

    return data;
  }

  private analyzeTrendData(data: Array<{ timestamp: Date; value: number }>): {
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
    significance: 'high' | 'medium' | 'low';
  } {
    if (data.length < 2) {
      return { trend: 'stable', changeRate: 0, significance: 'low' };
    }

    // Simple linear regression
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, index) => {
      sumX += index;
      sumY += point.value;
      sumXY += index * point.value;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;
    const changeRate = (slope / avgValue) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(changeRate) > 5) {
      trend = changeRate > 0 ? 'increasing' : 'decreasing';
    }

    let significance: 'high' | 'medium' | 'low' = 'low';
    if (Math.abs(changeRate) > 20) {
      significance = 'high';
    } else if (Math.abs(changeRate) > 10) {
      significance = 'medium';
    }

    return { trend, changeRate, significance };
  }

  private categorizeErrors(errors: any[]): Record<string, any> {
    const categories: Record<string, { count: number; percentage: number; trend: string }> = {};

    // This would categorize actual error data
    // For now, return sample categorization
    return {
      authentication: { count: 10, percentage: 20, trend: 'decreasing' },
      validation: { count: 15, percentage: 30, trend: 'stable' },
      server_error: { count: 20, percentage: 40, trend: 'increasing' },
      network: { count: 5, percentage: 10, trend: 'stable' },
    };
  }

  private groupErrorsByStatus(errors: any[]): Record<number, number> {
    const statusGroups: Record<number, number> = {};

    // This would group actual error data by status code
    // For now, return sample grouping
    return {
      400: 15,
      401: 10,
      404: 8,
      500: 12,
      502: 5,
    };
  }

  private getTopErrors(errors: any[]): Array<{
    message: string;
    count: number;
    percentage: number;
    trend: string;
  }> {
    // This would analyze actual error messages
    // For now, return sample top errors
    return [
      { message: 'Database connection timeout', count: 8, percentage: 16, trend: 'increasing' },
      { message: 'Invalid request parameters', count: 12, percentage: 24, trend: 'stable' },
      { message: 'Authentication failed', count: 6, percentage: 12, trend: 'decreasing' },
    ];
  }

  private generatePerformanceRecommendations(endpointReports: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const report of endpointReports) {
      if (report.averageResponseTime > 1000) {
        recommendations.push({
          id: `perf_${report.endpoint}_${Date.now()}`,
          priority: 'high',
          category: 'performance',
          title: `Optimize slow endpoint: ${report.endpoint}`,
          description: `Endpoint ${report.endpoint} has an average response time of ${report.averageResponseTime}ms, which exceeds the 1000ms threshold.`,
          impact: {
            performance: Math.min(50, (report.averageResponseTime - 1000) / report.averageResponseTime * 100),
            reliability: 20,
            cost: 15,
          },
          effort: 'medium',
          estimatedTime: '2-4 hours',
          complexity: 6,
          endpoints: [report.endpoint],
          evidence: [{
            metric: 'averageResponseTime',
            currentValue: report.averageResponseTime,
            targetValue: 500,
            confidence: 85,
          }],
          generatedAt: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      }
    }

    return recommendations;
  }

  private generateErrorRecommendations(errorAnalysis: ErrorAnalysis): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (errorAnalysis.errorRate > 0.05) {
      recommendations.push({
        id: `error_${Date.now()}`,
        priority: 'high',
        category: 'reliability',
        title: 'Reduce high error rate',
        description: `The API error rate is ${(errorAnalysis.errorRate * 100).toFixed(2)}%, which exceeds the 5% threshold.`,
        impact: {
          performance: 10,
          reliability: 40,
          cost: 5,
        },
        effort: 'medium',
        estimatedTime: '4-8 hours',
        complexity: 7,
        endpoints: [],
        evidence: [{
          metric: 'errorRate',
          currentValue: errorAnalysis.errorRate,
          targetValue: 0.02,
          confidence: 90,
        }],
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return recommendations;
  }

  private generateSecurityRecommendations(endpointReports: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for endpoints without rate limiting
    const endpointsWithoutRateLimit = endpointReports.filter(report =>
      report.method === 'POST' && !report.rateLimitEnabled
    );

    if (endpointsWithoutRateLimit.length > 0) {
      recommendations.push({
        id: `security_${Date.now()}`,
        priority: 'medium',
        category: 'security',
        title: 'Implement rate limiting for POST endpoints',
        description: `${endpointsWithoutRateLimit.length} POST endpoints do not have rate limiting configured.`,
        impact: {
          performance: 5,
          reliability: 30,
          cost: 0,
        },
        effort: 'low',
        estimatedTime: '1-2 hours',
        complexity: 3,
        endpoints: endpointsWithoutRateLimit.map(e => e.endpoint),
        evidence: [{
          metric: 'rateLimitCoverage',
          currentValue: (endpointReports.length - endpointsWithoutRateLimit.length) / endpointReports.length,
          targetValue: 1.0,
          confidence: 95,
        }],
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    }

    return recommendations;
  }

  private generateCostRecommendations(endpointReports: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for endpoints returning excessive data
    const heavyEndpoints = endpointReports.filter(report =>
      report.averageResponseSize > 100000 // 100KB
    );

    if (heavyEndpoints.length > 0) {
      recommendations.push({
        id: `cost_${Date.now()}`,
        priority: 'medium',
        category: 'cost',
        title: 'Optimize data transfer for heavy endpoints',
        description: `${heavyEndpoints.length} endpoints are returning large amounts of data, increasing bandwidth costs.`,
        impact: {
          performance: 25,
          reliability: 5,
          cost: 30,
        },
        effort: 'medium',
        estimatedTime: '2-6 hours',
        complexity: 5,
        endpoints: heavyEndpoints.map(e => e.endpoint),
        evidence: [{
          metric: 'averageDataTransferred',
          currentValue: heavyEndpoints[0].averageResponseSize,
          targetValue: 50000, // 50KB
          confidence: 80,
        }],
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });
    }

    return recommendations;
  }

  private detectAnomaliesInData(
    data: Array<{ timestamp: Date; value: number }>,
    threshold: number
  ): Array<{
    timestamp: Date;
    value: number;
    expectedValue: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> {
    const anomalies = [];

    // Calculate moving average and standard deviation
    const windowSize = Math.min(10, Math.floor(data.length / 3));

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const values = window.map(point => point.value);

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const currentPoint = data[i];
      const zScore = Math.abs((currentPoint.value - mean) / stdDev);

      if (zScore > threshold) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (zScore > 4) severity = 'critical';
        else if (zScore > 3) severity = 'high';
        else if (zScore > 2) severity = 'medium';

        anomalies.push({
          timestamp: currentPoint.timestamp,
          value: currentPoint.value,
          expectedValue: mean,
          severity,
          description: `Value ${currentPoint.value} is ${zScore.toFixed(2)} standard deviations from the mean`,
        });
      }
    }

    return anomalies;
  }

  private linearRegressionPrediction(
    historicalData: Array<{ timestamp: Date; value: number }>,
    futurePeriod: TimeWindow
  ): Array<{ timestamp: Date; predictedValue: number; confidence: number }> {
    const n = historicalData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    historicalData.forEach((point, index) => {
      sumX += index;
      sumY += point.value;
      sumXY += index * point.value;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions for future period
    const predictions = [];
    const futureMs = this.getTimeWindowMs(futurePeriod);
    const predictionSteps = Math.ceil(futureMs / (60 * 60 * 1000)); // Hourly predictions

    for (let i = 1; i <= predictionSteps; i++) {
      const futureX = n + i;
      const predictedValue = slope * futureX + intercept;
      const confidence = Math.max(0, 100 - (i / predictionSteps) * 50); // Decreasing confidence

      predictions.push({
        timestamp: new Date(historicalData[historicalData.length - 1].timestamp.getTime() + i * 60 * 60 * 1000),
        predictedValue,
        confidence,
      });
    }

    return predictions;
  }

  private calculatePredictionAccuracy(historicalData: Array<{ timestamp: Date; value: number }>): number {
    // Simple accuracy calculation based on variance
    const values = historicalData.map(point => point.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Accuracy decreases with higher variance
    return Math.max(0, 100 - (stdDev / mean) * 100);
  }

  private determineTrendDirection(data: Array<{ timestamp: Date; value: number }>): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent > 0 ? 'increasing' : 'decreasing';
  }

  private getTimeWindowMs(timeWindow: TimeWindow): number {
    const windows = {
      '1m': 1 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
    return windows[timeWindow] || windows['1h'];
  }

  private async getErrorData(timeRange: { start: Date; end: Date }, endpoints?: string[]): Promise<any[]> {
    // This would fetch actual error data from the monitoring database
    // For now, return sample error data
    return [
      { timestamp: new Date(), statusCode: 500, message: 'Database error', category: 'server_error' },
      { timestamp: new Date(), statusCode: 401, message: 'Auth failed', category: 'authentication' },
    ];
  }

  private async getTotalRequests(timeRange: { start: Date; end: Date }, endpoints?: string[]): Promise<number> {
    // This would fetch actual request count from the monitoring database
    // For now, return sample count
    return 10000;
  }

  private async generateComparison(timeRange: { start: Date; end: Date }) {
    // This would compare current period with previous period
    // For now, return placeholder comparison
    return {
      period: 'Previous 7 days',
      changePercentage: {
        totalRequests: 15.2,
        averageResponseTime: -8.5,
        errorRate: -25.3,
        throughput: 15.2,
      },
    };
  }
}

export const apiAnalytics = APIMonitoringAnalytics.getInstance();