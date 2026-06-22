import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, X, Clock, Users, Car, DollarSign, Calendar } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ValidationResult } from '@/hooks/useContractValidation';

interface ContractValidationSummaryProps {
  validation: ValidationResult;
  contractData: any;
  isValidating?: boolean;
}

export const ContractValidationSummary: React.FC<ContractValidationSummaryProps> = ({
  validation,
  contractData,
  isValidating = false
  }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const totalIssues = validation.errors.length + validation.warnings.length;
  const criticalIssues = validation.errors.filter(e => e.severity === 'critical').length;
  const hasBlockingIssues = validation.errors.length > 0;

  if (isValidating) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            جارٍ التحقق النهائي من العقد...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={`border-2 ${
        hasBlockingIssues 
          ? 'border-red-300 bg-red-50/50' 
          : totalIssues > 0 
            ? 'border-amber-300 bg-amber-50/50'
            : 'border-green-300 bg-green-50/50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasBlockingIssues ? (
                <X className="h-5 w-5 text-red-600" />
              ) : totalIssues > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <span className="text-base">
                {hasBlockingIssues ? 'العقد غير جاهز للإنشاء' : 
                 totalIssues > 0 ? 'العقد جاهز مع تحذيرات' : 
                 'العقد جاهز للإنشاء'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {criticalIssues > 0 && (
                <Badge variant="destructive">{criticalIssues} أخطاء حرجة</Badge>
              )}
              {validation.warnings.length > 0 && (
                <Badge variant="default">{validation.warnings.length} تحذير</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        {totalIssues > 0 && (
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">
              {hasBlockingIssues 
                ? 'يجب إصلاح جميع الأخطاء قبل المتابعة'
                : 'يمكن المتابعة مع مراجعة التحذيرات'
              }
            </div>
          </CardContent>
        )}
      </Card>

      {/* Detailed Validation Results */}
      {totalIssues > 0 && (
        <div className="space-y-3">
          {validation.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  أخطاء يجب إصلاحها ({validation.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {validation.errors.map((error, index) => (
                  <Alert key={index} variant="destructive" className="py-2">
                    <AlertDescription className="text-sm">
                      {error.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {validation.warnings.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  تحذيرات ({validation.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {validation.warnings.map((warning, index) => (
                  <Alert key={index} className="py-2 border-amber-200 bg-amber-50">
                    <AlertDescription className="text-sm">
                      {warning.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Contract Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            ملخص العقد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">العميل:</span>
              <span className="font-medium">{contractData.customer_name || 'غير محدد'}</span>
            </div>
            
            {contractData.vehicle_name && (
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">المركبة:</span>
                <span className="font-medium">{contractData.vehicle_name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">المدة:</span>
              <span className="font-medium">
                {contractData.start_date} إلى {contractData.end_date}
                {(() => {
                  // Calculate total duration
                  const totalDays = (contractData.rental_months || 0) * 30 + (contractData.rental_days || 0);
                  if (totalDays > 0) {
                    if (contractData.rental_months && contractData.rental_months > 0) {
                      const additionalDays = contractData.rental_days || 0;
                      return additionalDays > 0 
                        ? ` (${contractData.rental_months} شهر + ${additionalDays} يوم)`
                        : ` (${contractData.rental_months} شهر)`;
                    }
                    return ` (${totalDays} يوم)`;
                  }
                  return '';
                })()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">المبلغ:</span>
              <span className="font-medium">
                {formatCurrency(contractData.contract_amount || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                {contractData.monthly_amount && ` (${formatCurrency(contractData.monthly_amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}/شهر)`}
              </span>
            </div>
          </div>

          {/* Approval Status */}
          {contractData.requires_approval && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                هذا العقد يتطلب موافقة إدارية قبل التفعيل بسبب قيمته العالية
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};