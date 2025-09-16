import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Brain,
  FileText,
  Link,
  Target,
  Activity,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

export default function FinancialSystemAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Mock data for demonstration - will be replaced with real hooks
  const mockAnalysis = {
    overallScore: 75,
    chartOfAccountsScore: 85,
    linkageScore: 70,
    costCentersScore: 60,
    operationsScore: 80,
    aiScore: 65
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تحليل النظام المالي الذكي</h1>
          <p className="text-muted-foreground">
            تحليل شامل لاكتمال وصحة النظام المحاسبي مع دعم الذكاء الاصطناعي
          </p>
        </div>
        <Button 
          onClick={runAnalysis} 
          disabled={isAnalyzing}
          className="gap-2"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              جاري التحليل...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              بدء التحليل الشامل
            </>
          )}
        </Button>
      </div>

      {/* Overall Health Score Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            درجة صحة النظام المالي الإجمالية
          </CardTitle>
          <CardDescription>
            مؤشر شامل لحالة النظام المحاسبي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl font-bold text-primary">
              {analysisComplete ? mockAnalysis.overallScore : '--'}%
            </div>
            {analysisComplete && (
              <Badge variant={getScoreVariant(mockAnalysis.overallScore)}>
                {mockAnalysis.overallScore >= 80 ? 'ممتاز' : 
                 mockAnalysis.overallScore >= 60 ? 'جيد' : 'يحتاج تحسين'}
              </Badge>
            )}
          </div>
          <Progress 
            value={analysisComplete ? mockAnalysis.overallScore : 0} 
            className="h-3"
          />
          {analysisComplete && (
            <p className="text-sm text-muted-foreground mt-2">
              النظام المالي في حالة جيدة مع بعض التحسينات المطلوبة
            </p>
          )}
        </CardContent>
      </Card>

      {/* Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="accounts">دليل الحسابات</TabsTrigger>
          <TabsTrigger value="linkage">الربط</TabsTrigger>
          <TabsTrigger value="cost-centers">مراكز التكلفة</TabsTrigger>
          <TabsTrigger value="operations">العمليات</TabsTrigger>
          <TabsTrigger value="ai-insights">رؤى ذكية</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Chart of Accounts Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-4 w-4" />
                  دليل الحسابات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${getScoreColor(mockAnalysis.chartOfAccountsScore)}`}>
                    {analysisComplete ? mockAnalysis.chartOfAccountsScore : '--'}%
                  </div>
                  {analysisComplete && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <Progress value={analysisComplete ? mockAnalysis.chartOfAccountsScore : 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  الهيكل الأساسي مكتمل
                </p>
              </CardContent>
            </Card>

            {/* Account Linkage Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link className="h-4 w-4" />
                  ربط الحسابات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${getScoreColor(mockAnalysis.linkageScore)}`}>
                    {analysisComplete ? mockAnalysis.linkageScore : '--'}%
                  </div>
                  {analysisComplete && (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <Progress value={analysisComplete ? mockAnalysis.linkageScore : 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  بعض الربطات مفقودة
                </p>
              </CardContent>
            </Card>

            {/* Cost Centers Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-4 w-4" />
                  مراكز التكلفة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${getScoreColor(mockAnalysis.costCentersScore)}`}>
                    {analysisComplete ? mockAnalysis.costCentersScore : '--'}%
                  </div>
                  {analysisComplete && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <Progress value={analysisComplete ? mockAnalysis.costCentersScore : 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  تحتاج إعداد شامل
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Issues */}
          {analysisComplete && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">المشاكل العاجلة</h3>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تم العثور على 3 حسابات رئيسية مفقودة في دليل الحسابات
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  15% من العقود غير مربوطة بحسابات محاسبية
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تحليل دليل الحسابات</CardTitle>
              <CardDescription>
                فحص اكتمال وصحة الهيكل المحاسبي
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisComplete ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل الشامل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>الحسابات الرئيسية</span>
                        <span className="text-green-600">85% مكتملة</span>
                      </div>
                      <Progress value={85} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>الحسابات الفرعية</span>
                        <span className="text-yellow-600">70% مكتملة</span>
                      </div>
                      <Progress value={70} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">الحسابات المفقودة:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• حساب صيانة المركبات</li>
                      <li>• حساب مصاريف التشغيل</li>
                      <li>• حساب إهلاك المركبات</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linkage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تحليل ربط الحسابات</CardTitle>
              <CardDescription>
                فحص ربط الكيانات بالحسابات المحاسبية
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisComplete ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل الشامل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">85%</div>
                      <div className="text-sm text-green-700">العملاء مربوطون</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">60%</div>
                      <div className="text-sm text-yellow-700">المركبات مربوطة</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">40%</div>
                      <div className="text-sm text-red-700">العقود مربوطة</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تحليل مراكز التكلفة</CardTitle>
              <CardDescription>
                فحص اكتمال وربط مراكز التكلفة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisComplete ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل الشامل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      مركز التكلفة CC007 غير مربوط بأي حساب في شجرة الحسابات
                    </AlertDescription>
                  </Alert>
                  <div className="text-sm text-muted-foreground">
                    هذا هو نفس السؤال الذي طرحته سابقاً - سيتم معالجة هذا في التحليل الذكي
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تحليل العمليات المالية</CardTitle>
              <CardDescription>
                فحص صحة القيود والمعاملات المالية
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisComplete ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل الشامل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>القيود المحاسبية</span>
                        <span className="text-green-600">90% صحيحة</span>
                      </div>
                      <Progress value={90} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>ربط المدفوعات</span>
                        <span className="text-yellow-600">75% مربوطة</span>
                      </div>
                      <Progress value={75} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                رؤى الذكاء الاصطناعي
              </CardTitle>
              <CardDescription>
                تحليل ذكي واقتراحات مخصصة لتحسين النظام المالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisComplete ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل الشامل لعرض الرؤى الذكية
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>اقتراح ذكي:</strong> مركز التكلفة CC007 (عقود التمليك) يجب ربطه بحساب "التزامات الإيجار التمويلي" (222) تحت الخصوم طويلة الأجل
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>تحسين مقترح:</strong> إنشاء حسابات فرعية منفصلة لكل نوع من المركبات لتتبع أفضل للتكاليف
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>تنبيه أمان:</strong> 25% من المعاملات المالية لا تحتوي على مراجع مراكز التكلفة مما قد يؤثر على دقة التقارير
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}