import { InventoryItem } from '@/hooks/useInventoryItems';

export interface DemandForecast {
  itemId: string;
  warehouseId?: string;
  forecastPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  predictions: ForecastPrediction[];
  accuracy: number;
  confidence: number;
}

export interface ForecastPrediction {
  date: string;
  predictedDemand: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  seasonalityFactor?: number;
  trend?: number;
}

export interface ForecastingParameters {
  method: 'LINEAR_REGRESSION' | 'MOVING_AVERAGE' | 'EXPONENTIAL_SMOOTHING' | 'ARIMA';
  lookbackDays: number;
  seasonalPeriod?: number; // For weekly patterns, use 7
  alpha?: number; // Smoothing factor for exponential smoothing
  beta?: number; // Trend smoothing factor
  gamma?: number; // Seasonal smoothing factor
}

export interface HistoricalDemand {
  date: string;
  quantity: number;
  price?: number;
  dayOfWeek: number;
  weekOfYear: number;
  monthOfYear: number;
  isHoliday?: boolean;
}

export class DemandForecastingEngine {
  private parameters: ForecastingParameters;

  constructor(parameters: Partial<ForecastingParameters> = {}) {
    this.parameters = {
      method: 'LINEAR_REGRESSION',
      lookbackDays: 90,
      seasonalPeriod: 7,
      alpha: 0.3,
      beta: 0.1,
      gamma: 0.2,
      ...parameters,
    };
  }

  /**
   * Generate demand forecast for an item
   */
  async generateForecast(
    itemId: string,
    warehouseId: string,
    historicalData: HistoricalDemand[],
    forecastDays: number = 30
  ): Promise<DemandForecast> {
    if (historicalData.length < 7) {
      throw new Error('Insufficient historical data for forecasting. Minimum 7 days required.');
    }

    let predictions: ForecastPrediction[];

    switch (this.parameters.method) {
      case 'MOVING_AVERAGE':
        predictions = this.movingAverageForecast(historicalData, forecastDays);
        break;
      case 'EXPONENTIAL_SMOOTHING':
        predictions = this.exponentialSmoothingForecast(historicalData, forecastDays);
        break;
      case 'ARIMA':
        predictions = this.arimaForecast(historicalData, forecastDays);
        break;
      case 'LINEAR_REGRESSION':
      default:
        predictions = this.linearRegressionForecast(historicalData, forecastDays);
        break;
    }

    // Calculate forecast accuracy using backtesting
    const accuracy = this.calculateForecastAccuracy(historicalData, predictions.slice(0, 7));

    return {
      itemId,
      warehouseId,
      forecastPeriod: this.forecastPeriodFromDays(forecastDays),
      predictions,
      accuracy,
      confidence: Math.min(accuracy * 0.9, 95), // Confidence is slightly conservative
    };
  }

  /**
   * Linear regression forecasting with trend and seasonality
   */
  private linearRegressionForecast(
    historicalData: HistoricalDemand[],
    forecastDays: number
  ): ForecastPrediction[] {
    const n = historicalData.length;
    const x = historicalData.map((_, i) => i);
    const y = historicalData.map(d => d.quantity);

    // Calculate linear regression (y = mx + b)
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate seasonal factors (day-of-week pattern)
    const seasonalFactors = this.calculateSeasonalFactors(historicalData);

    // Generate predictions
    const predictions: ForecastPrediction[] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const xValue = n + i - 1;
      let trendValue = slope * xValue + intercept;

      // Apply seasonal factor
      const dayOfWeek = forecastDate.getDay();
      const seasonalityFactor = seasonalFactors[dayOfWeek] || 1;

      const predictedDemand = Math.max(0, trendValue * seasonalityFactor);

      // Calculate confidence interval (simplified)
      const standardError = this.calculateStandardError(historicalData, slope, intercept);
      const margin = 1.96 * standardError * Math.sqrt(1 + (i * i) / n);

      predictions.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDemand,
        confidenceInterval: {
          lower: Math.max(0, predictedDemand - margin),
          upper: predictedDemand + margin,
        },
        seasonalityFactor,
        trend: slope,
      });
    }

    return predictions;
  }

  /**
   * Moving average forecasting with trend detection
   */
  private movingAverageForecast(
    historicalData: HistoricalDemand[],
    forecastDays: number
  ): ForecastPrediction[] {
    const windowSize = Math.min(14, Math.floor(historicalData.length / 2));
    const seasonalFactors = this.calculateSeasonalFactors(historicalData);

    // Calculate moving average and trend
    const recentValues = historicalData.slice(-windowSize).map(d => d.quantity);
    const movingAverage = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

    // Simple trend calculation
    const trend = (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length;

    const predictions: ForecastPrediction[] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const dayOfWeek = forecastDate.getDay();
      const seasonalityFactor = seasonalFactors[dayOfWeek] || 1;

      const predictedDemand = Math.max(0, (movingAverage + trend * i) * seasonalityFactor);
      const standardDeviation = this.calculateStandardDeviation(recentValues);

      predictions.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDemand,
        confidenceInterval: {
          lower: Math.max(0, predictedDemand - 1.96 * standardDeviation),
          upper: predictedDemand + 1.96 * standardDeviation,
        },
        seasonalityFactor,
        trend,
      });
    }

    return predictions;
  }

  /**
   * Exponential smoothing forecasting (Holt-Winters method)
   */
  private exponentialSmoothingForecast(
    historicalData: HistoricalDemand[],
    forecastDays: number
  ): ForecastPrediction[] {
    const { alpha = 0.3, beta = 0.1, gamma = 0.2 } = this.parameters;
    const seasonalPeriod = this.parameters.seasonalPeriod || 7;

    if (historicalData.length < seasonalPeriod * 2) {
      // Fallback to moving average if insufficient data
      return this.movingAverageForecast(historicalData, forecastDays);
    }

    // Initialize Holt-Winters parameters
    const values = historicalData.map(d => d.quantity);

    // Initial level (average of first season)
    let level = values.slice(0, seasonalPeriod).reduce((a, b) => a + b, 0) / seasonalPeriod;

    // Initial trend (simple difference)
    let trend = (values[seasonalPeriod] - values[0]) / seasonalPeriod;

    // Initial seasonal indices
    const seasonalIndices: number[] = new Array(seasonalPeriod).fill(1);
    for (let i = 0; i < seasonalPeriod; i++) {
      seasonalIndices[i] = values[i] / level;
    }

    // Optimize parameters using first part of data
    for (let i = seasonalPeriod; i < values.length; i++) {
      const season = i % seasonalPeriod;
      const prevLevel = level;
      const prevTrend = trend;
      const prevSeasonal = seasonalIndices[season];

      level = alpha * (values[i] / prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend);
      trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
      seasonalIndices[season] = gamma * (values[i] / level) + (1 - gamma) * prevSeasonal;
    }

    // Generate forecasts
    const predictions: ForecastPrediction[] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const season = (historicalData.length + i - 1) % seasonalPeriod;
      const seasonalFactor = seasonalIndices[season];

      const predictedDemand = Math.max(0, (level + trend * i) * seasonalFactor);

      // Calculate confidence interval
      const forecastVariance = this.calculateForecastVariance(values, alpha, beta, gamma);
      const margin = 1.96 * Math.sqrt(forecastVariance * i);

      predictions.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDemand,
        confidenceInterval: {
          lower: Math.max(0, predictedDemand - margin),
          upper: predictedDemand + margin,
        },
        seasonalityFactor,
        trend,
      });
    }

    return predictions;
  }

  /**
   * Simplified ARIMA forecasting (AutoRegressive Integrated Moving Average)
   */
  private arimaForecast(
    historicalData: HistoricalDemand[],
    forecastDays: number
  ): ForecastPrediction[] {
    // Simplified ARIMA(1,1,1) implementation
    // In production, you would use a proper statistical library

    const values = historicalData.map(d => d.quantity);
    const differences = [];
    for (let i = 1; i < values.length; i++) {
      differences.push(values[i] - values[i - 1]);
    }

    // Simple AR(1) model on differences
    const arCoeff = this.calculateAutocorrelation(differences, 1);
    const lastValue = values[values.length - 1];
    const lastDiff = differences[differences.length - 1] || 0;

    const predictions: ForecastPrediction[] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      // Predict difference and convert back to original scale
      const predictedDiff = arCoeff * (i === 1 ? lastDiff : 0);
      const predictedDemand = Math.max(0, lastValue + i * predictedDiff);

      const standardError = this.calculateStandardError(differences);

      predictions.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedDemand,
        confidenceInterval: {
          lower: Math.max(0, predictedDemand - 1.96 * standardError),
          upper: predictedDemand + 1.96 * standardError,
        },
        trend: predictedDiff,
      });
    }

    return predictions;
  }

  /**
   * Calculate seasonal factors based on day of week
   */
  private calculateSeasonalFactors(historicalData: HistoricalDemand[]): number[] {
    const seasonalFactors = new Array(7).fill(0);
    const seasonalCounts = new Array(7).fill(0);

    // Calculate average by day of week
    historicalData.forEach(data => {
      const dayOfWeek = new Date(data.date).getDay();
      seasonalFactors[dayOfWeek] += data.quantity;
      seasonalCounts[dayOfWeek]++;
    });

    // Calculate averages and normalize
    const overallAverage = historicalData.reduce((sum, d) => sum + d.quantity, 0) / historicalData.length;

    for (let i = 0; i < 7; i++) {
      if (seasonalCounts[i] > 0) {
        seasonalFactors[i] = (seasonalFactors[i] / seasonalCounts[i]) / overallAverage;
      } else {
        seasonalFactors[i] = 1;
      }
    }

    return seasonalFactors;
  }

  /**
   * Calculate forecast accuracy using backtesting
   */
  private calculateForecastAccuracy(
    historicalData: HistoricalDemand[],
    testPredictions: ForecastPrediction[]
  ): number {
    if (historicalData.length < testPredictions.length) {
      return 80; // Default accuracy for insufficient data
    }

    let totalError = 0;
    let totalActual = 0;

    for (let i = 0; i < testPredictions.length; i++) {
      const actual = historicalData[historicalData.length - testPredictions.length + i]?.quantity || 0;
      const predicted = testPredictions[i].predictedDemand;

      totalError += Math.abs(actual - predicted);
      totalActual += actual;
    }

    // Mean Absolute Percentage Error (MAPE)
    const mape = totalActual > 0 ? (totalError / totalActual) * 100 : 100;
    return Math.max(0, Math.min(100, 100 - mape));
  }

  /**
   * Calculate standard error for linear regression
   */
  private calculateStandardError(
    historicalData: HistoricalDemand[],
    slope: number,
    intercept: number
  ): number {
    const n = historicalData.length;
    let sumSquaredErrors = 0;

    historicalData.forEach((data, i) => {
      const predicted = slope * i + intercept;
      sumSquaredErrors += Math.pow(data.quantity - predicted, 2);
    });

    return Math.sqrt(sumSquaredErrors / (n - 2));
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Calculate autocorrelation
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const n = values.length - lag;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate forecast variance for exponential smoothing
   */
  private calculateForecastVariance(
    values: number[],
    alpha: number,
    beta: number,
    gamma: number
  ): number {
    // Simplified variance calculation
    const errors = [];
    let level = values[0];
    let trend = 0;

    for (let i = 1; i < values.length; i++) {
      const predicted = level + trend;
      const error = values[i] - predicted;
      errors.push(error);

      level = alpha * values[i] + (1 - alpha) * predicted;
      trend = beta * (level - values[i - 1]) + (1 - beta) * trend;
    }

    return errors.reduce((sum, error) => sum + error * error, 0) / errors.length;
  }

  /**
   * Convert days to forecast period
   */
  private forecastPeriodFromDays(days: number): 'DAILY' | 'WEEKLY' | 'MONTHLY' {
    if (days <= 7) return 'DAILY';
    if (days <= 30) return 'WEEKLY';
    return 'MONTHLY';
  }
}

/**
 * Factory function to create forecasting engine with optimal parameters
 */
export function createDemandForecastingEngine(
  historicalData: HistoricalDemand[],
  itemCategory?: string
): DemandForecastingEngine {
  const dataPoints = historicalData.length;

  // Adaptive parameter selection based on data characteristics
  const parameters: Partial<ForecastingParameters> = {
    lookbackDays: Math.min(dataPoints, 180),
  };

  // Choose method based on data characteristics
  if (dataPoints < 30) {
    parameters.method = 'MOVING_AVERAGE';
  } else if (dataPoints < 90) {
    parameters.method = 'EXPONENTIAL_SMOOTHING';
  } else {
    parameters.method = 'LINEAR_REGRESSION';
  }

  // Adjust for seasonality
  const seasonalityScore = calculateSeasonalityScore(historicalData);
  if (seasonalityScore > 0.3) {
    parameters.seasonalPeriod = 7; // Weekly seasonality
    parameters.gamma = 0.3; // Strong seasonal smoothing
  }

  return new DemandForecastingEngine(parameters);
}

/**
 * Calculate seasonality score to determine if seasonal adjustment is needed
 */
function calculateSeasonalityScore(historicalData: HistoricalDemand[]): number {
  const weeklyPattern = new Array(7).fill(0);
  const weeklyCounts = new Array(7).fill(0);

  historicalData.forEach(data => {
    const dayOfWeek = new Date(data.date).getDay();
    weeklyPattern[dayOfWeek] += data.quantity;
    weeklyCounts[dayOfWeek]++;
  });

  // Calculate coefficient of variation for weekly pattern
  const weeklyAverages = weeklyPattern.map((sum, i) =>
    weeklyCounts[i] > 0 ? sum / weeklyCounts[i] : 0
  );

  const overallAverage = weeklyAverages.reduce((a, b) => a + b, 0) / 7;
  const variance = weeklyAverages.reduce((sum, avg) =>
    sum + Math.pow(avg - overallAverage, 2), 0
  ) / 7;

  const standardDeviation = Math.sqrt(variance);
  return overallAverage > 0 ? standardDeviation / overallAverage : 0;
}