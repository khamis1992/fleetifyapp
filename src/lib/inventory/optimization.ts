import { InventoryItem } from '@/hooks/useInventoryItems';
import { DemandForecast, HistoricalDemand } from './demandForecasting';

export interface OptimizationResult {
  itemId: string;
  itemName: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  safetyStock: number;
  serviceLevel: number;
  holdingCost: number;
  orderingCost: number;
  totalCost: number;
  turnoverRate: number;
  daysOfSupply: number;
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface OptimizationParameters {
  holdingCostRate: number; // Annual holding cost as percentage of unit cost (0.2 = 20%)
  orderingCost: number; // Fixed cost per order
  leadTimeDays: number; // Average lead time in days
  serviceLevelTarget: number; // Target service level (0.95 = 95%)
  reviewPeriodDays?: number; // For periodic review systems
  maxReviewPeriod?: number; // Maximum days between reviews
}

export interface EOQResult {
  economicOrderQuantity: number;
  optimalOrderFrequency: number; // Orders per year
  totalAnnualCost: number;
  holdingCost: number;
  orderingCost: number;
}

export interface ServiceLevelParams {
  serviceLevel: number; // Target service level (0.90 to 0.99)
  leadTimeVariation: number; // Standard deviation of lead time
  demandVariation: number; // Standard deviation of demand during lead time
}

export class InventoryOptimizer {
  private parameters: OptimizationParameters;

  constructor(parameters: Partial<OptimizationParameters> = {}) {
    this.parameters = {
      holdingCostRate: 0.25, // 25% annual holding cost
      orderingCost: 50, // $50 per order
      leadTimeDays: 7,
      serviceLevelTarget: 0.95, // 95% service level
      reviewPeriodDays: 7, // Weekly review
      maxReviewPeriod: 14, // Maximum 2 weeks between reviews
      ...parameters,
    };
  }

  /**
   * Optimize inventory for a single item
   */
  optimizeItem(
    item: InventoryItem,
    currentStock: number,
    historicalData: HistoricalDemand[],
    forecast?: DemandForecast
  ): OptimizationResult {
    // Calculate demand statistics
    const demandStats = this.calculateDemandStatistics(historicalData);

    // Calculate Economic Order Quantity (EOQ)
    const eoqResult = this.calculateEOQ(
      item.cost_price,
      demandStats.averageDailyDemand,
      demandStats.annualDemand
    );

    // Calculate safety stock based on service level
    const safetyStock = this.calculateSafetyStock(
      demandStats.averageDailyDemand,
      demandStats.demandVariability,
      this.parameters.leadTimeDays,
      this.parameters.serviceLevelTarget
    );

    // Calculate reorder point
    const reorderPoint = this.calculateReorderPoint(
      demandStats.averageDailyDemand,
      this.parameters.leadTimeDays,
      safetyStock
    );

    // Calculate optimal order quantity
    const reorderQuantity = this.calculateOptimalOrderQuantity(
      eoqResult.economicOrderQuantity,
      item.max_stock_level || reorderPoint * 2
    );

    // Calculate optimal stock level
    const optimalStock = reorderPoint + reorderQuantity;

    // Calculate costs
    const holdingCost = this.calculateAnnualHoldingCost(
      item.cost_price,
      currentStock,
      optimalStock
    );

    const orderingCost = this.calculateAnnualOrderingCost(
      demandStats.annualDemand,
      reorderQuantity
    );

    const totalCost = holdingCost + orderingCost;

    // Calculate performance metrics
    const turnoverRate = this.calculateTurnoverRate(
      demandStats.annualDemand,
      currentStock,
      item.cost_price
    );

    const daysOfSupply = this.calculateDaysOfSupply(
      currentStock,
      demandStats.averageDailyDemand
    );

    // Calculate actual service level
    const serviceLevel = this.calculateServiceLevel(
      historicalData,
      safetyStock,
      this.parameters.leadTimeDays
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      item,
      currentStock,
      optimalStock,
      reorderPoint,
      safetyStock,
      turnoverRate,
      daysOfSupply,
      serviceLevel,
      demandStats,
      forecast,
    });

    // Determine risk level
    const riskLevel = this.assessRiskLevel({
      currentStock,
      reorderPoint,
      safetyStock,
      serviceLevel,
      turnoverRate,
      daysOfSupply,
    });

    return {
      itemId: item.id,
      itemName: item.item_name,
      currentStock,
      optimalStock,
      reorderPoint,
      reorderQuantity,
      safetyStock,
      serviceLevel,
      holdingCost,
      orderingCost,
      totalCost,
      turnoverRate,
      daysOfSupply,
      recommendations,
      riskLevel,
    };
  }

  /**
   * Calculate Economic Order Quantity (EOQ)
   */
  calculateEOQ(unitCost: number, dailyDemand: number, annualDemand: number): EOQResult {
    const annualHoldingCostPerUnit = unitCost * this.parameters.holdingCostRate;

    // EOQ formula: sqrt(2 * D * S / H)
    // D = Annual demand, S = Ordering cost per order, H = Holding cost per unit per year
    const economicOrderQuantity = Math.sqrt(
      (2 * annualDemand * this.parameters.orderingCost) / annualHoldingCostPerUnit
    );

    const optimalOrderFrequency = annualDemand / economicOrderQuantity;
    const totalAnnualCost = Math.sqrt(
      2 * annualDemand * this.parameters.orderingCost * annualHoldingCostPerUnit
    );

    const holdingCost = (economicOrderQuantity / 2) * annualHoldingCostPerUnit;
    const orderingCost = optimalOrderFrequency * this.parameters.orderingCost;

    return {
      economicOrderQuantity: Math.round(economicOrderQuantity),
      optimalOrderFrequency,
      totalAnnualCost,
      holdingCost,
      orderingCost,
    };
  }

  /**
   * Calculate safety stock based on service level and demand variability
   */
  calculateSafetyStock(
    averageDailyDemand: number,
    demandVariability: number,
    leadTimeDays: number,
    serviceLevel: number
  ): number {
    // Calculate Z-score for target service level
    const zScore = this.getZScore(serviceLevel);

    // Safety stock = Z * σ * sqrt(lead time)
    // Where σ is the standard deviation of demand
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    const leadTimeVariability = demandVariability * Math.sqrt(leadTimeDays);

    return Math.ceil(zScore * leadTimeVariability);
  }

  /**
   * Calculate reorder point
   */
  calculateReorderPoint(
    averageDailyDemand: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    // Reorder point = (Average daily demand × Lead time) + Safety stock
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    return Math.ceil(leadTimeDemand + safetyStock);
  }

  /**
   * Calculate optimal order quantity
   */
  calculateOptimalOrderQuantity(
    eoq: number,
    maxStockLevel?: number
  ): number {
    if (maxStockLevel && eoq > maxStockLevel) {
      return maxStockLevel;
    }
    return Math.round(eoq);
  }

  /**
   * Calculate annual holding cost
   */
  calculateAnnualHoldingCost(
    unitCost: number,
    currentStock: number,
    optimalStock: number
  ): number {
    const averageStock = (currentStock + optimalStock) / 2;
    return unitCost * this.parameters.holdingCostRate * averageStock;
  }

  /**
   * Calculate annual ordering cost
   */
  calculateAnnualOrderingCost(annualDemand: number, orderQuantity: number): number {
    const ordersPerYear = annualDemand / orderQuantity;
    return ordersPerYear * this.parameters.orderingCost;
  }

  /**
   * Calculate inventory turnover rate
   */
  calculateTurnoverRate(
    annualDemand: number,
    currentStock: number,
    unitCost: number
  ): number {
    const averageInventoryValue = currentStock * unitCost;
    const annualSalesValue = annualDemand * unitCost;

    return averageInventoryValue > 0 ? annualSalesValue / averageInventoryValue : 0;
  }

  /**
   * Calculate days of supply
   */
  calculateDaysOfSupply(currentStock: number, averageDailyDemand: number): number {
    return averageDailyDemand > 0 ? currentStock / averageDailyDemand : 999;
  }

  /**
   * Calculate service level from historical data
   */
  calculateServiceLevel(
    historicalData: HistoricalDemand[],
    safetyStock: number,
    leadTimeDays: number
  ): number {
    if (historicalData.length < leadTimeDays) {
      return this.parameters.serviceLevelTarget; // Default to target if insufficient data
    }

    let stockouts = 0;
    let totalPeriods = 0;

    // Check each period for potential stockouts
    for (let i = leadTimeDays; i < historicalData.length; i++) {
      const leadTimeDemand = historicalData
        .slice(i - leadTimeDays, i)
        .reduce((sum, data) => sum + data.quantity, 0);

      totalPeriods++;
      if (leadTimeDemand > safetyStock) {
        stockouts++;
      }
    }

    return totalPeriods > 0 ? 1 - (stockouts / totalPeriods) : this.parameters.serviceLevelTarget;
  }

  /**
   * Generate inventory recommendations
   */
  private generateRecommendations(params: {
    item: InventoryItem;
    currentStock: number;
    optimalStock: number;
    reorderPoint: number;
    safetyStock: number;
    turnoverRate: number;
    daysOfSupply: number;
    serviceLevel: number;
    demandStats: any;
    forecast?: DemandForecast;
  }): string[] {
    const recommendations: string[] = [];

    // Stock level recommendations
    if (params.currentStock < params.reorderPoint) {
      recommendations.push(`الطلب العاجل: المخزون الحالي (${Math.round(params.currentStock)}) أقل من نقطة إعادة الطلب (${params.reorderPoint})`);
    }

    if (params.currentStock > params.optimalStock * 1.5) {
      recommendations.push(`تخزين زائد: المخزون الحالي (${Math.round(params.currentStock)}) أعلى بكثير من المستوى الأمثل (${Math.round(params.optimalStock)})`);
    }

    // Service level recommendations
    if (params.serviceLevel < this.parameters.serviceLevelTarget - 0.05) {
      recommendations.push(`تحسين مستوى الخدمة: المستوى الحالي (${(params.serviceLevel * 100).toFixed(1)}%) أقل من المستوى المستهدف (${(this.parameters.serviceLevelTarget * 100).toFixed(1)}%)`);
    }

    // Turnover rate recommendations
    if (params.turnoverRate < 4) {
      recommendations.push(`معدل دوران منخفض (${params.turnoverRate.toFixed(1)}): قد يشير إلى تخزين زائد أو بيع بطيء`);
    } else if (params.turnoverRate > 12) {
      recommendations.push(`معدل دوران مرتفع (${params.turnoverRate.toFixed(1)}): قد يحتاج إلى زيادة المخزون أو تحسين إدارة الطلبات`);
    }

    // Days of supply recommendations
    if (params.daysOfSupply < this.parameters.leadTimeDays * 2) {
      recommendations.push(`أيام التوريد منخفضة (${Math.round(params.daysOfSupply)} يوم): قد يكون هناك خطر نفاد المخزون`);
    } else if (params.daysOfSupply > 90) {
      recommendations.push(`أيام التوراد مرتفعة جداً (${Math.round(params.daysOfSupply)} يوم): تكلفة تخزين مرتفعة`);
    }

    // Forecast-based recommendations
    if (params.forecast && params.forecast.accuracy < 70) {
      recommendations.push(`دقة التنبؤ منخفضة (${params.forecast.accuracy.toFixed(1)}%): قد تحتاج إلى تحسين نموذج التنبؤ`);
    }

    // Price-based recommendations
    if (params.item.unit_price > 1000 && params.turnoverRate < 6) {
      recommendations.push(`صنف عالي القيمة مع دوران بطيء: فكر في تحسين إدارة المخزون أو العروض الترويجية`);
    }

    // Seasonality recommendations
    const seasonalIndex = this.detectSeasonality(params.demandStats);
    if (seasonalIndex > 0.3) {
      recommendations.push(`نمط موسمي قوي: ضع خطط تخزون موسمية للاستفادة من ذروة الطلب`);
    }

    return recommendations;
  }

  /**
   * Assess risk level for inventory item
   */
  private assessRiskLevel(params: {
    currentStock: number;
    reorderPoint: number;
    safetyStock: number;
    serviceLevel: number;
    turnoverRate: number;
    daysOfSupply: number;
  }): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let riskScore = 0;

    // Stock level risk
    if (params.currentStock < params.reorderPoint) {
      riskScore += 3;
    } else if (params.currentStock < params.safetyStock) {
      riskScore += 2;
    }

    // Service level risk
    if (params.serviceLevel < 0.90) {
      riskScore += 3;
    } else if (params.serviceLevel < 0.95) {
      riskScore += 1;
    }

    // Turnover rate risk
    if (params.turnoverRate < 2) {
      riskScore += 2;
    }

    // Days of supply risk
    if (params.daysOfSupply < this.parameters.leadTimeDays) {
      riskScore += 3;
    } else if (params.daysOfSupply < this.parameters.leadTimeDays * 1.5) {
      riskScore += 1;
    }

    if (riskScore >= 7) return 'CRITICAL';
    if (riskScore >= 5) return 'HIGH';
    if (riskScore >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate demand statistics from historical data
   */
  private calculateDemandStatistics(historicalData: HistoricalDemand[]) {
    if (historicalData.length === 0) {
      return {
        averageDailyDemand: 0,
        annualDemand: 0,
        demandVariability: 0,
        totalDemand: 0,
      };
    }

    const dailyDemands = historicalData.map(d => d.quantity);
    const totalDemand = dailyDemands.reduce((sum, demand) => sum + demand, 0);
    const averageDailyDemand = totalDemand / historicalData.length;

    // Calculate variability (standard deviation)
    const variance = dailyDemands.reduce((sum, demand) => {
      return sum + Math.pow(demand - averageDailyDemand, 2);
    }, 0) / dailyDemands.length;

    const demandVariability = Math.sqrt(variance);

    // Annual demand estimation
    const daysInData = historicalData.length;
    const annualDemand = (totalDemand / daysInData) * 365;

    return {
      averageDailyDemand,
      annualDemand,
      demandVariability,
      totalDemand,
    };
  }

  /**
   * Get Z-score for service level
   */
  private getZScore(serviceLevel: number): number {
    // Common Z-scores for service levels
    const zScores: { [key: number]: number } = {
      0.50: 0.00,
      0.60: 0.25,
      0.70: 0.52,
      0.75: 0.67,
      0.80: 0.84,
      0.85: 1.04,
      0.90: 1.28,
      0.91: 1.34,
      0.92: 1.41,
      0.93: 1.48,
      0.94: 1.56,
      0.95: 1.65,
      0.96: 1.75,
      0.97: 1.88,
      0.98: 2.05,
      0.99: 2.33,
    };

    // Find closest service level
    const serviceLevels = Object.keys(zScores).map(Number).sort((a, b) => a - b);
    let closestLevel = serviceLevels[0];
    let minDiff = Math.abs(serviceLevel - closestLevel);

    for (const level of serviceLevels) {
      const diff = Math.abs(serviceLevel - level);
      if (diff < minDiff) {
        minDiff = diff;
        closestLevel = level;
      }
    }

    return zScores[closestLevel] || 1.65; // Default to 95% service level
  }

  /**
   * Detect seasonality in demand pattern
   */
  private detectSeasonality(demandStats: any): number {
    // Simplified seasonality detection
    // In practice, you would use more sophisticated methods
    return 0.2; // Placeholder
  }
}

/**
 * Batch optimization for multiple items
 */
export function optimizeInventoryBatch(
  items: Array<{
    item: InventoryItem;
    currentStock: number;
    historicalData: HistoricalDemand[];
    forecast?: DemandForecast;
  }>,
  parameters?: Partial<OptimizationParameters>
): OptimizationResult[] {
  const optimizer = new InventoryOptimizer(parameters);

  return items.map(({ item, currentStock, historicalData, forecast }) =>
    optimizer.optimizeItem(item, currentStock, historicalData, forecast)
  );
}

/**
 * Calculate ABC analysis for inventory classification
 */
export function calculateABCAnalysis(
  items: Array<{
    item: InventoryItem;
    annualUsage: number;
    unitCost: number;
  }>
): Array<{
  item: InventoryItem;
  annualValue: number;
  percentageOfValue: number;
  cumulativePercentage: number;
  category: 'A' | 'B' | 'C';
}> {
  const itemsWithValue = items.map(({ item, annualUsage, unitCost }) => ({
    item,
    annualValue: annualUsage * unitCost,
  }));

  // Sort by annual value descending
  itemsWithValue.sort((a, b) => b.annualValue - a.annualValue);

  const totalValue = itemsWithValue.reduce((sum, item) => sum + item.annualValue, 0);
  let cumulativePercentage = 0;

  return itemsWithValue.map((itemData) => {
    const percentageOfValue = (itemData.annualValue / totalValue) * 100;
    cumulativePercentage += percentageOfValue;

    let category: 'A' | 'B' | 'C';
    if (cumulativePercentage <= 80) {
      category = 'A';
    } else if (cumulativePercentage <= 95) {
      category = 'B';
    } else {
      category = 'C';
    }

    return {
      ...itemData,
      percentageOfValue,
      cumulativePercentage,
      category,
    };
  });
}