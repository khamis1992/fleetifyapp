import React, { useState, useEffect } from 'react';
import { useEnhancedLegalAI } from '@/hooks/useEnhancedLegalAI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Database,
  RefreshCw
} from 'lucide-react';

interface TestCase {
  id: string;
  question: string;
  expectedType: 'basic' | 'comprehensive' | 'predictive';
  description: string;
}

const testCases: TestCase[] = [
  {
    id: 'test-1',
    question: 'ما هي الخطوات القانونية لتحصيل الديون المتأخرة في الكويت؟',
    expectedType: 'basic',
    description: 'اختبار الاستشارة القانونية الأساسية'
  },
  {
    id: 'test-2',
    question: 'كيف يمكنني حماية شركتي من المخاطر القانونية المتعلقة بعقود الإيجار؟',
    expectedType: 'comprehensive',
    description: 'اختبار التحليل الشامل للمخاطر'
  },
  {
    id: 'test-3',
    question: 'تحليل وتوقع النتائج القانونية لقضية تأخير دفع العميل',
    expectedType: 'predictive',
    description: 'اختبار التحليل التنبؤي'
  }
];

const LegalAITestPanel: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [systemHealth, setSystemHealth] = useState<boolean | null>(null);
  const [testProgress, setTestProgress] = useState(0);

  const { 
    processLegalQuery, 
    checkSystemHealth, 
    isProcessing,
    error 
  } = useEnhancedLegalAI();

  const checkHealth = async () => {
    try {
      const health = await checkSystemHealth();
      setSystemHealth(health);
      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth(false);
      return false;
    }
  };

  const runSingleTest = async (testCase: TestCase) => {
    try {
      console.log(`Running test: ${testCase.id}`);
      
      const startTime = Date.now();
      const result = await processLegalQuery({
        query: testCase.question,
        analysis_type: testCase.expectedType,
        context: { test_case: testCase.id }
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const testResult = {
        success: true,
        confidence: result.confidence,
        processingTime,
        responseLength: result.analysis.length,
        hasLegalReferences: result.legal_references && result.legal_references.length > 0,
        hasActionItems: result.action_items && result.action_items.length > 0,
        hasRiskAssessment: !!result.risk_assessment,
        responsePreview: result.analysis.substring(0, 200) + '...',
        fullResponse: result
      };

      setTestResults(prev => ({
        ...prev,
        [testCase.id]: testResult
      }));

      return testResult;
    } catch (error) {
      console.error(`Test ${testCase.id} failed:`, error);
      
      const testResult = {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
        processingTime: 0
      };

      setTestResults(prev => ({
        ...prev,
        [testCase.id]: testResult
      }));

      return testResult;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestProgress(0);
    setTestResults({});

    // First check system health
    const healthCheck = await checkHealth();
    if (!healthCheck) {
      setIsRunningTests(false);
      return;
    }

    // Run tests sequentially to avoid overwhelming the system
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      await runSingleTest(testCase);
      setTestProgress(((i + 1) / testCases.length) * 100);
      
      // Wait a bit between tests
      if (i < testCases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsRunningTests(false);
  };

  useEffect(() => {
    // Check health on component mount
    checkHealth();
  }, []);

  const getOverallScore = () => {
    const results = Object.values(testResults);
    if (results.length === 0) return 0;
    
    const successfulTests = results.filter((r: any) => r.success).length;
    const totalConfidence = results
      .filter((r: any) => r.success)
      .reduce((sum: number, r: any) => sum + (r.confidence || 0), 0);
    
    const avgConfidence = successfulTests > 0 ? totalConfidence / successfulTests : 0;
    const successRate = (successfulTests / results.length) * 100;
    
    return Math.round((successRate + avgConfidence) / 2);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          لوحة اختبار النظام القانوني الذكي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Health Check */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <span>حالة النظام</span>
          </div>
          <div className="flex items-center gap-2">
            {systemHealth === null ? (
              <Badge variant="outline">جاري الفحص...</Badge>
            ) : systemHealth ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="w-4 h-4 mr-1" />
                نشط
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-4 h-4 mr-1" />
                خطأ
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={isProcessing}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">اختبارات التحقق من النتائج</h3>
            <p className="text-sm text-muted-foreground">
              تحقق من جودة وصحة النتائج القانونية
            </p>
          </div>
          <Button
            onClick={runAllTests}
            disabled={isRunningTests || !systemHealth}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isRunningTests ? 'جاري الاختبار...' : 'تشغيل جميع الاختبارات'}
          </Button>
        </div>

        {/* Test Progress */}
        {isRunningTests && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>تقدم الاختبارات</span>
              <span>{Math.round(testProgress)}%</span>
            </div>
            <Progress value={testProgress} className="w-full" />
          </div>
        )}

        {/* Overall Score */}
        {Object.keys(testResults).length > 0 && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              النتيجة الإجمالية: {getOverallScore()}% 
              {getOverallScore() >= 80 && " - نتائج ممتازة! 🎉"}
              {getOverallScore() >= 60 && getOverallScore() < 80 && " - نتائج جيدة"}
              {getOverallScore() < 60 && " - يحتاج تحسين"}
            </AlertDescription>
          </Alert>
        )}

        {/* Test Cases */}
        <div className="space-y-4">
          {testCases.map((testCase) => {
            const result = testResults[testCase.id];
            
            return (
              <Card key={testCase.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{testCase.description}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {testCase.question}
                      </p>
                    </div>
                    {result && (
                      <Badge variant={result.success ? "secondary" : "destructive"}>
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        ) : (
                          <AlertCircle className="w-4 h-4 mr-1" />
                        )}
                        {result.success ? 'نجح' : 'فشل'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                {result && (
                  <CardContent className="pt-0">
                    {result.success ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">الثقة:</span>
                            <span className="ml-1">{result.confidence}%</span>
                          </div>
                          <div>
                            <span className="font-medium">الوقت:</span>
                            <span className="ml-1">{result.processingTime}ms</span>
                          </div>
                          <div>
                            <span className="font-medium">طول الرد:</span>
                            <span className="ml-1">{result.responseLength} حرف</span>
                          </div>
                          <div>
                            <span className="font-medium">المراجع:</span>
                            <span className="ml-1">{result.hasLegalReferences ? '✓' : '✗'}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-muted rounded text-sm">
                          <strong>معاينة الرد:</strong>
                          <p className="mt-1">{result.responsePreview}</p>
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          {result.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LegalAITestPanel;