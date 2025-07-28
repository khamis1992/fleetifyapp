import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePerformanceMonitor, useOptimizationSuggestions } from '@/hooks/useEnhancedPerformanceMonitor';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { 
  Shield, 
  Zap, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Eye
} from 'lucide-react';

export const EnhancedSecurityDashboard: React.FC = () => {
  const { hasGlobalAccess } = useUnifiedCompanyAccess();
  const { data: performanceStats, isLoading: isLoadingPerf } = usePerformanceMonitor();
  const { data: suggestions, isLoading: isLoadingSuggestions } = useOptimizationSuggestions();

  if (isLoadingPerf || isLoadingSuggestions) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div className="animate-pulse h-32 bg-muted rounded-lg"></div>
        <div className="animate-pulse h-32 bg-muted rounded-lg"></div>
        <div className="animate-pulse h-32 bg-muted rounded-lg"></div>
      </div>
    );
  }

  const getPerformanceColor = (value: number, type: 'cache' | 'time' | 'memory') => {
    switch (type) {
      case 'cache':
        return value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
      case 'time':
        return value <= 500 ? 'text-green-600' : value <= 1000 ? 'text-yellow-600' : 'text-red-600';
      case 'memory':
        return value <= 50 ? 'text-green-600' : value <= 100 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">استجابة النظام</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(performanceStats?.performance.queryExecutionTime || 0, 'time')}`}>
              {performanceStats?.performance.queryExecutionTime?.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">زمن الاستجابة المتوسط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل التخزين المؤقت</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(performanceStats?.performance.cacheHitRate || 0, 'cache')}`}>
              {performanceStats?.performance.cacheHitRate?.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">نسبة إصابة الذاكرة المؤقتة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الذاكرة المستخدمة</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(performanceStats?.performance.memoryUsage || 0, 'memory')}`}>
              {formatMemory(performanceStats?.performance.memoryUsage || 0)}
            </div>
            <p className="text-xs text-muted-foreground">استهلاك الذاكرة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التهديدات الأمنية</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${performanceStats?.security.suspiciousAccessAttempts ? 'text-red-600' : 'text-green-600'}`}>
              {performanceStats?.security.suspiciousAccessAttempts || 0}
            </div>
            <p className="text-xs text-muted-foreground">محاولات وصول مشبوهة</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              تفاصيل الأمان
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">محاولات الوصول العابر للشركات</span>
              <Badge variant={performanceStats?.security.crossCompanyAccessAttempts ? "destructive" : "outline"}>
                {performanceStats?.security.crossCompanyAccessAttempts || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">فشل المصادقة</span>
              <Badge variant={performanceStats?.security.failedAuthentications ? "destructive" : "outline"}>
                {performanceStats?.security.failedAuthentications || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">آخر فحص أمني</span>
              <span className="text-xs text-muted-foreground">
                {new Date(performanceStats?.security.lastSecurityScan || '').toLocaleString('ar-KW')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              سلامة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">السجلات المعزولة</span>
              <Badge variant={performanceStats?.dataIntegrity.orphanedRecords ? "destructive" : "outline"}>
                {performanceStats?.dataIntegrity.orphanedRecords || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">البيانات غير المتسقة</span>
              <Badge variant={performanceStats?.dataIntegrity.inconsistentData ? "destructive" : "outline"}>
                {performanceStats?.dataIntegrity.inconsistentData || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">آخر فحص للسلامة</span>
              <span className="text-xs text-muted-foreground">
                {new Date(performanceStats?.dataIntegrity.lastIntegrityCheck || '').toLocaleString('ar-KW')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {performanceStats?.recommendations && performanceStats.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              توصيات التحسين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performanceStats.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              اقتراحات التحسين المتقدمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <Badge variant={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority === 'high' ? 'عالي' : 
                       suggestion.priority === 'medium' ? 'متوسط' : 'منخفض'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  <p className="text-xs text-green-600">{suggestion.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Access Warning for Non-Admins */}
      {!hasGlobalAccess && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            تظهر هذه اللوحة بيانات شركتكم فقط. للوصول الكامل لجميع الشركات، يرجى الاتصال بمدير النظام.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};