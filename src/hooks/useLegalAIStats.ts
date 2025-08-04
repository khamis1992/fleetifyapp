import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// أنواع البيانات للإحصائيات
export interface LegalAIStats {
  performance_overview: {
    total_queries: number;
    cost_efficiency: number;
    user_satisfaction: number;
    average_response_time: number;
    cache_hit_rate: number;
    local_knowledge_hit_rate: number;
    api_usage_rate: number;
    total_cost_saved: number;
  };
  efficiency_breakdown: {
    api_calls_saved: number;
    estimated_monthly_savings: number;
    instant_responses: number;
    local_responses: number;
  };
  cache_system: {
    hit_rate: number;
    total_entries: number;
    total_usage: number;
    total_cost_saved: number;
    total_tokens_saved: number;
    session_stats: {
      total_queries: number;
      cache_hits: number;
      api_calls: number;
      cost_saved: number;
      tokens_saved: number;
    };
    top_queries: Array<{
      query: string;
      country: string;
      usage_count: number;
    }>;
  };
  generated_at: string;
}

export interface LegalAIHealthStatus {
  status: string;
  message: string;
  version: string;
  last_optimization: string;
  performance: {
    total_queries: number;
    cost_efficiency: number;
    user_satisfaction: number;
    average_response_time: number;
  };
}

export interface LearningInsights {
  summary: {
    total_patterns: number;
    total_improvements: number;
    ratings_trend: number;
  };
  patterns: Array<{
    pattern_type: string;
    description: string;
    frequency: number;
    impact: string;
  }>;
  improvements: Array<{
    improvement_type: string;
    description: string;
    applied_at: string;
    impact_score: number;
  }>;
}

// عنوان API - استخدام Supabase Edge Function
const API_BASE_URL = '/functions/v1/legal-ai-api';

export const useLegalAIStats = () => {
  const [stats, setStats] = useState<LegalAIStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<LegalAIHealthStatus | null>(null);
  const [learningInsights, setLearningInsights] = useState<LearningInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب الإحصائيات
  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.message || 'فشل في جلب الإحصائيات');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في جلب الإحصائيات';
      setError(errorMessage);
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // جلب حالة صحة النظام
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    }
  };

  // جلب رؤى التعلم
  const fetchLearningInsights = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-insights`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLearningInsights(data.insights);
        }
      }
    } catch (error) {
      console.error('Error fetching learning insights:', error);
    }
  };

  // تحسين النظام
  const optimizeSystem = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('تم تحسين النظام بنجاح');
          // تحديث الإحصائيات بعد التحسين
          setTimeout(() => {
            fetchStats();
            fetchHealthStatus();
          }, 1000);
          return true;
        }
      }
      
      toast.error('فشل في تحسين النظام');
      return false;
    } catch (error) {
      toast.error('حدث خطأ في تحسين النظام');
      console.error('Error optimizing system:', error);
      return false;
    }
  };

  // تحديث جميع البيانات
  const refreshStats = async () => {
    await Promise.all([
      fetchStats(),
      fetchHealthStatus(),
      fetchLearningInsights()
    ]);
  };

  // تحميل البيانات عند بدء التشغيل
  useEffect(() => {
    refreshStats();
    
    // تحديث دوري كل 5 دقائق
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // حساب إحصائيات إضافية
  const getAdditionalMetrics = () => {
    if (!stats) return null;

    const { performance_overview, efficiency_breakdown } = stats;
    
    return {
      // معدل النجاح
      successRate: performance_overview.total_queries > 0 
        ? ((performance_overview.total_queries - 0) / performance_overview.total_queries * 100).toFixed(1)
        : '0',
      
      // التوفير اليومي المقدر
      dailySavings: (efficiency_breakdown.estimated_monthly_savings / 30).toFixed(2),
      
      // معدل الاستجابة السريعة
      fastResponseRate: performance_overview.cache_hit_rate + performance_overview.local_knowledge_hit_rate,
      
      // تقييم الأداء العام
      overallPerformance: (
        (performance_overview.cost_efficiency + 
         performance_overview.user_satisfaction + 
         (100 - performance_overview.average_response_time * 10)) / 3
      ).toFixed(1)
    };
  };

  return {
    stats,
    healthStatus,
    learningInsights,
    isLoading,
    error,
    additionalMetrics: getAdditionalMetrics(),
    
    // الوظائف
    fetchStats,
    fetchHealthStatus,
    fetchLearningInsights,
    optimizeSystem,
    refreshStats,
    
    // مساعدات
    clearError: () => setError(null)
  };
};

