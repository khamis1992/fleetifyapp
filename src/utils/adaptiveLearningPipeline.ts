/**
 * Adaptive Learning Pipeline
 * Phase 2 Priority: Custom model training and adaptive confidence thresholds
 */

interface LearningData {
  id: string;
  invoice_text: string;
  extracted_data: any;
  user_corrections: any;
  confidence_scores: {
    ocr_confidence: number;
    matching_confidence: number;
    overall_confidence: number;
  };
  feedback_rating: number;
  is_correct: boolean;
  processing_time: number;
  created_at: string;
}

interface ModelMetrics {
  accuracy_trend: number[];
  confidence_trend: number[];
  processing_time_trend: number[];
  user_satisfaction_trend: number[];
  error_patterns: { [key: string]: number };
  improvement_suggestions: string[];
}

interface AdaptiveThresholds {
  ocr_confidence_min: number;
  matching_confidence_min: number;
  auto_approval_threshold: number;
  manual_review_threshold: number;
  rejection_threshold: number;
}

class AdaptiveLearningPipeline {
  private learningData: LearningData[] = [];
  private currentThresholds: AdaptiveThresholds = {
    ocr_confidence_min: 70,
    matching_confidence_min: 75,
    auto_approval_threshold: 85,
    manual_review_threshold: 70,
    rejection_threshold: 50
  };
  private modelMetrics: ModelMetrics = {
    accuracy_trend: [],
    confidence_trend: [],
    processing_time_trend: [],
    user_satisfaction_trend: [],
    error_patterns: {},
    improvement_suggestions: []
  };

  /**
   * Add learning data from user feedback
   */
  addLearningData(data: Omit<LearningData, 'id' | 'created_at'>): void {
    const learningEntry: LearningData = {
      id: `learning_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      created_at: new Date().toISOString(),
      ...data
    };

    this.learningData.push(learningEntry);
    
    // Trigger adaptive threshold update
    this.updateAdaptiveThresholds();
    
    // Update model metrics
    this.updateModelMetrics();
    
    // Limit data to last 1000 entries for performance
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-1000);
    }
  }

  /**
   * Update adaptive thresholds based on learning data
   */
  private updateAdaptiveThresholds(): void {
    if (this.learningData.length < 10) return; // Need minimum data

    const recentData = this.learningData.slice(-50); // Last 50 entries
    
    // Calculate success rates at different confidence levels
    const confidenceLevels = [60, 65, 70, 75, 80, 85, 90, 95];
    const successRates: { [key: number]: number } = {};

    for (const level of confidenceLevels) {
      const dataAtLevel = recentData.filter(d => d.confidence_scores.overall_confidence >= level);
      if (dataAtLevel.length > 0) {
        const successCount = dataAtLevel.filter(d => d.is_correct || d.feedback_rating >= 4).length;
        successRates[level] = successCount / dataAtLevel.length;
      }
    }

    // Find optimal thresholds based on success rates
    const targetSuccessRate = 0.9; // 90% success rate target
    
    // Update OCR confidence threshold
    for (const level of confidenceLevels.reverse()) {
      if (successRates[level] >= targetSuccessRate) {
        this.currentThresholds.ocr_confidence_min = level;
        break;
      }
    }

    // Update auto-approval threshold (95% success rate)
    for (const level of confidenceLevels) {
      if (successRates[level] >= 0.95) {
        this.currentThresholds.auto_approval_threshold = level;
        break;
      }
    }

    // Update manual review threshold (80% success rate)
    for (const level of confidenceLevels) {
      if (successRates[level] >= 0.8) {
        this.currentThresholds.manual_review_threshold = level;
        break;
      }
    }

    console.log('Updated adaptive thresholds:', this.currentThresholds);
  }

  /**
   * Update model metrics and identify patterns
   */
  private updateModelMetrics(): void {
    if (this.learningData.length < 5) return;

    const recentData = this.learningData.slice(-20); // Last 20 entries
    
    // Calculate trends
    const accuracy = recentData.filter(d => d.is_correct).length / recentData.length;
    const avgConfidence = recentData.reduce((sum, d) => sum + d.confidence_scores.overall_confidence, 0) / recentData.length;
    const avgProcessingTime = recentData.reduce((sum, d) => sum + d.processing_time, 0) / recentData.length;
    const avgSatisfaction = recentData.reduce((sum, d) => sum + d.feedback_rating, 0) / recentData.length;

    // Update trends (keep last 50 data points)
    this.modelMetrics.accuracy_trend.push(accuracy);
    this.modelMetrics.confidence_trend.push(avgConfidence);
    this.modelMetrics.processing_time_trend.push(avgProcessingTime);
    this.modelMetrics.user_satisfaction_trend.push(avgSatisfaction);

    // Limit trend data
    const maxTrendLength = 50;
    if (this.modelMetrics.accuracy_trend.length > maxTrendLength) {
      this.modelMetrics.accuracy_trend = this.modelMetrics.accuracy_trend.slice(-maxTrendLength);
      this.modelMetrics.confidence_trend = this.modelMetrics.confidence_trend.slice(-maxTrendLength);
      this.modelMetrics.processing_time_trend = this.modelMetrics.processing_time_trend.slice(-maxTrendLength);
      this.modelMetrics.user_satisfaction_trend = this.modelMetrics.user_satisfaction_trend.slice(-maxTrendLength);
    }

    // Analyze error patterns
    this.analyzeErrorPatterns();
    
    // Generate improvement suggestions
    this.generateImprovementSuggestions();
  }

  /**
   * Analyze common error patterns
   */
  private analyzeErrorPatterns(): void {
    const incorrectData = this.learningData.filter(d => !d.is_correct);
    
    this.modelMetrics.error_patterns = {};

    for (const data of incorrectData) {
      // Analyze confidence vs correctness patterns
      const confidenceRange = this.getConfidenceRange(data.confidence_scores.overall_confidence);
      this.modelMetrics.error_patterns[`low_confidence_${confidenceRange}`] = 
        (this.modelMetrics.error_patterns[`low_confidence_${confidenceRange}`] || 0) + 1;

      // Analyze common correction patterns
      if (data.user_corrections) {
        if (data.user_corrections.customer_name) {
          this.modelMetrics.error_patterns['customer_name_errors'] = 
            (this.modelMetrics.error_patterns['customer_name_errors'] || 0) + 1;
        }
        if (data.user_corrections.amount) {
          this.modelMetrics.error_patterns['amount_errors'] = 
            (this.modelMetrics.error_patterns['amount_errors'] || 0) + 1;
        }
        if (data.user_corrections.car_number) {
          this.modelMetrics.error_patterns['car_number_errors'] = 
            (this.modelMetrics.error_patterns['car_number_errors'] || 0) + 1;
        }
      }

      // Analyze processing time patterns
      if (data.processing_time > 10000) { // > 10 seconds
        this.modelMetrics.error_patterns['slow_processing'] = 
          (this.modelMetrics.error_patterns['slow_processing'] || 0) + 1;
      }
    }
  }

  /**
   * Generate improvement suggestions based on patterns
   */
  private generateImprovementSuggestions(): void {
    this.modelMetrics.improvement_suggestions = [];

    // Accuracy trend analysis
    if (this.modelMetrics.accuracy_trend.length >= 10) {
      const recentAccuracy = this.modelMetrics.accuracy_trend.slice(-5).reduce((a, b) => a + b) / 5;
      const olderAccuracy = this.modelMetrics.accuracy_trend.slice(-10, -5).reduce((a, b) => a + b) / 5;
      
      if (recentAccuracy < olderAccuracy - 0.05) {
        this.modelMetrics.improvement_suggestions.push(
          'الدقة تتراجع - يُنصح بمراجعة عتبات الثقة أو تحسين نماذج المعالجة'
        );
      }
    }

    // Error pattern analysis
    const totalErrors = Object.values(this.modelMetrics.error_patterns).reduce((a, b) => a + b, 0);
    
    if (this.modelMetrics.error_patterns['customer_name_errors'] > totalErrors * 0.4) {
      this.modelMetrics.improvement_suggestions.push(
        'أخطاء متكررة في أسماء العملاء - يُنصح بتحسين خوارزمية التطابق الضبابي'
      );
    }

    if (this.modelMetrics.error_patterns['amount_errors'] > totalErrors * 0.3) {
      this.modelMetrics.improvement_suggestions.push(
        'أخطاء في استخراج المبالغ - يُنصح بتحسين معالجة الأرقام والعملات'
      );
    }

    if (this.modelMetrics.error_patterns['slow_processing'] > 5) {
      this.modelMetrics.improvement_suggestions.push(
        'وقت معالجة بطيء في بعض الحالات - يُنصح بتحسين الأداء أو استخدام معالجة خلفية'
      );
    }

    // User satisfaction analysis
    if (this.modelMetrics.user_satisfaction_trend.length >= 5) {
      const recentSatisfaction = this.modelMetrics.user_satisfaction_trend.slice(-5).reduce((a, b) => a + b) / 5;
      
      if (recentSatisfaction < 3.5) {
        this.modelMetrics.improvement_suggestions.push(
          'رضا المستخدمين منخفض - يُنصح بمراجعة تجربة المستخدم وتحسين دقة النتائج'
        );
      }
    }
  }

  /**
   * Get confidence range for analysis
   */
  private getConfidenceRange(confidence: number): string {
    if (confidence >= 90) return '90-100';
    if (confidence >= 80) return '80-89';
    if (confidence >= 70) return '70-79';
    if (confidence >= 60) return '60-69';
    return 'below-60';
  }

  /**
   * Get current adaptive thresholds
   */
  getAdaptiveThresholds(): AdaptiveThresholds {
    return { ...this.currentThresholds };
  }

  /**
   * Get current model metrics
   */
  getModelMetrics(): ModelMetrics {
    return { ...this.modelMetrics };
  }

  /**
   * Recommend action based on confidence score
   */
  recommendAction(confidenceScore: number): {
    action: 'auto_approve' | 'manual_review' | 'reject';
    reason: string;
    confidence_level: 'high' | 'medium' | 'low';
  } {
    if (confidenceScore >= this.currentThresholds.auto_approval_threshold) {
      return {
        action: 'auto_approve',
        reason: 'الثقة عالية - موافقة تلقائية',
        confidence_level: 'high'
      };
    } else if (confidenceScore >= this.currentThresholds.manual_review_threshold) {
      return {
        action: 'manual_review',
        reason: 'الثقة متوسطة - يحتاج مراجعة يدوية',
        confidence_level: 'medium'
      };
    } else {
      return {
        action: 'reject',
        reason: 'الثقة منخفضة - يُنصح بالرفض أو إعادة المعالجة',
        confidence_level: 'low'
      };
    }
  }

  /**
   * Export learning data for analysis
   */
  exportLearningData(): {
    data: LearningData[];
    thresholds: AdaptiveThresholds;
    metrics: ModelMetrics;
    exported_at: string;
  } {
    return {
      data: this.learningData,
      thresholds: this.currentThresholds,
      metrics: this.modelMetrics,
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Import learning data (for model persistence)
   */
  importLearningData(exportedData: {
    data: LearningData[];
    thresholds: AdaptiveThresholds;
    metrics: ModelMetrics;
  }): void {
    this.learningData = exportedData.data;
    this.currentThresholds = exportedData.thresholds;
    this.modelMetrics = exportedData.metrics;
  }

  /**
   * Get learning statistics
   */
  getLearningStatistics() {
    const totalEntries = this.learningData.length;
    if (totalEntries === 0) {
      return {
        total_entries: 0,
        accuracy_rate: 0,
        avg_confidence: 0,
        avg_satisfaction: 0,
        improvement_rate: 0
      };
    }

    const correctEntries = this.learningData.filter(d => d.is_correct).length;
    const avgConfidence = this.learningData.reduce((sum, d) => sum + d.confidence_scores.overall_confidence, 0) / totalEntries;
    const avgSatisfaction = this.learningData.reduce((sum, d) => sum + d.feedback_rating, 0) / totalEntries;
    
    // Calculate improvement rate (comparing first 25% vs last 25%)
    let improvementRate = 0;
    if (totalEntries >= 20) {
      const firstQuarter = this.learningData.slice(0, Math.floor(totalEntries * 0.25));
      const lastQuarter = this.learningData.slice(-Math.floor(totalEntries * 0.25));
      
      const firstAccuracy = firstQuarter.filter(d => d.is_correct).length / firstQuarter.length;
      const lastAccuracy = lastQuarter.filter(d => d.is_correct).length / lastQuarter.length;
      
      improvementRate = ((lastAccuracy - firstAccuracy) / firstAccuracy) * 100;
    }

    return {
      total_entries: totalEntries,
      accuracy_rate: (correctEntries / totalEntries) * 100,
      avg_confidence: Math.round(avgConfidence),
      avg_satisfaction: Math.round(avgSatisfaction * 20), // Convert 1-5 scale to percentage
      improvement_rate: Math.round(improvementRate)
    };
  }
}

// Export singleton instance
export const adaptiveLearning = new AdaptiveLearningPipeline();

// Export hook for React components
export function useAdaptiveLearning() {
  return {
    addLearningData: adaptiveLearning.addLearningData.bind(adaptiveLearning),
    getAdaptiveThresholds: adaptiveLearning.getAdaptiveThresholds.bind(adaptiveLearning),
    getModelMetrics: adaptiveLearning.getModelMetrics.bind(adaptiveLearning),
    recommendAction: adaptiveLearning.recommendAction.bind(adaptiveLearning),
    exportLearningData: adaptiveLearning.exportLearningData.bind(adaptiveLearning),
    importLearningData: adaptiveLearning.importLearningData.bind(adaptiveLearning),
    getLearningStatistics: adaptiveLearning.getLearningStatistics.bind(adaptiveLearning)
  };
}

export default AdaptiveLearningPipeline;