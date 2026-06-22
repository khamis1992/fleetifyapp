import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Calendar,
  FileWarning,
  Scale,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RiskAnalyzerProps {
  companyId: string;
  onAnalysisComplete?: (analysis: any) => void;
}

interface RiskFactors {
  paymentDelay: number;
  unpaidAmount: number;
  violationCount: number;
  contractHistory: number;
  litigationHistory: number;
}

export const RiskAnalyzer: React.FC<RiskAnalyzerProps> = ({
  companyId,
  onAnalysisComplete
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactors | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false});

      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const handleAnalyzeRisk = async () => {
    if (!selectedCustomer) {
      toast.error('يرجى اختيار عميل');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Fetch comprehensive customer data
      const { data: customer, error } = await supabase
        .from('customers')
        .select(`
          *,
          contracts(*),
          payments(*),
          traffic_violations(*),
          legal_cases(*)
        `)
        .eq('id', selectedCustomer)
        .single();

      if (error) throw error;

      // Calculate risk factors
      const factors = calculateRiskFactors(customer);
      setRiskFactors(factors);

      // Calculate weighted risk score
      const score = calculateRiskScore(factors);
      setRiskScore(score);

      // Generate recommendations
      const recs = generateRecommendations(score, factors);
      setRecommendations(recs);

      toast.success('تم تحليل المخاطر بنجاح');

      if (onAnalysisComplete) {
        onAnalysisComplete({
          customerId: selectedCustomer,
          score,
          factors,
          recommendations: recs
        });
      }
    } catch (error) {
      console.error('Error analyzing risk:', error);
      toast.error('حدث خطأ في تحليل المخاطر');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'عالي', color: 'destructive', icon: AlertTriangle };
    if (score >= 40) return { label: 'متوسط', color: 'warning', icon: Minus };
    return { label: 'منخفض', color: 'success', icon: TrendingDown };
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Analysis Settings */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل مخاطر العميل</CardTitle>
          <CardDescription>قم بتقييم شامل لمخاطر التعامل مع العميل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>اختر العميل</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عميل..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.customer_type === 'company' 
                      ? customer.company_name 
                      : `${customer.first_name} ${customer.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyzeRisk}
            disabled={!selectedCustomer || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <AlertTriangle className="ml-2 h-4 w-4" />
                تحليل المخاطر
              </>
            )}
          </Button>

          {/* Risk Score Display */}
          {riskScore !== null && (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">درجة المخاطر</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold">{riskScore.toFixed(1)}</span>
                    <span className="text-xl text-muted-foreground">/100</span>
                  </div>
                  <Badge variant={getRiskLevel(riskScore).color as any} className="mt-2">
                    {getRiskLevel(riskScore).label}
                  </Badge>
                </div>
                <Progress value={riskScore} className="mt-4 h-2" />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle>نتائج التحليل</CardTitle>
          <CardDescription>
            {riskFactors ? 'تفاصيل عوامل المخاطر' : 'ستظهر النتائج هنا بعد التحليل'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {riskFactors ? (
            <div className="space-y-6">
              {/* Risk Factors */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  عوامل المخاطر
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>تأخير الدفع</span>
                    </div>
                    <Badge variant="outline">{riskFactors.paymentDelay} يوم</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>المبلغ غير المدفوع</span>
                    </div>
                    <Badge variant="outline">{riskFactors.unpaidAmount.toFixed(3)} د.ك</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span>المخالفات المرورية</span>
                    </div>
                    <Badge variant="outline">{riskFactors.violationCount}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <FileWarning className="h-4 w-4 text-muted-foreground" />
                      <span>عدد العقود</span>
                    </div>
                    <Badge variant="outline">{riskFactors.contractHistory}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span>القضايا القانونية</span>
                    </div>
                    <Badge variant="outline">{riskFactors.litigationHistory}</Badge>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    التوصيات
                  </h4>
                  <div className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <Alert key={index}>
                        <AlertDescription className="text-sm">
                          {rec}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <p>لم يتم إجراء تحليل بعد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function calculateRiskFactors(customer: any): RiskFactors {
  // Payment delay calculation
  const payments = customer.payments || [];
  const overduePayments = payments.filter((p: any) => 
    p.status === 'pending' && new Date(p.due_date) < new Date()
  );
  
  const paymentDelay = overduePayments.length > 0
    ? Math.max(...overduePayments.map((p: any) => {
        const dueDate = new Date(p.due_date);
        const today = new Date();
        return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }))
    : 0;

  // Unpaid amount calculation
  const unpaidAmount = payments
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Violation count
  const violationCount = (customer.traffic_violations || []).length;

  // Contract history
  const contractHistory = (customer.contracts || []).length;

  // Litigation history
  const litigationHistory = (customer.legal_cases || [])
    .filter((c: any) => c.status === 'active')
    .length;

  return {
    paymentDelay,
    unpaidAmount,
    violationCount,
    contractHistory,
    litigationHistory
  };
}

function calculateRiskScore(factors: RiskFactors): number {
  // Weights for each factor
  const weights = {
    paymentDelay: 0.35,
    unpaidAmount: 0.30,
    violationCount: 0.20,
    contractHistory: 0.10,
    litigationHistory: 0.05
  };

  // Normalize factors to 0-100 scale
  const normalizedFactors = {
    paymentDelay: Math.min(factors.paymentDelay / 90, 1) * 100,
    unpaidAmount: Math.min(factors.unpaidAmount / 10000, 1) * 100,
    violationCount: Math.min(factors.violationCount / 10, 1) * 100,
    contractHistory: Math.max(0, 1 - factors.contractHistory / 20) * 100,
    litigationHistory: Math.min(factors.litigationHistory / 5, 1) * 100
  };

  // Calculate weighted score
  const score = Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (normalizedFactors[key as keyof typeof normalizedFactors] * weight);
  }, 0);

  return Math.min(Math.max(score, 0), 100);
}

function generateRecommendations(score: number, factors: RiskFactors): string[] {
  const recommendations: string[] = [];

  if (score >= 70) {
    recommendations.push('🔴 مراقبة مشددة: يُنصح بإصدار إنذار قانوني فوري');
    recommendations.push('💰 مطالبة فورية: يجب استرداد جميع المستحقات');
    recommendations.push('⚖️ استشارة قانونية: النظر في رفع دعوى قضائية');
    
    if (factors.unpaidAmount > 5000) {
      recommendations.push('💵 المبلغ كبير: يتطلب إجراءات عاجلة');
    }
  } else if (score >= 40) {
    recommendations.push('🟡 متابعة دورية: مراقبة منتظمة للمستحقات');
    recommendations.push('📞 تواصل مباشر: الاتصال بالعميل لتحديد موعد سداد');
    recommendations.push('📋 توثيق: تسجيل جميع المحادثات والاتفاقيات');
    
    if (factors.paymentDelay > 30) {
      recommendations.push('⏰ التأخير طويل: تنبيه العميل بالعواقب القانونية');
    }
  } else {
    recommendations.push('🟢 عميل جيد: متابعة عادية دون قلق');
    recommendations.push('✅ الحفاظ على العلاقة: تقديم خدمة ممتازة');
    recommendations.push('📈 فرصة للنمو: يمكن تقديم خدمات إضافية');
  }

  if (factors.violationCount > 3) {
    recommendations.push('🚗 مخالفات مرورية: مراجعة شروط التأجير وتحديث العقود');
  }

  if (factors.litigationHistory > 0) {
    recommendations.push('⚖️ سوابق قانونية: توخي الحذر في التعاملات المستقبلية');
  }

  return recommendations;
}
