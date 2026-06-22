import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Zap,
  Search,
  FileText,
  Users,
  Link2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DiagnosticResult {
  category: string;
  title: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
  actionable: boolean;
}

interface FixResult {
  payment_id: string;
  payment_number: string;
  old_status: string;
  new_status: string;
  action_taken: string;
}

export const PaymentLinkingTroubleshooter: React.FC = () => {
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);

  // تشخيص المدفوعات المعلقة
  const { data: diagnostics, isLoading: diagnosisLoading, refetch: runDiagnosis } = useQuery({
    queryKey: ['payment-diagnostics', companyId],
    queryFn: async (): Promise<DiagnosticResult[]> => {
      if (!companyId) return [];

      const { data, error } = await (supabase as any)
        .rpc('get_pending_payments_stats', { target_company_id: companyId });
      const stats: any = data || {};

      if (error) throw error;

      const results: DiagnosticResult[] = [];

      if (stats?.total_pending > 0) {
        results.push({
          category: 'معالجة',
          title: 'مدفوعات معلقة للمعالجة',
          count: stats.total_pending,
          severity: stats.total_pending > 20 ? 'critical' : stats.total_pending > 10 ? 'high' : 'medium',
          description: `${stats.total_pending} مدفوعة تحتاج لمعالجة أو ربط`,
          solution: 'تشغيل المعالج التلقائي أو الربط اليدوي',
          actionable: true
        });
      }

      if (stats?.unlinked_with_customer > 0) {
        results.push({
          category: 'ربط',
          title: 'مدفوعات لها عملاء لكن بدون عقود',
          count: stats.unlinked_with_customer,
          severity: 'high',
          description: `${stats.unlinked_with_customer} مدفوعة مربوطة بعملاء لكن تحتاج ربط بعقود`,
          solution: 'البحث عن العقود المطابقة وربطها',
          actionable: true
        });
      }

      if (stats?.unlinked_without_customer > 0) {
        results.push({
          category: 'بيانات',
          title: 'مدفوعات بدون بيانات عملاء',
          count: stats.unlinked_without_customer,
          severity: 'critical',
          description: `${stats.unlinked_without_customer} مدفوعة تحتاج تحديد العميل والعقد يدوياً`,
          solution: 'مراجعة يدوية لتحديد العميل والعقد',
          actionable: false
        });
      }

      if (stats?.low_confidence > 0) {
        results.push({
          category: 'ثقة',
          title: 'مدفوعات بمستوى ثقة منخفض',
          count: stats.low_confidence,
          severity: 'medium',
          description: `${stats.low_confidence} مدفوعة مربوطة لكن بثقة أقل من 50%`,
          solution: 'مراجعة الربط وتأكيد صحته',
          actionable: true
        });
      }

      return results;
    },
    enabled: !!companyId
  });

  // تشغيل الإصلاح التلقائي
  const fixPaymentsMutation = useMutation({
    mutationFn: async (): Promise<FixResult[]> => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const { data, error } = await (supabase as any)
        .rpc('fix_pending_payments', { target_company_id: companyId });

      if (error) throw error;
      return (data as unknown as FixResult[]) || [];
    },
    onSuccess: (results) => {
      toast({
        title: 'تم تشغيل الإصلاح التلقائي',
        description: `تم معالجة ${results.length} مدفوعة`
      });
      setCurrentStep(3);
      queryClient.invalidateQueries({ queryKey: ['payment-diagnostics'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
    },
    onError: (error) => {
      toast({
        title: 'فشل في الإصلاح التلقائي',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">يرجى تحديد الشركة أولاً</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* خطوات المرشد */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            مرشد حل مشاكل المدفوعات المعلقة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                1
              </div>
              <div className="text-sm">تشخيص المشاكل</div>
            </div>
            
            <div className="flex-1 h-px bg-border mx-4" />
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <div className="text-sm">تطبيق الحلول</div>
            </div>
            
            <div className="flex-1 h-px bg-border mx-4" />
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                3
              </div>
              <div className="text-sm">النتائج</div>
            </div>
          </div>

          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* الخطوة 1: التشخيص */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 1: تشخيص المشاكل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                جاري فحص المدفوعات المعلقة وتحديد المشاكل...
              </p>
              <Button
                onClick={() => runDiagnosis()}
                disabled={diagnosisLoading}
                variant="outline"
              >
                {diagnosisLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {diagnosisLoading ? 'جاري الفحص...' : 'إعادة الفحص'}
              </Button>
            </div>

            {diagnosisLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            )}

            {diagnostics && diagnostics.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ممتاز! لا توجد مشاكل في المدفوعات. جميع المدفوعات مربوطة ومعالجة بنجاح.
                </AlertDescription>
              </Alert>
            )}

            {diagnostics && diagnostics.length > 0 && (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    تم العثور على {diagnostics.length} نوع من المشاكل في المدفوعات.
                  </AlertDescription>
                </Alert>

                {diagnostics.map((result, index) => (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(result.severity)}
                            <h4 className="font-medium">{result.title}</h4>
                            <Badge className={getSeverityColor(result.severity)}>
                              {result.count} مدفوعة
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.description}
                          </p>
                          <p className="text-sm font-medium text-blue-600">
                            💡 الحل المقترح: {result.solution}
                          </p>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep(2)}>
                    <Zap className="h-4 w-4 mr-2" />
                    المتابعة للحلول
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* الخطوة 2: تطبيق الحلول */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 2: تطبيق الحلول</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                سيتم تشغيل المعالج التلقائي لحل المشاكل التي يمكن حلها تلقائياً.
                المشاكل التي تحتاج تدخل يدوي ستبقى للمراجعة.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h4 className="font-medium">المشاكل القابلة للحل التلقائي:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">ربط المدفوعات بالعقود المطابقة</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">تحديث حالة المعالجة والتوزيع</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">حساب مستوى الثقة في الربط</span>
                </li>
              </ul>

              <h4 className="font-medium">المشاكل التي تحتاج تدخل يدوي:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">المدفوعات بدون بيانات عملاء</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">المدفوعات التي تحتاج مراجعة الوثائق</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                العودة للتشخيص
              </Button>
              <Button
                onClick={() => fixPaymentsMutation.mutate()}
                disabled={fixPaymentsMutation.isPending}
              >
                {fixPaymentsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {fixPaymentsMutation.isPending ? 'جاري الإصلاح...' : 'تشغيل الإصلاح التلقائي'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* الخطوة 3: النتائج */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 3: النتائج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                تم تشغيل الإصلاح التلقائي بنجاح! راجع النتائج أدناه.
              </AlertDescription>
            </Alert>

            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">تم إكمال الإصلاح!</h3>
              <p className="text-muted-foreground mb-4">
                تم معالجة المدفوعات التي يمكن معالجتها تلقائياً.
                المدفوعات المتبقية تحتاج مراجعة يدوية.
              </p>
              
              <div className="flex justify-center gap-4">
                <Button onClick={() => setCurrentStep(1)}>
                  <Search className="h-4 w-4 mr-2" />
                  فحص جديد
                </Button>
                <Button variant="outline">
                  <Link2 className="h-4 w-4 mr-2" />
                  مراجعة المدفوعات المعلقة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentLinkingTroubleshooter;