import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  Eye,
  MousePointer
} from 'lucide-react';
import { runCompleteTestSuite, type TestResult } from '@/utils/responsiveTestSuite';
import { cn } from '@/lib/utils';

interface ResponsiveTestDashboardProps {
  className?: string;
}

/**
 * لوحة تحكم اختبارات الاستجابة للمطورين
 * تعرض نتائج الاختبارات وتوصيات التحسين
 */
export const ResponsiveTestDashboard: React.FC<ResponsiveTestDashboardProps> = ({ 
  className 
}) => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  // تشغيل الاختبارات
  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runCompleteTestSuite();
      setTestResults(results);
      setLastRunTime(new Date());
    } catch (error) {
      console.error('خطأ في تشغيل الاختبارات:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // تشغيل الاختبارات تلقائياً عند التحميل في بيئة التطوير
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      runTests();
    }
  }, []);

  // عرض نتيجة اختبار واحد
  const renderTestResult = (test: TestResult) => {
    const getStatusIcon = () => {
      if (test.passed) return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (test.score > 50) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      return <XCircle className="h-4 w-4 text-red-500" />;
    };

    const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-600';
      if (score >= 70) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div key={test.testName} className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium text-sm">{test.testName}</p>
            <p className="text-xs text-muted-foreground">{test.details}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("font-bold text-sm", getScoreColor(test.score))}>
            {test.score.toFixed(0)}%
          </p>
          {test.recommendations && (
            <Badge variant="outline" className="text-xs">
              {test.recommendations.length} توصية
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // عرض التوصيات
  const renderRecommendations = (tests: TestResult[]) => {
    const allRecommendations = tests
      .filter(test => test.recommendations)
      .flatMap(test => test.recommendations || []);
    
    const uniqueRecommendations = [...new Set(allRecommendations)];

    if (uniqueRecommendations.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p>ممتاز! لا توجد توصيات للتحسين</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {uniqueRecommendations.map((recommendation, index) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{recommendation}</p>
          </div>
        ))}
      </div>
    );
  };

  // عرض الملخص العام
  const renderOverallSummary = () => {
    if (!testResults) return null;

    const { overall } = testResults;
    const getGradeColor = (grade: string) => {
      switch (grade) {
        case 'A': return 'text-green-600 bg-green-100';
        case 'B': return 'text-blue-600 bg-blue-100';
        case 'C': return 'text-yellow-600 bg-yellow-100';
        case 'D': return 'text-orange-600 bg-orange-100';
        case 'F': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                النتيجة الإجمالية
              </CardTitle>
              <CardDescription>{overall.summary}</CardDescription>
            </div>
            <div className="text-right">
              <div className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-lg font-bold",
                getGradeColor(overall.grade)
              )}>
                {overall.grade}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {overall.score.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overall.score} className="h-2" />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">اختبارات الاستجابة</h2>
          <p className="text-muted-foreground">
            مجموعة شاملة من اختبارات الأداء وإمكانية الوصول
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRunTime && (
            <p className="text-sm text-muted-foreground">
              آخر تشغيل: {lastRunTime.toLocaleTimeString('ar')}
            </p>
          )}
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'جاري التشغيل...' : 'تشغيل الاختبارات'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isRunning && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">جاري تشغيل الاختبارات...</p>
              <p className="text-sm text-muted-foreground">
                قد يستغرق هذا بضع ثوانِ
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {testResults && !isRunning && (
        <>
          {renderOverallSummary()}

          <Tabs defaultValue="viewport" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="viewport" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                العرض
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                الأداء
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                إمكانية الوصول
              </TabsTrigger>
              <TabsTrigger value="usability" className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                قابلية الاستخدام
              </TabsTrigger>
            </TabsList>

            <TabsContent value="viewport" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    اختبارات استجابة العرض
                  </CardTitle>
                  <CardDescription>
                    اختبار التخطيط على أحجام شاشات مختلفة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.viewport.map(renderTestResult)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    اختبارات الأداء
                  </CardTitle>
                  <CardDescription>
                    قياس سرعة التحميل والرندر واستخدام الذاكرة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.performance.map(renderTestResult)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accessibility" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    اختبارات إمكانية الوصول
                  </CardTitle>
                  <CardDescription>
                    فحص التوافق مع معايير الوصول العالمية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.accessibility.map(renderTestResult)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usability" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer className="h-5 w-5" />
                    اختبارات قابلية الاستخدام
                  </CardTitle>
                  <CardDescription>
                    تقييم سهولة الاستخدام والتفاعل
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.usability.map(renderTestResult)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>توصيات التحسين</CardTitle>
              <CardDescription>
                اقتراحات لتحسين الأداء وتجربة المستخدم
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderRecommendations([
                ...testResults.viewport,
                ...testResults.performance,
                ...testResults.accessibility,
                ...testResults.usability
              ])}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!testResults && !isRunning && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">لم يتم تشغيل الاختبارات بعد</p>
              <p className="text-sm text-muted-foreground mb-4">
                اضغط على "تشغيل الاختبارات" لبدء التقييم الشامل
              </p>
              <Button onClick={runTests}>
                <Play className="h-4 w-4 mr-2" />
                تشغيل الاختبارات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResponsiveTestDashboard;
