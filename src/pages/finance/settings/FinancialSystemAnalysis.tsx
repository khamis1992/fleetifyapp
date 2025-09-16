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
  Lightbulb,
  Sparkles,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useFinancialSystemAnalysis } from "@/hooks/useFinancialSystemAnalysis";
import { useFinancialAIAnalysis } from "@/hooks/useFinancialAIAnalysis";
import { useFinancialFixes } from "@/hooks/useFinancialFixes";

export default function FinancialSystemAnalysis() {
  const { data: analysis, isLoading, error, refetch } = useFinancialSystemAnalysis();
  
  // AI Analysis Hook - only run when we have basic analysis data
  const { 
    data: aiAnalysis, 
    isLoading: aiLoading, 
    error: aiError 
  } = useFinancialAIAnalysis(analysis ? {
    totalAccounts: analysis.metrics.totalAccounts,
    chartOfAccountsScore: analysis.chartOfAccountsScore,
    linkageScore: analysis.linkageScore,
    costCentersScore: analysis.costCentersScore,
    operationsScore: analysis.operationsScore,
    overallScore: analysis.overallScore,
    linkedCustomers: analysis.metrics.linkedCustomers,
    unlinkedCustomers: analysis.metrics.unlinkedEntities.customers,
    linkedVehicles: analysis.metrics.linkedVehicles,
    unlinkedVehicles: analysis.metrics.unlinkedEntities.vehicles,
    linkedContracts: analysis.metrics.linkedContracts,
    unlinkedContracts: analysis.metrics.unlinkedEntities.contracts,
    activeCostCenters: analysis.metrics.activeCostCenters,
    recentJournalEntries: analysis.metrics.recentJournalEntries,
    issues: analysis.issues.map(issue => ({
      title: issue.title,
      description: issue.description
    }))
  } : undefined);

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
          onClick={() => refetch()} 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              جاري التحليل...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              تحديث التحليل
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
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">جاري تحليل النظام المالي...</p>
            </div>
          ) : error ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                حدث خطأ في تحليل النظام المالي. يرجى المحاولة مرة أخرى.
              </AlertDescription>
            </Alert>
          ) : analysis ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl font-bold text-primary">
                  {analysis.overallScore}%
                </div>
                <Badge variant={getScoreVariant(analysis.overallScore)}>
                  {analysis.overallScore >= 80 ? 'ممتاز' : 
                   analysis.overallScore >= 60 ? 'جيد' : 'يحتاج تحسين'}
                </Badge>
              </div>
              <Progress 
                value={analysis.overallScore} 
                className="h-3"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {analysis.overallScore >= 80 ? 'النظام المالي في حالة ممتازة' :
                 analysis.overallScore >= 60 ? 'النظام المالي في حالة جيدة مع بعض التحسينات المطلوبة' :
                 'النظام المالي يحتاج إلى تحسينات مهمة'}
              </p>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <div className="text-4xl font-bold">--</div>
              <p className="text-sm mt-2">لا توجد بيانات للتحليل</p>
            </div>
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
                  <div className={`text-2xl font-bold ${analysis ? getScoreColor(analysis.chartOfAccountsScore) : 'text-muted-foreground'}`}>
                    {analysis ? analysis.chartOfAccountsScore : '--'}%
                  </div>
                  {analysis && analysis.chartOfAccountsScore >= 80 && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <Progress value={analysis ? analysis.chartOfAccountsScore : 0} className="mt-2" />
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
                  <div className={`text-2xl font-bold ${analysis ? getScoreColor(analysis.linkageScore) : 'text-muted-foreground'}`}>
                    {analysis ? analysis.linkageScore : '--'}%
                  </div>
                  {analysis && analysis.linkageScore < 80 && (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <Progress value={analysis ? analysis.linkageScore : 0} className="mt-2" />
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
                  <div className={`text-2xl font-bold ${analysis ? getScoreColor(analysis.costCentersScore) : 'text-muted-foreground'}`}>
                    {analysis ? analysis.costCentersScore : '--'}%
                  </div>
                  {analysis && analysis.costCentersScore < 60 && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <Progress value={analysis ? analysis.costCentersScore : 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  تحتاج إعداد شامل
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Issues */}
          {analysis && analysis.issues.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">المشاكل العاجلة</h3>
              {analysis.issues.slice(0, 3).map((issue, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{issue.title}:</strong> {issue.description}
                  </AlertDescription>
                </Alert>
              ))}
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
              {!analysis ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل لعرض النتائج
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
              {!analysis ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {analysis.metrics.linkedCustomers}/{analysis.metrics.linkedCustomers + analysis.metrics.unlinkedEntities.customers}
                      </div>
                      <div className="text-sm text-green-700">العملاء مربوطون</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((analysis.metrics.linkedCustomers / (analysis.metrics.linkedCustomers + analysis.metrics.unlinkedEntities.customers)) * 100)}%
                      </div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {analysis.metrics.linkedVehicles}/{analysis.metrics.linkedVehicles + analysis.metrics.unlinkedEntities.vehicles}
                      </div>
                      <div className="text-sm text-yellow-700">المركبات مربوطة</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((analysis.metrics.linkedVehicles / (analysis.metrics.linkedVehicles + analysis.metrics.unlinkedEntities.vehicles)) * 100)}%
                      </div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {analysis.metrics.linkedContracts}/{analysis.metrics.linkedContracts + analysis.metrics.unlinkedEntities.contracts}
                      </div>
                      <div className="text-sm text-red-700">العقود مربوطة</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((analysis.metrics.linkedContracts / (analysis.metrics.linkedContracts + analysis.metrics.unlinkedEntities.contracts)) * 100)}%
                      </div>
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
              {!analysis ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>درجة إعداد مراكز التكلفة</span>
                      <span className={`${analysis.costCentersScore >= 80 ? 'text-green-600' : analysis.costCentersScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {analysis.costCentersScore}%
                      </span>
                    </div>
                    <Progress value={analysis.costCentersScore} />
                    <div className="text-xs text-muted-foreground">
                      مراكز التكلفة النشطة: {analysis.metrics.activeCostCenters}
                    </div>
                  </div>

                  {analysis.issues.some(i => i.id === 'cc007-not-linked') && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        مركز التكلفة CC007 غير مربوط بأي حساب في شجرة الحسابات
                      </AlertDescription>
                    </Alert>
                  )}
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
              {!analysis ? (
                <div className="text-center py-8 text-muted-foreground">
                  قم بتشغيل التحليل لعرض النتائج
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>درجة صحة العمليات المالية</span>
                      <span className={`${analysis.operationsScore >= 80 ? 'text-green-600' : analysis.operationsScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {analysis.operationsScore}%
                      </span>
                    </div>
                    <Progress value={analysis.operationsScore} />
                    <div className="text-xs text-muted-foreground">
                      قيود آخر 30 يوم: {analysis.metrics.recentJournalEntries}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          {/* Smart Actions Card */}
          {analysis && <SmartActionsCard analysis={analysis} />}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                رؤى ذكية مدعومة بالذكاء الاصطناعي
              </CardTitle>
              <CardDescription>
                تحليل متقدم وتوصيات مخصصة لتحسين نظامك المالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysis ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">التحليل الذكي غير متوفر</p>
                  <p className="text-sm">يرجى تشغيل التحليل الأساسي أولاً</p>
                </div>
              ) : aiLoading ? (
                <div className="text-center py-8">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <Sparkles className="h-4 w-4 absolute top-0 right-1/2 translate-x-1/2 text-primary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground font-medium">جاري التحليل بالذكاء الاصطناعي...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    يتم تحليل بياناتك المالية للحصول على رؤى مخصصة
                  </p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    قد يستغرق هذا دقيقة واحدة
                  </div>
                </div>
              ) : aiError ? (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="space-y-3">
                    <div className="space-y-1">
                      <div className="font-medium text-destructive">فشل في التحليل الذكي</div>
                      <div className="text-sm text-muted-foreground">
                        {aiError?.message?.includes('API key') ? 
                          'مفتاح OpenAI API غير مُعدّ بشكل صحيح' :
                          aiError?.message || 'حدث خطأ في الاتصال بخدمة التحليل الذكي'
                        }
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.reload()}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        إعادة المحاولة
                      </Button>
                      {aiError?.message?.includes('API key') && (
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={() => window.open('https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/functions', '_blank')}
                          className="text-xs text-primary"
                        >
                          إعداد API Key
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : aiAnalysis ? (
                <div className="space-y-6">
                  {/* AI Analysis Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">مستوى الثقة</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">{aiAnalysis.confidence}%</div>
                      </CardContent>
                    </Card>
                    
                    <Card className={`border-${
                      aiAnalysis.riskLevel === 'critical' ? 'destructive' :
                      aiAnalysis.riskLevel === 'high' ? 'orange-500' :
                      aiAnalysis.riskLevel === 'medium' ? 'yellow-500' : 'green-500'
                    }/20`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">مستوى المخاطر</span>
                        </div>
                        <Badge variant={
                          aiAnalysis.riskLevel === 'critical' ? 'destructive' :
                          aiAnalysis.riskLevel === 'high' ? 'destructive' :
                          aiAnalysis.riskLevel === 'medium' ? 'secondary' : 'default'
                        }>
                          {aiAnalysis.riskLevel === 'critical' ? 'حرج' :
                           aiAnalysis.riskLevel === 'high' ? 'عالي' :
                           aiAnalysis.riskLevel === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-blue-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">التوصيات</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-500">
                          {aiAnalysis.recommendations.length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Analysis Text */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">التحليل التفصيلي</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {aiAnalysis.analysis}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Smart Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        توصيات ذكية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {aiAnalysis.recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{recommendation}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Urgent Actions */}
                  {aiAnalysis.urgentActions.length > 0 && (
                    <Card className="border-orange-500/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-5 w-5" />
                          إجراءات عاجلة مطلوبة
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {aiAnalysis.urgentActions.map((action, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-orange-800">{action}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-xs text-muted-foreground text-center pt-4">
                    آخر تحليل: {new Date(aiAnalysis.timestamp).toLocaleString('ar-SA')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات كافية للتحليل الذكي</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Smart Actions Component
function SmartActionsCard({ analysis }: { analysis: any }) {
  const {
    copyDefaultCostCenters,
    createDefaultCustomerAccounts,
    ensureEssentialAccountMappings,
    linkUnlinkedContracts,
    runAllFixes,
    isLoading
  } = useFinancialFixes();

  const hasIssues = analysis.metrics.unlinkedEntities.customers > 0 || 
                   analysis.metrics.unlinkedEntities.vehicles > 0 || 
                   analysis.metrics.unlinkedEntities.contracts > 0 ||
                   analysis.costCentersScore < 80;

  if (!hasIssues) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">النظام المالي مُعد بشكل جيد!</h3>
              <p className="text-sm text-green-700">جميع الربطات والإعدادات تعمل بصورة صحيحة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Lightbulb className="h-5 w-5" />
          إجراءات سريعة للإصلاح
        </CardTitle>
        <CardDescription className="text-blue-700">
          نفذ هذه الإجراءات لحل المشاكل المكتشفة تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            onClick={() => ensureEssentialAccountMappings.mutate()}
            disabled={isLoading}
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start text-right"
          >
            <div className="font-medium">إعداد ربط الحسابات الأساسية</div>
            <div className="text-xs text-muted-foreground">
              ربط الحسابات الأساسية تلقائياً
            </div>
          </Button>

          <Button
            onClick={() => copyDefaultCostCenters.mutate()}
            disabled={isLoading}
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start text-right"
          >
            <div className="font-medium">نسخ مراكز التكلفة الافتراضية</div>
            <div className="text-xs text-muted-foreground">
              إضافة مراكز التكلفة المفقودة
            </div>
          </Button>

          <Button
            onClick={() => createDefaultCustomerAccounts.mutate()}
            disabled={isLoading}
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start text-right"
          >
            <div className="font-medium">إنشاء حسابات العملاء</div>
            <div className="text-xs text-muted-foreground">
              ربط العملاء بحسابات مالية
            </div>
          </Button>

          <Button
            onClick={() => linkUnlinkedContracts.mutate()}
            disabled={isLoading}
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start text-right"
          >
            <div className="font-medium">ربط العقود غير المربوطة</div>
            <div className="text-xs text-muted-foreground">
              ربط {analysis.metrics.unlinkedEntities.contracts} عقد
            </div>
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={() => runAllFixes.mutate()}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التنفيذ...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                تشغيل جميع الإصلاحات
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}