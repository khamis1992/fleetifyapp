/**
 * Real-World Testing Infrastructure
 * Phase 2 Priority #3: Testing and validation with actual invoices
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FeedbackForm from './FeedbackForm';
import { LazyImage } from '@/components/common/LazyImage';
import {
  TestTube,
  AlertTriangle,
  FileText,
  Target,
  Clock,
  BarChart3,
  Download,
  Upload,
  Flag,
  MessageSquare
} from 'lucide-react';

interface TestCase {
  id: string;
  invoice_image: string;
  expected_customer_name: string;
  expected_amount?: number;
  expected_car_number?: string;
  expected_contract_number?: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  handwriting_quality: 'clear' | 'moderate' | 'poor';
  language: 'arabic' | 'english' | 'mixed';
  notes?: string;
  created_at: string;
}

interface TestResult {
  test_case_id: string;
  ocr_result: any;
  matching_result: any;
  accuracy_scores: {
    customer_name_accuracy: number;
    amount_accuracy: number;
    car_number_accuracy: number;
    overall_accuracy: number;
  };
  processing_time: number;
  confidence_score: number;
  errors?: string[];
  tested_at: string;
}

interface UserFeedback {
  id: string;
  test_case_id: string;
  user_rating: 1 | 2 | 3 | 4 | 5;
  is_correct: boolean;
  corrections?: {
    customer_name?: string;
    amount?: number;
    car_number?: string;
  };
  feedback_notes?: string;
  created_at: string;
}

const RealWorldTestingInfrastructure: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [analytics, setAnalytics] = useState<{
    total_tests: number;
    average_accuracy: number;
    processing_time_avg: number;
    confidence_avg: number;
    success_rate: number;
  } | null>(null);

  const { toast } = useToast();

  // Upload test cases
  const handleTestCaseUpload = useCallback(async (files: FileList) => {
    const uploadedCases: TestCase[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          
          const testCase: TestCase = {
            id: `test_${Date.now()}_${i}`,
            invoice_image: base64,
            expected_customer_name: '', // Will be filled by user
            difficulty_level: 'medium',
            handwriting_quality: 'moderate',
            language: 'mixed',
            created_at: new Date().toISOString()
          };

          uploadedCases.push(testCase);
          
          if (uploadedCases.length === files.length) {
            setTestCases(prev => [...prev, ...uploadedCases]);
            toast({
              title: "تم رفع حالات الاختبار",
              description: `تم رفع ${uploadedCases.length} حالة اختبار بنجاح`,
              variant: "default"
            });
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading test case:', error);
      }
    }
  }, [toast]);

  // Run automated tests
  const runAutomatedTests = useCallback(async () => {
    if (testCases.length === 0) {
      toast({
        title: "لا توجد حالات اختبار",
        description: "يرجى رفع حالات اختبار أولاً",
        variant: "destructive"
      });
      return;
    }

    setIsRunningTests(true);
    setTestProgress(0);
    const results: TestResult[] = [];

    try {
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        setTestProgress((i / testCases.length) * 100);

        const startTime = Date.now();

        try {
          // Call OCR Edge Function
          const { data, error } = await supabase.functions.invoke('scan-invoice', {
            body: {
              imageBase64: testCase.invoice_image,
              fileName: `test_${testCase.id}.jpg`,
              ocrEngine: 'gemini',
              language: 'auto'
            }
          });

          const endTime = Date.now();
          const processingTime = endTime - startTime;

          if (error) {
            throw new Error(error.message);
          }

          // Calculate accuracy scores
          const accuracyScores = calculateAccuracyScores(testCase, data);

          const result: TestResult = {
            test_case_id: testCase.id,
            ocr_result: data,
            matching_result: data.matching || {},
            accuracy_scores: accuracyScores,
            processing_time: processingTime,
            confidence_score: data.data?.processing_info?.ocr_confidence || 0,
            tested_at: new Date().toISOString()
          };

          results.push(result);

        } catch (error) {
          results.push({
            test_case_id: testCase.id,
            ocr_result: null,
            matching_result: null,
            accuracy_scores: {
              customer_name_accuracy: 0,
              amount_accuracy: 0,
              car_number_accuracy: 0,
              overall_accuracy: 0
            },
            processing_time: 0,
            confidence_score: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            tested_at: new Date().toISOString()
          });
        }
      }

      setTestResults(results);
      calculateAnalytics(results);
      setTestProgress(100);

      toast({
        title: "اكتملت الاختبارات",
        description: `تم اختبار ${results.length} حالة بنجاح`,
        variant: "default"
      });

    } catch (error) {
      toast({
        title: "خطأ في الاختبارات",
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  }, [testCases, toast]);

  // Calculate accuracy scores
  const calculateAccuracyScores = (testCase: TestCase, ocrResult: any) => {
    let customerNameAccuracy = 0;
    let amountAccuracy = 0;
    let carNumberAccuracy = 0;

    // Customer name accuracy using Levenshtein distance
    if (testCase.expected_customer_name && ocrResult.data?.customer_name) {
      customerNameAccuracy = calculateSimilarity(
        testCase.expected_customer_name, 
        ocrResult.data.customer_name
      );
    }

    // Amount accuracy
    if (testCase.expected_amount && ocrResult.data?.total_amount) {
      const diff = Math.abs(testCase.expected_amount - ocrResult.data.total_amount);
      const maxAmount = Math.max(testCase.expected_amount, ocrResult.data.total_amount);
      amountAccuracy = Math.max(0, (1 - diff / maxAmount)) * 100;
    }

    // Car number accuracy
    if (testCase.expected_car_number && ocrResult.data?.car_number) {
      carNumberAccuracy = calculateSimilarity(
        testCase.expected_car_number,
        ocrResult.data.car_number
      );
    }

    const overall_accuracy = (customerNameAccuracy + amountAccuracy + carNumberAccuracy) / 3;

    return {
      customer_name_accuracy: Math.round(customerNameAccuracy),
      amount_accuracy: Math.round(amountAccuracy),
      car_number_accuracy: Math.round(carNumberAccuracy),
      overall_accuracy: Math.round(overall_accuracy)
    };
  };

  // Simple similarity calculation
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Calculate analytics
  const calculateAnalytics = (results: TestResult[]) => {
    if (results.length === 0) return;

    const validResults = results.filter(r => !r.errors?.length);
    
    const analytics = {
      total_tests: results.length,
      average_accuracy: validResults.reduce((sum, r) => sum + r.accuracy_scores.overall_accuracy, 0) / validResults.length,
      processing_time_avg: validResults.reduce((sum, r) => sum + r.processing_time, 0) / validResults.length,
      confidence_avg: validResults.reduce((sum, r) => sum + r.confidence_score, 0) / validResults.length,
      success_rate: (validResults.length / results.length) * 100
    };

    setAnalytics(analytics);
  };

  // Export test results
  const exportResults = () => {
    const exportData = {
      test_cases: testCases,
      test_results: testResults,
      user_feedback: userFeedback,
      analytics: analytics,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_scanner_test_results_${Date.now()}.json`;
    a.click();
  };

  // Submit user feedback
  const submitFeedback = (testCaseId: string, feedback: Partial<UserFeedback>) => {
    const newFeedback: UserFeedback = {
      id: `feedback_${Date.now()}`,
      test_case_id: testCaseId,
      user_rating: feedback.user_rating || 3,
      is_correct: feedback.is_correct || false,
      corrections: feedback.corrections,
      feedback_notes: feedback.feedback_notes,
      created_at: new Date().toISOString()
    };

    setUserFeedback(prev => [...prev, newFeedback]);

    toast({
      title: "تم حفظ التقييم",
      description: "شكراً لك على تقييمك، سيساعد ذلك في تحسين النظام",
      variant: "default"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-6 w-6 text-primary" />
            بنية اختبار العالم الحقيقي
            <Badge variant="secondary" className="text-xs">
              Phase 2 Priority #3
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            اختبار شامل للنظام باستخدام فواتير حقيقية مع قياس الدقة وجمع التقييمات
          </p>
        </CardHeader>
      </Card>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.total_tests}</div>
                <div className="text-sm text-muted-foreground">إجمالي الاختبارات</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(analytics.average_accuracy)}%</div>
                <div className="text-sm text-muted-foreground">متوسط الدقة</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.round(analytics.processing_time_avg)}ms</div>
                <div className="text-sm text-muted-foreground">متوسط وقت المعالجة</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{Math.round(analytics.confidence_avg)}%</div>
                <div className="text-sm text-muted-foreground">متوسط الثقة</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{Math.round(analytics.success_rate)}%</div>
                <div className="text-sm text-muted-foreground">معدل النجاح</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">رفع حالات اختبار</TabsTrigger>
          <TabsTrigger value="run">تشغيل الاختبارات</TabsTrigger>
          <TabsTrigger value="results">النتائج</TabsTrigger>
          <TabsTrigger value="feedback">التقييمات</TabsTrigger>
        </TabsList>

        {/* Upload Test Cases */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                رفع حالات اختبار جديدة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleTestCaseUpload(files);
                  };
                  input.click();
                }}
              >
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium mb-2">اسحب وأفلت صور الفواتير الحقيقية</p>
                <p className="text-sm text-muted-foreground mb-4">
                  للحصول على أفضل النتائج، استخدم فواتير متنوعة بمستويات صعوبة مختلفة
                </p>
                <Button variant="outline">
                  اختيار صور الفواتير
                </Button>
              </div>

              {testCases.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">حالات الاختبار المرفوعة: {testCases.length}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {testCases.slice(0, 8).map((testCase, index) => (
                      <div key={testCase.id} className="bg-white p-2 rounded border">
                        <LazyImage 
                          src={testCase.invoice_image} 
                          alt={`Test case ${index + 1}`}
                          className="w-full h-20 object-cover rounded mb-1"
                        />
                        <div className="text-xs text-slate-600">حالة {index + 1}</div>
                      </div>
                    ))}
                    {testCases.length > 8 && (
                      <div className="bg-slate-100 p-2 rounded border flex items-center justify-center">
                        <span className="text-sm text-slate-500">+{testCases.length - 8} أكثر</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Run Tests */}
        <TabsContent value="run">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                تشغيل اختبارات تلقائية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={runAutomatedTests}
                  disabled={isRunningTests || testCases.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isRunningTests ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      جاري التشغيل...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      تشغيل جميع الاختبارات
                    </>
                  )}
                </Button>

                <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as 'all' | 'easy' | 'medium' | 'hard')}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستويات</SelectItem>
                    <SelectItem value="easy">سهل</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="hard">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isRunningTests && (
                <div className="space-y-2">
                  <Progress value={testProgress} className="w-full" />
                  <div className="text-sm text-muted-foreground text-center">
                    جاري اختبار الحالات... {Math.round(testProgress)}%
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">📋 عملية الاختبار تشمل:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• تشغيل OCR على كل صورة اختبار</li>
                  <li>• قياس دقة استخراج البيانات</li>
                  <li>• اختبار سرعة المعالجة</li>
                  <li>• تقييم مستوى الثقة</li>
                  <li>• مقارنة النتائج بالبيانات المتوقعة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  نتائج الاختبارات التفصيلية
                </div>
                {testResults.length > 0 && (
                  <Button onClick={exportResults} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    تصدير النتائج
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-muted-foreground">لا توجد نتائج اختبار بعد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div key={result.test_case_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">اختبار {index + 1}</h4>
                        <div className="flex items-center gap-2">
                          {result.errors ? (
                            <Badge variant="destructive">فشل</Badge>
                          ) : (
                            <Badge variant="default">
                              {result.accuracy_scores.overall_accuracy}% دقة
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {result.processing_time}ms
                          </Badge>
                        </div>
                      </div>
                      
                      {!result.errors && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">دقة الاسم:</span>
                            <span className="ml-2">{result.accuracy_scores.customer_name_accuracy}%</span>
                          </div>
                          <div>
                            <span className="font-medium">دقة المبلغ:</span>
                            <span className="ml-2">{result.accuracy_scores.amount_accuracy}%</span>
                          </div>
                          <div>
                            <span className="font-medium">دقة رقم المركبة:</span>
                            <span className="ml-2">{result.accuracy_scores.car_number_accuracy}%</span>
                          </div>
                        </div>
                      )}
                      
                      {result.errors && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {result.errors.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Feedback */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                تقييمات المستخدمين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Flag className="h-4 w-4" />
                  <AlertDescription>
                    يرجى تقييم نتائج النظام لمساعدتنا في التحسين المستمر
                  </AlertDescription>
                </Alert>

                {/* Feedback Collection Interface */}
                {testResults.length > 0 ? (
                  <div className="space-y-6">
                    {testResults.slice(0, 5).map((result, index) => (
                      <Card key={result.test_case_id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">تقييم النتيجة {index + 1}</h4>
                            <Badge variant="outline">
                              دقة: {result.accuracy_scores.overall_accuracy}%
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <FeedbackForm 
                            testResult={result}
                            onSubmitFeedback={(feedback) => submitFeedback(result.test_case_id, feedback)}
                          />
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Feedback Analytics */}
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-800">📊 إحصائيات التقييمات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-600">{userFeedback.length}</div>
                            <div className="text-sm text-green-700">إجمالي التقييمات</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {userFeedback.length > 0 
                                ? Math.round(userFeedback.reduce((sum, f) => sum + f.user_rating, 0) / userFeedback.length * 20) 
                                : 0}%
                            </div>
                            <div className="text-sm text-green-700">متوسط الرضا</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {userFeedback.filter(f => f.is_correct).length}
                            </div>
                            <div className="text-sm text-green-700">نتائج صحيحة</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {userFeedback.filter(f => f.corrections).length}
                            </div>
                            <div className="text-sm text-green-700">تصحيحات مقدمة</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      لا توجد نتائج اختبار للتقييم. يرجى تشغيل الاختبارات أولاً.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealWorldTestingInfrastructure;