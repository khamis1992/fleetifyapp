import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Brain,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useSmartLinkingStats } from '@/hooks/useSmartPaymentLinking';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3
  }).format(amount);
};

export const SmartLinkingStats: React.FC = () => {
  const { data: stats, isLoading } = useSmartLinkingStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات الربط الذكي</CardTitle>
          <CardDescription>لا توجد بيانات متاحة</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              دفعة في النظام
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات المربوطة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.linkedPayments}</div>
            <p className="text-xs text-muted-foreground">
              مربوطة بالعملاء والعقود
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات غير المربوطة</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.unlinkedPayments}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج ربط بالعملاء
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الربط التلقائي</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.autoLinkedPayments}</div>
            <p className="text-xs text-muted-foreground">
              مربوطة تلقائياً
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              نسبة الربط العام
            </CardTitle>
            <CardDescription>
              نسبة المدفوعات المربوطة من إجمالي المدفوعات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>المدفوعات المربوطة</span>
              <span className="font-medium">{stats.linkingPercentage}%</span>
            </div>
            <Progress value={stats.linkingPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.linkedPayments} مربوطة</span>
              <span>{stats.unlinkedPayments} غير مربوطة</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              فعالية الربط الذكي
            </CardTitle>
            <CardDescription>
              نسبة المدفوعات المربوطة تلقائياً من المدفوعات المربوطة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>الربط التلقائي</span>
              <span className="font-medium">{stats.autoLinkingPercentage}%</span>
            </div>
            <Progress value={stats.autoLinkingPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.autoLinkedPayments} تلقائي</span>
              <span>{stats.linkedPayments - stats.autoLinkedPayments} يدوي</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            رؤى وتوصيات
          </CardTitle>
          <CardDescription>
            تحليل أداء نظام الربط الذكي وتوصيات للتحسين
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Linking Performance */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {stats.linkingPercentage >= 80 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : stats.linkingPercentage >= 60 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {stats.linkingPercentage >= 80 ? 'أداء ممتاز' : 
                   stats.linkingPercentage >= 60 ? 'أداء جيد' : 'يحتاج تحسين'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.linkingPercentage >= 80 ? 
                    'معظم المدفوعات مربوطة بنجاح. استمر في استخدام الربط الذكي.' :
                   stats.linkingPercentage >= 60 ?
                    'أداء جيد ولكن يمكن تحسينه. تحقق من المدفوعات غير المربوطة.' :
                    'نسبة عالية من المدفوعات غير مربوطة. راجع إعدادات الربط الذكي.'}
                </p>
              </div>
            </div>

            {/* Auto-linking Performance */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {stats.autoLinkingPercentage >= 70 ? (
                  <Zap className="h-5 w-5 text-blue-600" />
                ) : stats.autoLinkingPercentage >= 40 ? (
                  <Brain className="h-5 w-5 text-yellow-600" />
                ) : (
                  <Brain className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {stats.autoLinkingPercentage >= 70 ? 'ربط ذكي فعال' : 
                   stats.autoLinkingPercentage >= 40 ? 'ربط ذكي متوسط' : 'ربط ذكي يحتاج تطوير'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.autoLinkingPercentage >= 70 ? 
                    'النظام الذكي يربط معظم المدفوعات تلقائياً بكفاءة عالية.' :
                   stats.autoLinkingPercentage >= 40 ?
                    'النظام الذكي يعمل بشكل جيد ولكن يمكن تحسين خوارزميات التطابق.' :
                    'النظام الذكي يحتاج تحسين. تحقق من أنماط البيانات وإعدادات التطابق.'}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {stats.unlinkedPayments > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-800 mb-2">توصيات للتحسين:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {stats.unlinkedPayments > 50 && (
                    <li>• تشغيل عملية الربط الذكي للمدفوعات غير المربوطة</li>
                  )}
                  {stats.autoLinkingPercentage < 50 && (
                    <li>• مراجعة أنماط أرقام العقود في الملاحظات لتحسين التطابق</li>
                  )}
                  <li>• التأكد من إدخال أرقام العقود في ملاحظات المدفوعات</li>
                  <li>• مراجعة المدفوعات التي تحتاج ربط يدوي</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};