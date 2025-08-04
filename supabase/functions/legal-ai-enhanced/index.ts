import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// نظام التعلم التكيفي المتقدم
class AdaptiveLearningSystem {
  private learningPatterns: Map<string, any> = new Map();
  private userPreferences: Map<string, any> = new Map();
  private performanceMetrics: Map<string, any> = new Map();

  constructor() {
    this.initializeLearning();
  }

  private async initializeLearning() {
    // تحميل الأنماط المتعلمة من قاعدة البيانات
    try {
      const { data: patterns } = await supabase
        .from('learning_patterns')
        .select('*')
        .order('confidence', { ascending: false });

      if (patterns) {
        patterns.forEach(pattern => {
          this.learningPatterns.set(pattern.pattern_key, pattern);
        });
      }
    } catch (error) {
      console.warn('Failed to load learning patterns:', error);
    }
  }

  // تحليل نمط المستخدم وتعلم التفضيلات
  async analyzeUserPattern(userId: string, query: string, response: any, feedback?: number) {
    const userKey = `user_${userId}`;
    
    // تحديث تفضيلات المستخدم
    const currentPrefs = this.userPreferences.get(userKey) || {
      query_types: {},
      complexity_preference: 'moderate',
      response_style: 'detailed',
      topics_of_interest: [],
      satisfaction_trend: [],
      learning_score: 0.5
    };

    // تحليل نوع الاستفسار
    const queryType = this.detectQueryType(query);
    currentPrefs.query_types[queryType] = (currentPrefs.query_types[queryType] || 0) + 1;

    // تحليل مستوى التعقيد المفضل
    if (feedback && feedback >= 4) {
      const complexity = this.detectComplexity(query);
      if (complexity === currentPrefs.complexity_preference || 
          (complexity === 'complex' && feedback === 5)) {
        currentPrefs.complexity_preference = complexity;
      }
    }

    // تحديث اتجاه الرضا
    if (feedback) {
      currentPrefs.satisfaction_trend.push({
        timestamp: new Date(),
        rating: feedback,
        query_type: queryType
      });
      
      // الاحتفاظ بآخر 20 تقييم فقط
      if (currentPrefs.satisfaction_trend.length > 20) {
        currentPrefs.satisfaction_trend = currentPrefs.satisfaction_trend.slice(-20);
      }
    }

    // حساب نقاط التعلم
    currentPrefs.learning_score = this.calculateLearningScore(currentPrefs);

    this.userPreferences.set(userKey, currentPrefs);

    // حفظ في قاعدة البيانات
    await this.persistUserPreferences(userId, currentPrefs);

    return currentPrefs;
  }

  // اكتشاف أنماط جديدة في الاستفسارات
  async discoverPatterns(queries: Array<{ query: string, response: any, feedback: number }>) {
    const patterns = new Map();

    // تحليل الأنماط الناجحة (تقييم 4 أو 5)
    const successfulQueries = queries.filter(q => q.feedback >= 4);
    
    for (const { query, response } of successfulQueries) {
      // استخراج الكلمات المفتاحية
      const keywords = this.extractKeywords(query);
      
      // تحليل أنماط الاستجابة الناجحة
      const responsePattern = this.analyzeResponsePattern(response);
      
      // إنشاء نمط جديد
      const patternKey = keywords.slice(0, 3).join('_');
      
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          keywords,
          response_pattern: responsePattern,
          success_count: 0,
          confidence: 0,
          examples: []
        });
      }
      
      const pattern = patterns.get(patternKey);
      pattern.success_count++;
      pattern.examples.push({ query, response });
      pattern.confidence = Math.min(pattern.success_count / 10, 0.95);
    }

    // حفظ الأنماط الجديدة
    for (const [key, pattern] of patterns) {
      if (pattern.confidence > 0.3) {
        this.learningPatterns.set(key, pattern);
        await this.persistLearningPattern(key, pattern);
      }
    }

    return Array.from(patterns.values());
  }

  // تطبيق التعلم المخصص على الاستفسار
  async applyPersonalizedLearning(userId: string, query: string): Promise<any> {
    const userKey = `user_${userId}`;
    const userPrefs = this.userPreferences.get(userKey);
    
    if (!userPrefs) {
      return null;
    }

    // تخصيص مستوى التعقيد
    const complexity = userPrefs.complexity_preference;
    
    // تخصيص أسلوب الاستجابة
    const responseStyle = userPrefs.response_style;
    
    // إيجاد أنماط ذات صلة
    const relevantPatterns = this.findRelevantPatterns(query);
    
    return {
      preferred_complexity: complexity,
      response_style: responseStyle,
      relevant_patterns: relevantPatterns,
      personalization_score: userPrefs.learning_score,
      suggested_approach: this.suggestApproach(userPrefs, query)
    };
  }

  // اقتراح النهج الأمثل بناءً على التعلم
  private suggestApproach(userPrefs: any, query: string): string {
    const queryType = this.detectQueryType(query);
    const userTypePreference = userPrefs.query_types[queryType] || 0;
    
    if (userTypePreference > 5 && userPrefs.learning_score > 0.7) {
      return 'personalized_expert';
    } else if (userPrefs.complexity_preference === 'simple') {
      return 'simplified_explanation';
    } else if (userPrefs.complexity_preference === 'complex') {
      return 'detailed_analysis';
    }
    
    return 'balanced_approach';
  }

  // حساب نقاط التعلم
  private calculateLearningScore(prefs: any): number {
    if (prefs.satisfaction_trend.length === 0) return 0.5;
    
    const avgSatisfaction = prefs.satisfaction_trend
      .reduce((sum: number, item: any) => sum + item.rating, 0) / prefs.satisfaction_trend.length;
    
    const totalQueries = Object.values(prefs.query_types)
      .reduce((sum: number, count: any) => sum + count, 0);
    
    const experienceScore = Math.min(totalQueries / 50, 1); // خبرة تصل إلى 50 استفسار
    const satisfactionScore = (avgSatisfaction - 1) / 4; // تحويل من 1-5 إلى 0-1
    
    return (satisfactionScore * 0.7 + experienceScore * 0.3);
  }

  // اكتشاف نوع الاستفسار
  private detectQueryType(query: string): string {
    if (/عقد|contract/i.test(query)) return 'contract';
    if (/فاتورة|invoice/i.test(query)) return 'invoice';
    if (/عميل|customer/i.test(query)) return 'customer';
    if (/مركبة|vehicle/i.test(query)) return 'vehicle';
    if (/قانون|legal/i.test(query)) return 'legal';
    if (/تقرير|report/i.test(query)) return 'report';
    return 'general';
  }

  // اكتشاف مستوى التعقيد
  private detectComplexity(query: string): string {
    const complexityIndicators = {
      simple: ['ما هو', 'كيف', 'متى', 'أين'],
      moderate: ['إجراءات', 'خطوات', 'طريقة'],
      complex: ['تحليل', 'مقارنة', 'تقييم', 'استراتيجية']
    };

    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => query.includes(indicator))) {
        return level;
      }
    }
    return 'moderate';
  }

  // استخراج الكلمات المفتاحية
  private extractKeywords(query: string): string[] {
    // إزالة كلمات الوقف والكلمات الشائعة
    const stopWords = ['في', 'من', 'إلى', 'على', 'هل', 'ما', 'كيف', 'متى', 'أين', 'لماذا'];
    const words = query.toLowerCase().split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // إرجاع أهم الكلمات
    return words.slice(0, 5);
  }

  // تحليل نمط الاستجابة
  private analyzeResponsePattern(response: any): any {
    return {
      length: response.advice ? response.advice.length : 0,
      has_examples: /مثال|example/i.test(response.advice || ''),
      has_steps: /خطوة|step/i.test(response.advice || ''),
      has_numbers: /\d+/.test(response.advice || ''),
      complexity_level: response.complexity_level || 'moderate'
    };
  }

  // إيجاد الأنماط ذات الصلة
  private findRelevantPatterns(query: string): any[] {
    const queryKeywords = this.extractKeywords(query);
    const relevantPatterns = [];

    for (const [key, pattern] of this.learningPatterns) {
      const similarity = this.calculateSimilarity(queryKeywords, pattern.keywords);
      if (similarity > 0.3) {
        relevantPatterns.push({
          ...pattern,
          similarity,
          pattern_key: key
        });
      }
    }

    return relevantPatterns.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  // حساب التشابه بين مجموعتين من الكلمات
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const intersection = keywords1.filter(k => keywords2.includes(k));
    const union = [...new Set([...keywords1, ...keywords2])];
    return intersection.length / union.length;
  }

  // حفظ تفضيلات المستخدم
  private async persistUserPreferences(userId: string, preferences: any) {
    try {
      await supabase.from('user_learning_preferences')
        .upsert({
          user_id: userId,
          preferences: preferences,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to persist user preferences:', error);
    }
  }

  // حفظ نمط التعلم
  private async persistLearningPattern(patternKey: string, pattern: any) {
    try {
      await supabase.from('learning_patterns')
        .upsert({
          pattern_key: patternKey,
          keywords: pattern.keywords,
          response_pattern: pattern.response_pattern,
          success_count: pattern.success_count,
          confidence: pattern.confidence,
          examples: pattern.examples.slice(0, 5), // حفظ 5 أمثلة فقط
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to persist learning pattern:', error);
    }
  }
}

// نظام التخزين المؤقت الذكي المحسن
class SmartCacheSystem {
  private cache: Map<string, any> = new Map();
  private cacheMetrics: Map<string, any> = new Map();
  private preloadQueue: Set<string> = new Set();

  constructor() {
    this.initializeCache();
    this.startCacheOptimization();
  }

  private async initializeCache() {
    // تحميل العناصر المتكررة في الذاكرة المؤقتة
    try {
      const { data: frequentQueries } = await supabase
        .from('cache_optimization')
        .select('*')
        .gte('access_frequency', 5)
        .order('access_frequency', { ascending: false })
        .limit(50);

      if (frequentQueries) {
        for (const item of frequentQueries) {
          this.cache.set(item.cache_key, {
            data: item.cached_data,
            timestamp: new Date(item.updated_at),
            hitCount: item.access_frequency,
            ttl: item.ttl_minutes * 60 * 1000
          });
        }
      }
    } catch (error) {
      console.warn('Failed to initialize cache:', error);
    }
  }

  // تحسين ذكي للذاكرة المؤقتة
  private startCacheOptimization() {
    setInterval(() => {
      this.optimizeCache();
      this.preloadPopularContent();
    }, 5 * 60 * 1000); // كل 5 دقائق
  }

  // إضافة ذكية للذاكرة المؤقتة
  async smartSet(key: string, data: any, options: {
    importance?: 'low' | 'medium' | 'high';
    pattern?: string;
    userContext?: string;
  } = {}) {
    const now = new Date();
    const { importance = 'medium', pattern, userContext } = options;

    // حساب TTL بناءً على الأهمية ونوع البيانات
    let ttl = 30 * 60 * 1000; // 30 دقيقة افتراضي
    if (importance === 'high') ttl = 2 * 60 * 60 * 1000; // ساعتان
    if (importance === 'low') ttl = 10 * 60 * 1000; // 10 دقائق

    // تخزين محسن
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      importance,
      pattern,
      userContext,
      hitCount: 0,
      lastAccess: now
    });

    // تحديث مقاييس الذاكرة المؤقتة
    this.updateCacheMetrics(key, 'set');

    // حفظ في قاعدة البيانات للعناصر المهمة
    if (importance === 'high') {
      await this.persistCacheItem(key, data, ttl);
    }
  }

  // استرجاع ذكي من الذاكرة المؤقتة
  async smartGet(key: string, context?: any): Promise<any> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.updateCacheMetrics(key, 'miss');
      return null;
    }

    const now = new Date();
    
    // فحص انتهاء الصلاحية
    if (now.getTime() - item.timestamp.getTime() > item.ttl) {
      this.cache.delete(key);
      this.updateCacheMetrics(key, 'expired');
      return null;
    }

    // تحديث إحصائيات الوصول
    item.hitCount++;
    item.lastAccess = now;
    this.updateCacheMetrics(key, 'hit');

    // تحسين TTL بناءً على التكرار
    if (item.hitCount > 10) {
      item.ttl = Math.min(item.ttl * 1.2, 4 * 60 * 60 * 1000); // زيادة TTL للعناصر الشائعة
    }

    return item.data;
  }

  // تنبؤ وتحميل مسبق للمحتوى
  private async preloadPopularContent() {
    // تحليل الأنماط وتحديد المحتوى للتحميل المسبق
    const popularPatterns = await this.analyzeAccessPatterns();
    
    for (const pattern of popularPatterns) {
      if (!this.cache.has(pattern.predicted_key) && !this.preloadQueue.has(pattern.predicted_key)) {
        this.preloadQueue.add(pattern.predicted_key);
        this.preloadContent(pattern);
      }
    }
  }

  // تحليل أنماط الوصول
  private async analyzeAccessPatterns(): Promise<any[]> {
    try {
      const { data: patterns } = await supabase
        .rpc('analyze_access_patterns', {
          timeframe_hours: 24
        });

      return patterns || [];
    } catch (error) {
      console.warn('Failed to analyze access patterns:', error);
      return [];
    }
  }

  // تحميل محتوى مسبق
  private async preloadContent(pattern: any) {
    try {
      // منطق تحميل المحتوى المتوقع
      const content = await this.generatePredictedContent(pattern);
      if (content) {
        await this.smartSet(pattern.predicted_key, content, {
          importance: 'medium',
          pattern: pattern.pattern_type
        });
      }
    } catch (error) {
      console.warn('Failed to preload content:', error);
    } finally {
      this.preloadQueue.delete(pattern.predicted_key);
    }
  }

  // توليد محتوى متوقع
  private async generatePredictedContent(pattern: any): Promise<any> {
    // تنفيذ منطق التنبؤ والتوليد
    if (pattern.pattern_type === 'financial_query') {
      return await this.preloadFinancialData(pattern.company_id);
    }
    
    return null;
  }

  // تحميل مسبق للبيانات المالية
  private async preloadFinancialData(companyId: string) {
    try {
      const { data: summary } = await supabase
        .rpc('get_financial_summary', { company_id: companyId });
      return summary;
    } catch (error) {
      console.warn('Failed to preload financial data:', error);
      return null;
    }
  }

  // تحسين الذاكرة المؤقتة
  private optimizeCache() {
    const now = new Date();
    const itemsToRemove = [];

    // إزالة العناصر منتهية الصلاحية
    for (const [key, item] of this.cache) {
      if (now.getTime() - item.timestamp.getTime() > item.ttl) {
        itemsToRemove.push(key);
      }
    }

    // إزالة العناصر قليلة الاستخدام إذا كانت الذاكرة ممتلئة
    if (this.cache.size > 1000) {
      const sortedItems = Array.from(this.cache.entries())
        .sort((a, b) => {
          const aScore = this.calculateItemScore(a[1]);
          const bScore = this.calculateItemScore(b[1]);
          return aScore - bScore;
        });

      const itemsToRemoveCount = Math.min(100, sortedItems.length - 800);
      for (let i = 0; i < itemsToRemoveCount; i++) {
        itemsToRemove.push(sortedItems[i][0]);
      }
    }

    // إزالة العناصر المحددة
    itemsToRemove.forEach(key => {
      this.cache.delete(key);
      this.updateCacheMetrics(key, 'evicted');
    });
  }

  // حساب نقاط العنصر للتحسين
  private calculateItemScore(item: any): number {
    const now = new Date();
    const ageHours = (now.getTime() - item.lastAccess.getTime()) / (1000 * 60 * 60);
    const hitRate = item.hitCount / Math.max(1, ageHours);
    
    let importanceMultiplier = 1;
    if (item.importance === 'high') importanceMultiplier = 3;
    if (item.importance === 'medium') importanceMultiplier = 2;
    
    return hitRate * importanceMultiplier;
  }

  // تحديث مقاييس الذاكرة المؤقتة
  private updateCacheMetrics(key: string, operation: string) {
    const now = new Date();
    const hour = now.getHours();
    const dateKey = now.toISOString().split('T')[0];
    const metricKey = `${dateKey}_${hour}`;

    if (!this.cacheMetrics.has(metricKey)) {
      this.cacheMetrics.set(metricKey, {
        hits: 0,
        misses: 0,
        sets: 0,
        expired: 0,
        evicted: 0
      });
    }

    const metrics = this.cacheMetrics.get(metricKey);
    if (operation in metrics) {
      metrics[operation]++;
    }
  }

  // حفظ عنصر الذاكرة المؤقتة
  private async persistCacheItem(key: string, data: any, ttl: number) {
    try {
      await supabase.from('cache_optimization')
        .upsert({
          cache_key: key,
          cached_data: data,
          ttl_minutes: ttl / (60 * 1000),
          access_frequency: 1,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to persist cache item:', error);
    }
  }

  // الحصول على إحصائيات الذاكرة المؤقتة
  getCacheStats() {
    const totalRequests = Array.from(this.cacheMetrics.values())
      .reduce((sum, metrics) => sum + metrics.hits + metrics.misses, 0);
    
    const totalHits = Array.from(this.cacheMetrics.values())
      .reduce((sum, metrics) => sum + metrics.hits, 0);

    return {
      hit_rate: totalRequests > 0 ? totalHits / totalRequests : 0,
      cache_size: this.cache.size,
      total_requests: totalRequests,
      preload_queue_size: this.preloadQueue.size
    };
  }
}

// نظام التحليل التنبؤي
class PredictiveAnalysisSystem {
  private patterns: Map<string, any> = new Map();
  private trends: Map<string, any[]> = new Map();

  // تحليل الاتجاهات والتنبؤ
  async analyzeTrends(companyId: string, timeframe: number = 30): Promise<any> {
    try {
      // جمع البيانات التاريخية
      const historicalData = await this.gatherHistoricalData(companyId, timeframe);
      
      // تحليل الأنماط
      const patterns = this.detectPatterns(historicalData);
      
      // توليد التنبؤات
      const predictions = this.generatePredictions(patterns);
      
      // تقييم المخاطر
      const riskAssessment = this.assessRisks(patterns, predictions);
      
      return {
        patterns,
        predictions,
        risk_assessment: riskAssessment,
        recommendations: this.generateRecommendations(predictions, riskAssessment)
      };
    } catch (error) {
      console.error('Error in predictive analysis:', error);
      return null;
    }
  }

  // جمع البيانات التاريخية
  private async gatherHistoricalData(companyId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [invoices, contracts, queries] = await Promise.all([
      supabase.from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString()),
      
      supabase.from('contracts')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString()),
      
      supabase.from('legal_ai_queries')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
    ]);

    return {
      invoices: invoices.data || [],
      contracts: contracts.data || [],
      queries: queries.data || []
    };
  }

  // اكتشاف الأنماط
  private detectPatterns(data: any) {
    return {
      invoice_patterns: this.analyzeInvoicePatterns(data.invoices),
      contract_patterns: this.analyzeContractPatterns(data.contracts),
      query_patterns: this.analyzeQueryPatterns(data.queries),
      seasonal_patterns: this.detectSeasonalPatterns(data)
    };
  }

  // تحليل أنماط الفواتير
  private analyzeInvoicePatterns(invoices: any[]) {
    const monthly = new Map();
    const weekday = new Array(7).fill(0);

    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      monthly.set(monthKey, (monthly.get(monthKey) || 0) + invoice.total_amount);
      weekday[date.getDay()] += invoice.total_amount;
    });

    return {
      monthly_revenue: Array.from(monthly.entries()),
      weekday_distribution: weekday,
      average_invoice_value: invoices.length > 0 
        ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length 
        : 0,
      payment_delay_trend: this.calculatePaymentDelays(invoices)
    };
  }

  // تحليل أنماط العقود
  private analyzeContractPatterns(contracts: any[]) {
    const statusDistribution = new Map();
    const monthlyContracts = new Map();

    contracts.forEach(contract => {
      statusDistribution.set(contract.status, (statusDistribution.get(contract.status) || 0) + 1);
      
      const date = new Date(contract.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyContracts.set(monthKey, (monthlyContracts.get(monthKey) || 0) + 1);
    });

    return {
      status_distribution: Array.from(statusDistribution.entries()),
      monthly_contracts: Array.from(monthlyContracts.entries()),
      contract_value_trend: this.analyzeContractValues(contracts),
      renewal_patterns: this.analyzeRenewalPatterns(contracts)
    };
  }

  // تحليل أنماط الاستفسارات
  private analyzeQueryPatterns(queries: any[]) {
    const typeDistribution = new Map();
    const hourlyDistribution = new Array(24).fill(0);

    queries.forEach(query => {
      typeDistribution.set(query.query_type, (typeDistribution.get(query.query_type) || 0) + 1);
      
      const hour = new Date(query.created_at).getHours();
      hourlyDistribution[hour]++;
    });

    return {
      type_distribution: Array.from(typeDistribution.entries()),
      hourly_usage: hourlyDistribution,
      complexity_trend: this.analyzeComplexityTrend(queries),
      satisfaction_trend: this.analyzeSatisfactionTrend(queries)
    };
  }

  // توليد التنبؤات
  private generatePredictions(patterns: any) {
    return {
      revenue_forecast: this.forecastRevenue(patterns.invoice_patterns),
      contract_forecast: this.forecastContracts(patterns.contract_patterns),
      query_volume_forecast: this.forecastQueryVolume(patterns.query_patterns),
      seasonal_forecast: this.forecastSeasonalTrends(patterns.seasonal_patterns)
    };
  }

  // تقييم المخاطر
  private assessRisks(patterns: any, predictions: any) {
    const risks = [];

    // تحليل مخاطر الإيرادات
    if (predictions.revenue_forecast.trend === 'declining') {
      risks.push({
        type: 'revenue_decline',
        severity: 'high',
        probability: 0.7,
        description: 'انخفاض متوقع في الإيرادات',
        recommendations: ['مراجعة استراتيجية التسعير', 'تحسين عمليات التحصيل']
      });
    }

    // تحليل مخاطر العقود
    if (patterns.contract_patterns.renewal_patterns.renewal_rate < 0.8) {
      risks.push({
        type: 'contract_renewal',
        severity: 'medium',
        probability: 0.6,
        description: 'انخفاض معدل تجديد العقود',
        recommendations: ['تحسين خدمة العملاء', 'مراجعة شروط العقود']
      });
    }

    return risks;
  }

  // توليد التوصيات
  private generateRecommendations(predictions: any, risks: any[]) {
    const recommendations = [];

    // توصيات بناءً على التنبؤات
    if (predictions.revenue_forecast.growth_rate > 0.1) {
      recommendations.push({
        type: 'growth_opportunity',
        priority: 'high',
        description: 'فرصة نمو في الإيرادات',
        actions: ['توسيع الخدمات', 'زيادة الاستثمار في التسويق']
      });
    }

    // توصيات بناءً على المخاطر
    risks.forEach(risk => {
      recommendations.push({
        type: 'risk_mitigation',
        priority: risk.severity,
        description: `تخفيف مخاطر: ${risk.description}`,
        actions: risk.recommendations
      });
    });

    return recommendations;
  }

  // مساعدات تحليل إضافية
  private calculatePaymentDelays(invoices: any[]) {
    const delays = invoices
      .filter(inv => inv.payment_status === 'paid' && inv.due_date)
      .map(inv => {
        const dueDate = new Date(inv.due_date);
        const paidDate = new Date(inv.updated_at);
        return Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      });

    return delays.length > 0 ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length : 0;
  }

  private analyzeContractValues(contracts: any[]) {
    return contracts.map(contract => ({
      date: contract.created_at,
      value: contract.contract_amount
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private analyzeRenewalPatterns(contracts: any[]) {
    const renewals = contracts.filter(c => c.status === 'renewed').length;
    const total = contracts.length;
    return {
      renewal_rate: total > 0 ? renewals / total : 0,
      total_contracts: total,
      renewed_contracts: renewals
    };
  }

  private analyzeComplexityTrend(queries: any[]) {
    // تحليل اتجاه تعقيد الاستفسارات
    return queries.map(q => ({
      date: q.created_at,
      complexity: q.response_time || 0
    }));
  }

  private analyzeSatisfactionTrend(queries: any[]) {
    // تحليل اتجاه رضا المستخدمين
    return queries.filter(q => q.user_rating).map(q => ({
      date: q.created_at,
      rating: q.user_rating
    }));
  }

  private detectSeasonalPatterns(data: any) {
    // اكتشاف الأنماط الموسمية
    const monthlyData = new Array(12).fill(0);
    
    data.invoices.forEach((invoice: any) => {
      const month = new Date(invoice.created_at).getMonth();
      monthlyData[month] += invoice.total_amount;
    });

    return {
      monthly_revenue: monthlyData,
      peak_months: this.findPeakMonths(monthlyData),
      seasonal_variance: this.calculateVariance(monthlyData)
    };
  }

  private forecastRevenue(invoicePatterns: any) {
    const monthlyRevenue = invoicePatterns.monthly_revenue;
    if (monthlyRevenue.length < 3) {
      return { trend: 'insufficient_data', growth_rate: 0 };
    }

    const values = monthlyRevenue.map((item: any) => item[1]);
    const trend = this.calculateTrend(values);
    const growth_rate = this.calculateGrowthRate(values);

    return {
      trend: growth_rate > 0.05 ? 'growing' : growth_rate < -0.05 ? 'declining' : 'stable',
      growth_rate,
      next_month_forecast: values[values.length - 1] * (1 + growth_rate),
      confidence: Math.min(values.length / 12, 1) // الثقة تزيد مع المزيد من البيانات
    };
  }

  private forecastContracts(contractPatterns: any) {
    // تنبؤ العقود
    return {
      expected_renewals: contractPatterns.renewal_patterns.renewal_rate,
      new_contracts_forecast: this.forecastNewContracts(contractPatterns)
    };
  }

  private forecastQueryVolume(queryPatterns: any) {
    // تنبؤ حجم الاستفسارات
    const hourlyUsage = queryPatterns.hourly_usage;
    const peakHours = this.findPeakHours(hourlyUsage);
    
    return {
      peak_hours: peakHours,
      daily_forecast: hourlyUsage.reduce((sum: number, hour: number) => sum + hour, 0),
      usage_pattern: this.classifyUsagePattern(hourlyUsage)
    };
  }

  private forecastSeasonalTrends(seasonalPatterns: any) {
    return {
      peak_season: seasonalPatterns.peak_months,
      variance: seasonalPatterns.seasonal_variance,
      predictability: seasonalPatterns.seasonal_variance < 0.3 ? 'high' : 'low'
    };
  }

  // دوال مساعدة للحسابات الإحصائية
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0] || 1;
    const last = values[values.length - 1] || 1;
    return (last - first) / first;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // معامل الاختلاف
  }

  private findPeakMonths(monthlyData: number[]): number[] {
    const avg = monthlyData.reduce((sum, val) => sum + val, 0) / monthlyData.length;
    return monthlyData
      .map((val, index) => ({ value: val, month: index }))
      .filter(item => item.value > avg * 1.2)
      .map(item => item.month);
  }

  private findPeakHours(hourlyData: number[]): number[] {
    const avg = hourlyData.reduce((sum, val) => sum + val, 0) / hourlyData.length;
    return hourlyData
      .map((val, index) => ({ value: val, hour: index }))
      .filter(item => item.value > avg * 1.5)
      .map(item => item.hour);
  }

  private forecastNewContracts(contractPatterns: any): number {
    const monthlyContracts = contractPatterns.monthly_contracts;
    if (monthlyContracts.length === 0) return 0;
    
    const avgMonthly = monthlyContracts.reduce((sum: number, item: any) => sum + item[1], 0) / monthlyContracts.length;
    return Math.round(avgMonthly * 1.1); // توقع زيادة 10%
  }

  private classifyUsagePattern(hourlyUsage: number[]): string {
    const businessHours = hourlyUsage.slice(8, 18).reduce((sum, val) => sum + val, 0);
    const totalUsage = hourlyUsage.reduce((sum, val) => sum + val, 0);
    
    const businessHourRatio = businessHours / totalUsage;
    
    if (businessHourRatio > 0.8) return 'business_focused';
    if (businessHourRatio > 0.6) return 'mixed_usage';
    return 'round_the_clock';
  }
}

// إنشاء مثيلات الأنظمة
const adaptiveLearning = new AdaptiveLearningSystem();
const smartCache = new SmartCacheSystem();
const predictiveAnalysis = new PredictiveAnalysisSystem();

// باقي Edge Function موجود...