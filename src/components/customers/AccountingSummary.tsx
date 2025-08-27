import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, DollarSign, CreditCard, TrendingUp, Shield } from 'lucide-react';

interface AccountingSummaryProps {
  customerData: any;
  onEdit?: (section: string) => void;
}

export const AccountingSummary: React.FC<AccountingSummaryProps> = ({ 
  customerData,
  onEdit 
}) => {
  const getCustomerDisplayName = () => {
    if (customerData.customer_type === 'company') {
      return customerData.company_name || 'الشركة';
    }
    return `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || 'العميل';
  };


  const getPaymentTermsLabel = (terms: string) => {
    const labels = {
      cash: 'نقداً',
      net_15: '15 يوم',
      net_30: '30 يوم',
      net_45: '45 يوم',
      net_60: '60 يوم',
      net_90: '90 يوم'
    };
    return labels[terms as keyof typeof labels] || terms;
  };

  const getRiskLevelBadge = (level: string) => {
    const badges = {
      low: { label: 'منخفض', variant: 'default' as const, color: 'bg-success/10 text-success border-success/20' },
      medium: { label: 'متوسط', variant: 'secondary' as const, color: 'bg-warning/10 text-warning border-warning/20' },
      high: { label: 'عالي', variant: 'destructive' as const, color: 'bg-destructive/10 text-destructive border-destructive/20' },
      critical: { label: 'حرج', variant: 'destructive' as const, color: 'bg-destructive/20 text-destructive border-destructive/30' }
    };
    return badges[level as keyof typeof badges] || badges.medium;
  };

  const accountsToGenerate = [
    { name: 'ذمم مدينة - عملاء', code: '1210001', required: true },
    { name: 'سلف وعهد عملاء', code: '1220001', required: false },
    { name: 'أمانات عملاء', code: '2110001', required: false },
    { name: 'خصومات مسموحة', code: '4210001', required: false }
  ].filter(account => account.required || customerData.accounts?.[account.name.split(' ')[0].toLowerCase()]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-5 w-5 text-success" />
          ملخص الإعدادات المحاسبية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Summary */}
        <Alert className="border-primary/20 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="font-medium mb-2">جاهز لإنشاء العميل: {getCustomerDisplayName()}</div>
            <div className="text-sm text-muted-foreground">
              سيتم إنشاء العميل مع كافة الحسابات المحاسبية والإعدادات المالية المحددة
            </div>
          </AlertDescription>
        </Alert>

        {/* Basic Info Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              البيانات الأساسية
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">نوع العميل:</span>
                <span>{customerData.customer_type === 'individual' ? 'فرد' : 'شركة'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">العملة الأساسية:</span>
                <span>{customerData.base_currency || 'KWD'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              الإعدادات المالية
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">حد الائتمان:</span>
                <span>{customerData.initial_credit_limit || '0.00'} {customerData.base_currency || 'KWD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">شروط الدفع:</span>
                <span>{getPaymentTermsLabel(customerData.payment_terms)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">نسبة الخصم:</span>
                <span>{customerData.default_discount_percentage || '0'}%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Accounts Summary */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الحسابات المحاسبية ({accountsToGenerate.length})
          </h4>
          
          <div className="space-y-2">
            {accountsToGenerate.map((account, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{account.name}</span>
                  {account.required && (
                    <Badge variant="destructive" className="text-xs">مطلوب</Badge>
                  )}
                </div>
                <span className="text-sm font-mono text-muted-foreground">{account.code}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Risk Assessment */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            تقييم المخاطر والأمان
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">مستوى المخاطر:</span>
                <Badge 
                  className={getRiskLevelBadge(customerData.risk_level || 'medium').color}
                >
                  {getRiskLevelBadge(customerData.risk_level || 'medium').label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">الإعفاء الضريبي:</span>
                <span className="text-sm">
                  {customerData.tax_exempt === 'no' ? 'غير معفى' : 
                   customerData.tax_exempt === 'partial' ? 'إعفاء جزئي' : 
                   customerData.tax_exempt === 'full' ? 'إعفاء كامل' : 'غير محدد'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">مجموعة الخصم:</span>
                <span className="text-sm">{customerData.discount_group || 'بدون خصم'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">تاريخ الإنشاء:</span>
                <span className="text-sm">{new Date().toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Verification */}
        <Alert className="border-success/20 bg-success/5">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-sm">
            <div className="font-medium mb-1">تم التحقق من جميع البيانات المحاسبية</div>
            <div>جميع الحقول المطلوبة مكتملة والحسابات المحاسبية جاهزة للإنشاء</div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};