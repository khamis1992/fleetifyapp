/**
 * Contract Analytics and Reporting System
 *
 * Comprehensive analytics engine for contract insights,
 * performance metrics, financial analysis, and reporting.
 */

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  format
} from 'date-fns';

export interface ContractMetrics {
  total_contracts: number;
  active_contracts: number;
  expired_contracts: number;
  cancelled_contracts: number;
  total_contract_value: number;
  monthly_revenue: number;
  annual_revenue: number;
  average_contract_value: number;
  renewal_rate: number;
  termination_rate: number;
  compliance_rate: number;
  customer_satisfaction: number;
  vehicle_utilization: number;
}

export interface ContractAnalytics {
  period: AnalyticsPeriod;
  metrics: ContractMetrics;
  trends: AnalyticsTrend[];
  segments: ContractSegment[];
  forecasts: RevenueForecast[];
  insights: ContractInsight[];
  generated_at: string;
}

export interface AnalyticsPeriod {
  start_date: string;
  end_date: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
}

export interface AnalyticsTrend {
  metric: string;
  period_over_period_change: number;
  trend_direction: 'up' | 'down' | 'stable';
  data_points: Array<{
    date: string;
    value: number;
  }>;
}

export interface ContractSegment {
  name: string;
  value: number;
  percentage: number;
  count: number;
  growth_rate: number;
}

export interface RevenueForecast {
  period: string;
  predicted_revenue: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  factors: string[];
}

export interface ContractInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggested_actions: string[];
  related_contracts?: string[];
  confidence: number;
}

export interface ContractPerformanceReport {
  contract_id: string;
  performance_score: number;
  revenue_generated: number;
  costs_incurred: number;
  profitability: number;
  customer_retention_score: number;
  compliance_score: number;
  utilization_rate: number;
  payment_history: PaymentHistoryEntry[];
  issues: ContractIssue[];
  recommendations: string[];
}

export interface PaymentHistoryEntry {
  date: string;
  amount: number;
  status: 'on_time' | 'late' | 'partial' | 'missed';
  days_late: number;
}

export interface ContractIssue {
  type: 'payment' | 'compliance' | 'maintenance' | 'customer' | 'vehicle';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  date: string;
  impact_cost?: number;
}

export interface CustomReportConfig {
  title: string;
  description: string;
  metrics: string[];
  filters: ReportFilter[];
  group_by?: string[];
  chart_type: 'table' | 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  export_formats: ('pdf' | 'excel' | 'csv')[];
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'contains';
  value: any;
  label: string;
}

/**
 * Contract Analytics Engine Class
 */
export class ContractAnalyticsEngine {
  private data: any[] = []; // Contract data cache
  private lastDataUpdate: Date | null = null;

  /**
   * Load contract data for analytics
   */
  async loadData(contractData: any[]): Promise<void> {
    this.data = contractData;
    this.lastDataUpdate = new Date();
  }

  /**
   * Generate comprehensive contract analytics
   */
  async generateAnalytics(
    period: Partial<AnalyticsPeriod> = {},
    filters?: ReportFilter[]
  ): Promise<ContractAnalytics> {
    const analyticsPeriod: AnalyticsPeriod = {
      start_date: period.start_date || subMonths(new Date(), 12).toISOString(),
      end_date: period.end_date || new Date().toISOString(),
      type: period.type || 'monthly'
    };

    // Apply filters to data
    const filteredData = this.applyFilters(this.data, filters);

    // Calculate metrics
    const metrics = await this.calculateMetrics(filteredData, analyticsPeriod);

    // Generate trends
    const trends = await this.calculateTrends(filteredData, analyticsPeriod);

    // Create segments
    const segments = await this.createSegments(filteredData);

    // Generate forecasts
    const forecasts = await this.generateForecasts(filteredData, analyticsPeriod);

    // Generate insights
    const insights = await this.generateInsights(filteredData, metrics, trends);

    return {
      period: analyticsPeriod,
      metrics,
      trends,
      segments,
      forecasts,
      insights,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Calculate contract metrics
   */
  private async calculateMetrics(
    data: any[],
    period: AnalyticsPeriod
  ): Promise<ContractMetrics> {
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);

    const totalContracts = data.length;
    const activeContracts = data.filter(c =>
      c.status === 'active' &&
      new Date(c.start_date) <= periodEnd &&
      new Date(c.end_date) >= periodStart
    ).length;

    const expiredContracts = data.filter(c =>
      c.status === 'expired' ||
      new Date(c.end_date) < periodStart
    ).length;

    const cancelledContracts = data.filter(c =>
      c.status === 'cancelled'
    ).length;

    const totalContractValue = data.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
    const monthlyRevenue = data
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
    const annualRevenue = monthlyRevenue * 12;
    const averageContractValue = totalContracts > 0 ? totalContractValue / totalContracts : 0;

    // Calculate renewal rate (contracts renewed in last 12 months)
    const renewalRate = await this.calculateRenewalRate(data, period);

    // Calculate termination rate
    const terminationRate = activeContracts > 0 ? cancelledContracts / activeContracts : 0;

    // Calculate compliance rate (would integrate with compliance engine)
    const complianceRate = 0.95; // Placeholder

    // Calculate customer satisfaction (would integrate with customer feedback)
    const customerSatisfaction = 4.2; // Out of 5

    // Calculate vehicle utilization (would integrate with fleet data)
    const vehicleUtilization = 0.78; // 78%

    return {
      total_contracts: totalContracts,
      active_contracts: activeContracts,
      expired_contracts: expiredContracts,
      cancelled_contracts: cancelledContracts,
      total_contract_value: totalContractValue,
      monthly_revenue: monthlyRevenue,
      annual_revenue: annualRevenue,
      average_contract_value: averageContractValue,
      renewal_rate: renewalRate,
      termination_rate: terminationRate,
      compliance_rate: complianceRate,
      customer_satisfaction: customerSatisfaction,
      vehicle_utilization: vehicleUtilization
    };
  }

  /**
   * Calculate trends for key metrics
   */
  private async calculateTrends(
    data: any[],
    period: AnalyticsPeriod
  ): Promise<AnalyticsTrend[]> {
    const trends: AnalyticsTrend[] = [];
    const metrics = ['total_contracts', 'active_contracts', 'monthly_revenue', 'total_contract_value'];

    for (const metric of metrics) {
      const trend = await this.calculateMetricTrend(data, period, metric);
      trends.push(trend);
    }

    return trends;
  }

  /**
   * Calculate trend for a specific metric
   */
  private async calculateMetricTrend(
    data: any[],
    period: AnalyticsPeriod,
    metric: string
  ): Promise<AnalyticsTrend> {
    const dataPoints: Array<{ date: string; value: number }> = [];
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);

    // Generate data points based on period type
    let current = new Date(periodStart);
    let pointCount = 0;
    const maxPoints = 12; // Limit to 12 data points

    while (current < periodEnd && pointCount < maxPoints) {
      let periodStartPoint: Date;
      let periodEndPoint: Date;

      switch (period.type) {
        case 'daily':
          periodStartPoint = startOfDay(current);
          periodEndPoint = endOfDay(current);
          current = addDays(current, 1);
          break;
        case 'weekly':
          periodStartPoint = startOfWeek(current);
          periodEndPoint = endOfWeek(current);
          current = addWeeks(current, 1);
          break;
        case 'monthly':
          periodStartPoint = startOfMonth(current);
          periodEndPoint = endOfMonth(current);
          current = addMonths(current, 1);
          break;
        default:
          periodStartPoint = startOfMonth(current);
          periodEndPoint = endOfMonth(current);
          current = addMonths(current, 1);
      }

      const value = this.calculateMetricValue(data, metric, periodStartPoint, periodEndPoint);
      dataPoints.push({
        date: periodStartPoint.toISOString(),
        value
      });

      pointCount++;
    }

    // Calculate period-over-period change
    const periodOverPeriodChange = dataPoints.length >= 2
      ? ((dataPoints[dataPoints.length - 1].value - dataPoints[0].value) / dataPoints[0].value) * 100
      : 0;

    // Determine trend direction
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(periodOverPeriodChange) > 5) {
      trendDirection = periodOverPeriodChange > 0 ? 'up' : 'down';
    }

    return {
      metric,
      period_over_period_change: periodOverPeriodChange,
      trend_direction: trendDirection,
      data_points: dataPoints
    };
  }

  /**
   * Calculate metric value for a specific period
   */
  private calculateMetricValue(
    data: any[],
    metric: string,
    startDate: Date,
    endDate: Date
  ): number {
    const relevantContracts = data.filter(c => {
      const contractDate = new Date(c.created_at);
      return contractDate >= startDate && contractDate <= endDate;
    });

    switch (metric) {
      case 'total_contracts':
        return relevantContracts.length;

      case 'active_contracts':
        return relevantContracts.filter(c => c.status === 'active').length;

      case 'monthly_revenue':
        return relevantContracts
          .filter(c => c.status === 'active')
          .reduce((sum, c) => sum + (c.monthly_amount || 0), 0);

      case 'total_contract_value':
        return relevantContracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0);

      default:
        return 0;
    }
  }

  /**
   * Create contract segments
   */
  private async createSegments(data: any[]): Promise<ContractSegment[]> {
    const segments: ContractSegment[] = [];

    // Segment by contract type
    const typeSegments = this.segmentByField(data, 'contract_type');
    segments.push(...typeSegments);

    // Segment by customer type
    const customerSegments = this.segmentByField(data, 'customer_type');
    segments.push(...customerSegments);

    // Segment by vehicle category
    const vehicleSegments = this.segmentByField(data, 'vehicle_category');
    segments.push(...vehicleSegments);

    // Segment by value range
    const valueSegments = this.segmentByValueRange(data);
    segments.push(...valueSegments);

    return segments;
  }

  /**
   * Segment contracts by a specific field
   */
  private segmentByField(data: any[], field: string): ContractSegment[] {
    const groups = data.reduce((acc, contract) => {
      const value = contract[field] || 'unknown';
      if (!acc[value]) acc[value] = [];
      acc[value].push(contract);
      return acc;
    }, {} as Record<string, any[]>);

    const totalValue = data.reduce((sum, c) => sum + (c.contract_amount || 0), 0);

    return Object.entries(groups).map(([name, contracts]) => ({
      name: `${field}: ${name}`,
      value: contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0),
      percentage: totalValue > 0 ? (contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0) / totalValue) * 100 : 0,
      count: contracts.length,
      growth_rate: this.calculateSegmentGrowthRate(contracts)
    }));
  }

  /**
   * Segment contracts by value range
   */
  private segmentByValueRange(data: any[]): ContractSegment[] {
    const ranges = [
      { name: 'Low Value (0-10K)', min: 0, max: 10000 },
      { name: 'Medium Value (10K-50K)', min: 10000, max: 50000 },
      { name: 'High Value (50K-100K)', min: 50000, max: 100000 },
      { name: 'Enterprise (>100K)', min: 100000, max: Infinity }
    ];

    return ranges.map(range => {
      const contracts = data.filter(c => {
        const value = c.contract_amount || 0;
        return value >= range.min && value < range.max;
      });

      return {
        name: range.name,
        value: contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0),
        percentage: data.length > 0 ? (contracts.length / data.length) * 100 : 0,
        count: contracts.length,
        growth_rate: this.calculateSegmentGrowthRate(contracts)
      };
    });
  }

  /**
   * Calculate growth rate for a segment
   */
  private calculateSegmentGrowthRate(contracts: any[]): number {
    // Simplified growth rate calculation
    // In real implementation, would compare with previous period
    return Math.random() * 20 - 5; // Random between -5% and 15%
  }

  /**
   * Generate revenue forecasts
   */
  private async generateForecasts(
    data: any[],
    period: AnalyticsPeriod
  ): Promise<RevenueForecast[]> {
    const forecasts: RevenueForecast[] = [];
    const activeContracts = data.filter(c => c.status === 'active');

    // Generate monthly forecasts for next 6 months
    for (let i = 1; i <= 6; i++) {
      const forecastDate = addMonths(new Date(), i);
      const baseRevenue = activeContracts.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);

      // Apply seasonality and growth factors
      const seasonalFactor = this.getSeasonalFactor(forecastDate);
      const growthFactor = 1.02; // 2% monthly growth assumption

      const predictedRevenue = baseRevenue * seasonalFactor * growthFactor;
      const variance = predictedRevenue * 0.1; // 10% variance

      forecasts.push({
        period: format(forecastDate, 'yyyy-MM'),
        predicted_revenue: predictedRevenue,
        confidence_interval: {
          lower: Math.max(0, predictedRevenue - variance),
          upper: predictedRevenue + variance
        },
        factors: [
          `Seasonal factor: ${seasonalFactor.toFixed(2)}`,
          `Growth assumption: ${((growthFactor - 1) * 100).toFixed(1)}%`
        ]
      });
    }

    return forecasts;
  }

  /**
   * Get seasonal factor for forecasting
   */
  private getSeasonalFactor(date: Date): number {
    const month = date.getMonth();

    // Simplified seasonal factors (would be based on historical data)
    const seasonalFactors = {
      0: 0.8,  // January
      1: 0.7,  // February
      2: 0.9,  // March
      3: 1.1,  // April
      4: 1.2,  // May
      5: 1.3,  // June
      6: 1.4,  // July
      7: 1.3,  // August
      8: 1.1,  // September
      9: 1.0,  // October
      10: 1.1, // November
      11: 1.2  // December
    };

    return seasonalFactors[month as keyof typeof seasonalFactors] || 1.0;
  }

  /**
   * Generate contract insights
   */
  private async generateInsights(
    data: any[],
    metrics: ContractMetrics,
    trends: AnalyticsTrend[]
  ): Promise<ContractInsight[]> {
    const insights: ContractInsight[] = [];

    // Analyze termination rate
    if (metrics.termination_rate > 0.15) {
      insights.push({
        type: 'risk',
        title: 'High Termination Rate Detected',
        description: `Termination rate is ${(metrics.termination_rate * 100).toFixed(1)}%, which is above the healthy threshold of 15%`,
        impact: 'high',
        actionable: true,
        suggested_actions: [
          'Review termination reasons and identify patterns',
          'Implement customer retention strategies',
          'Analyze competitor offerings',
          'Improve onboarding and support processes'
        ],
        confidence: 0.85
      });
    }

    // Analyze renewal rate
    if (metrics.renewal_rate < 0.7) {
      insights.push({
        type: 'opportunity',
        title: 'Renewal Rate Improvement Opportunity',
        description: `Current renewal rate is ${(metrics.renewal_rate * 100).toFixed(1)}%. There's opportunity to improve customer retention`,
        impact: 'high',
        actionable: true,
        suggested_actions: [
          'Implement early renewal incentives',
          'Improve contract terms and pricing',
          'Enhance customer communication',
          'Develop loyalty programs'
        ],
        confidence: 0.8
      });
    }

    // Analyze revenue trends
    const revenueTrend = trends.find(t => t.metric === 'monthly_revenue');
    if (revenueTrend && revenueTrend.trend_direction === 'down') {
      insights.push({
        type: 'trend',
        title: 'Revenue Decline Detected',
        description: `Monthly revenue has declined by ${Math.abs(revenueTrend.period_over_period_change).toFixed(1)}%`,
        impact: 'high',
        actionable: true,
        suggested_actions: [
          'Investigate reasons for revenue decline',
          'Review pricing strategy',
          'Analyze customer acquisition rates',
          'Evaluate market conditions'
        ],
        confidence: 0.9
      });
    }

    // Analyze compliance issues
    if (metrics.compliance_rate < 0.9) {
      insights.push({
        type: 'risk',
        title: 'Compliance Issues Need Attention',
        description: `Compliance rate is ${(metrics.compliance_rate * 100).toFixed(1)}%, below the target of 90%`,
        impact: 'critical',
        actionable: true,
        suggested_actions: [
          'Review compliance failures and root causes',
          'Implement compliance training',
          'Strengthen compliance validation',
          'Consider compliance automation tools'
        ],
        confidence: 0.95
      });
    }

    // Analyze vehicle utilization
    if (metrics.vehicle_utilization < 0.7) {
      insights.push({
        type: 'opportunity',
        title: 'Low Vehicle Utilization',
        description: `Vehicle utilization is ${(metrics.vehicle_utilization * 100).toFixed(1)}%, indicating potential optimization opportunities`,
        impact: 'medium',
        actionable: true,
        suggested_actions: [
          'Analyze vehicle availability and booking patterns',
          'Optimize vehicle allocation and scheduling',
          'Consider dynamic pricing strategies',
          'Improve marketing and demand generation'
        ],
        confidence: 0.75
      });
    }

    return insights;
  }

  /**
   * Calculate renewal rate
   */
  private async calculateRenewalRate(data: any[], period: AnalyticsPeriod): Promise<number> {
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);

    // Find contracts that expired in the period
    const expiredContracts = data.filter(c => {
      const endDate = new Date(c.end_date);
      return endDate >= periodStart && endDate <= periodEnd;
    });

    if (expiredContracts.length === 0) return 1;

    // Count how many were renewed (simplified - would need renewal tracking)
    const renewedContracts = expiredContracts.filter(c =>
      c.status === 'renewed' || c.renewed_contract_id
    ).length;

    return renewedContracts / expiredContracts.length;
  }

  /**
   * Apply filters to data
   */
  private applyFilters(data: any[], filters?: ReportFilter[]): any[] {
    if (!filters || filters.length === 0) return data;

    return data.filter(item => {
      return filters.every(filter => {
        const value = this.getNestedValue(item, filter.field);

        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'not_equals':
            return value !== filter.value;
          case 'greater_than':
            return Number(value) > Number(filter.value);
          case 'less_than':
            return Number(value) < Number(filter.value);
          case 'between':
            const [min, max] = filter.value as [number, number];
            return Number(value) >= min && Number(value) <= max;
          case 'in':
            return filter.value.includes(value);
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          default:
            return true;
        }
      });
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(config: CustomReportConfig, data?: any[]): Promise<any> {
    const reportData = data || this.data;
    const filteredData = this.applyFilters(reportData, config.filters);

    const report = {
      title: config.title,
      description: config.description,
      generated_at: new Date().toISOString(),
      period: {
        start_date: subMonths(new Date(), 12).toISOString(),
        end_date: new Date().toISOString()
      },
      data: this.processCustomReportData(filteredData, config),
      chart_config: {
        type: config.chart_type,
        metrics: config.metrics
      }
    };

    return report;
  }

  /**
   * Process data for custom report
   */
  private processCustomReportData(data: any[], config: CustomReportConfig): any {
    // Process data based on metrics and grouping
    if (config.group_by && config.group_by.length > 0) {
      return this.groupData(data, config.group_by, config.metrics);
    } else {
      return this.aggregateData(data, config.metrics);
    }
  }

  /**
   * Group data by specified fields
   */
  private groupData(data: any[], groupBy: string[], metrics: string[]): any {
    const groups = data.reduce((acc, item) => {
      const key = groupBy.map(field => this.getNestedValue(item, field)).join('|');
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(groups).map(([key, items]) => {
      const groupValues = key.split('|');
      const aggregated = this.aggregateData(items, metrics);

      return {
        group: groupValues,
        ...aggregated
      };
    });
  }

  /**
   * Aggregate data for specified metrics
   */
  private aggregateData(data: any[], metrics: string[]): any {
    const aggregated: any = { count: data.length };

    metrics.forEach(metric => {
      switch (metric) {
        case 'total_value':
          aggregated.total_value = data.reduce((sum, item) => sum + (item.contract_amount || 0), 0);
          break;
        case 'average_value':
          aggregated.average_value = data.length > 0
            ? data.reduce((sum, item) => sum + (item.contract_amount || 0), 0) / data.length
            : 0;
          break;
        case 'monthly_revenue':
          aggregated.monthly_revenue = data
            .filter(item => item.status === 'active')
            .reduce((sum, item) => sum + (item.monthly_amount || 0), 0);
          break;
        case 'count':
          aggregated.count = data.length;
          break;
        default:
          aggregated[metric] = data.reduce((sum, item) => sum + (item[metric] || 0), 0);
      }
    });

    return aggregated;
  }

  /**
   * Generate contract performance report
   */
  async generateContractPerformanceReport(contractId: string): Promise<ContractPerformanceReport> {
    const contract = this.data.find(c => c.id === contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    // Simulate performance calculations
    const performanceScore = Math.random() * 30 + 70; // 70-100
    const revenueGenerated = contract.contract_amount || 0;
    const costsIncurred = revenueGenerated * 0.3; // 30% cost assumption
    const profitability = revenueGenerated - costsIncurred;
    const customerRetentionScore = Math.random() * 20 + 80; // 80-100
    const complianceScore = Math.random() * 10 + 90; // 90-100
    const utilizationRate = Math.random() * 30 + 60; // 60-90%

    return {
      contract_id: contractId,
      performance_score: performanceScore,
      revenue_generated: revenueGenerated,
      costs_incurred: costsIncurred,
      profitability: profitability,
      customer_retention_score: customerRetentionScore,
      compliance_score: complianceScore,
      utilization_rate: utilizationRate,
      payment_history: this.generatePaymentHistory(contract),
      issues: this.generateContractIssues(contract),
      recommendations: this.generateContractRecommendations(performanceScore, profitability)
    };
  }

  /**
   * Generate payment history for a contract
   */
  private generatePaymentHistory(contract: any): PaymentHistoryEntry[] {
    // Simulate payment history
    const history: PaymentHistoryEntry[] = [];
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);

    let currentDate = startDate;
    while (currentDate <= endDate && history.length < 12) {
      const isLate = Math.random() < 0.1; // 10% chance of late payment
      const daysLate = isLate ? Math.floor(Math.random() * 15) + 1 : 0;

      history.push({
        date: currentDate.toISOString(),
        amount: contract.monthly_amount || 0,
        status: isLate ? 'late' : 'on_time',
        days_late: daysLate
      });

      currentDate = addMonths(currentDate, 1);
    }

    return history;
  }

  /**
   * Generate contract issues
   */
  private generateContractIssues(contract: any): ContractIssue[] {
    const issues: ContractIssue[] = [];

    // Randomly generate some issues
    if (Math.random() < 0.2) {
      issues.push({
        type: 'payment',
        description: 'Late payment reported',
        severity: 'medium',
        resolved: false,
        date: subDays(new Date(), 15).toISOString(),
        impact_cost: 50
      });
    }

    if (Math.random() < 0.1) {
      issues.push({
        type: 'maintenance',
        description: 'Vehicle maintenance required',
        severity: 'high',
        resolved: true,
        date: subDays(new Date(), 30).toISOString(),
        impact_cost: 500
      });
    }

    return issues;
  }

  /**
   * Generate contract recommendations
   */
  private generateContractRecommendations(performanceScore: number, profitability: number): string[] {
    const recommendations: string[] = [];

    if (performanceScore < 80) {
      recommendations.push('Consider reviewing contract terms for optimization');
    }

    if (profitability < 0) {
      recommendations.push('Review pricing strategy to improve profitability');
    }

    if (Math.random() < 0.3) {
      recommendations.push('Consider upselling additional services');
    }

    if (Math.random() < 0.2) {
      recommendations.push('Review customer satisfaction for improvement opportunities');
    }

    return recommendations;
  }
}

/**
 * Default analytics engine instance
 */
export const defaultAnalyticsEngine = new ContractAnalyticsEngine();

// Helper function to add date intervals
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function addYears(date: Date, years: number): Date {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}