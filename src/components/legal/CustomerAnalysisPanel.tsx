import React from 'react';
import { 
  User, 
  Building, 
  DollarSign, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CustomerAnalysis } from '@/hooks/useLegalMemos';

interface CustomerAnalysisPanelProps {
  analysis: CustomerAnalysis;
  isLoading?: boolean;
}

export const CustomerAnalysisPanel: React.FC<CustomerAnalysisPanelProps> = ({
  analysis,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { customer, financial_summary, contracts, risk_factors, recommendations } = analysis;
  
  const customerName = customer.customer_type === 'individual' 
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    : customer.company_name || '';

  const paymentHealthScore = financial_summary.outstanding_amount === 0 ? 100 : 
    Math.max(0, 100 - (financial_summary.outstanding_amount / financial_summary.total_invoiced * 100));

  return (
    <div className="space-y-4">
      {/* معلومات العميل الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {customer.customer_type === 'individual' ? (
              <User className="w-5 h-5" />
            ) : (
              <Building className="w-5 h-5" />
            )}
            معلومات العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">الاسم</label>
              <p className="text-lg font-semibold">{customerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">النوع</label>
              <Badge variant={customer.customer_type === 'individual' ? 'default' : 'secondary'}>
                {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {customer.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
                <p>{customer.email}</p>
              </div>
            )}
            {customer.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">رقم الهاتف</label>
                <p dir="ltr">{customer.phone}</p>
              </div>
            )}
          </div>

          {customer.national_id && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">الرقم المدني</label>
              <p>{customer.national_id}</p>
            </div>
          )}

          {customer.is_blacklisted && (
            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
              <AlertTriangle className="w-3 h-3" />
              عميل محظور
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* الملخص المالي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            الملخص المالي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {financial_summary.total_contract_value.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">إجمالي قيمة العقود</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {financial_summary.total_invoiced.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">إجمالي الفواتير</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {financial_summary.total_paid.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">إجمالي المدفوع</div>
            </div>
            
            <div className={`text-center p-3 rounded-lg ${
              financial_summary.outstanding_amount > 0 ? 'bg-orange-50' : 'bg-green-50'
            }`}>
              <div className={`text-2xl font-bold ${
                financial_summary.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {financial_summary.outstanding_amount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">المبلغ المستحق</div>
            </div>
          </div>

          {/* مؤشر الصحة المالية */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">مؤشر الصحة المالية</label>
              <span className="text-sm font-bold">{Math.round(paymentHealthScore)}%</span>
            </div>
            <Progress value={paymentHealthScore} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              {paymentHealthScore >= 80 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">وضع مالي ممتاز</span>
                </>
              ) : paymentHealthScore >= 60 ? (
                <>
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-600">وضع مالي جيد</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">يحتاج متابعة</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* العقود النشطة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            العقود ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">لا توجد عقود مسجلة</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 3).map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">{contract.contract_number}</p>
                    <p className="text-sm text-muted-foreground">{contract.contract_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{contract.contract_amount?.toLocaleString()} د.ك</p>
                    <Badge variant={
                      contract.status === 'active' ? 'default' : 
                      contract.status === 'suspended' ? 'destructive' : 'secondary'
                    }>
                      {contract.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {contracts.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{contracts.length - 3} عقود أخرى
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* عوامل المخاطر */}
      {risk_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              عوامل المخاطر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {risk_factors.map((risk, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">{risk}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* التوصيات */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              التوصيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* تحذير الخصوصية */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            هذه البيانات سرية ومحمية. جميع عمليات الوصول مسجلة للمراجعة والأمان.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};