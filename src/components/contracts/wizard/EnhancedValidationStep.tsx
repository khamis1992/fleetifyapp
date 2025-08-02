import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  Shield,
  Database,
  Zap
} from 'lucide-react';
import { useContractValidation } from '@/hooks/useContractValidation';
import { useContractHealthMonitor } from '@/hooks/useContractHealthMonitor';
import { EnhancedContractValidation } from '../EnhancedContractValidation';
import { cn } from '@/lib/utils';

interface EnhancedValidationStepProps {
  data: any;
  onDataChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  className?: string;
}

export const EnhancedValidationStep: React.FC<EnhancedValidationStepProps> = ({
  data,
  onDataChange,
  onNext,
  onPrevious,
  className
}) => {
  const { validation, isValidating, validateContract } = useContractValidation();
  const { 
    creationRequirements, 
    isLoadingRequirements, 
    checkRequirements,
    healthStats,
    hasUnresolvedCriticalIssues
  } = useContractHealthMonitor();
  
  const [systemHealthChecked, setSystemHealthChecked] = useState(false);
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);

  // Check system health and requirements on mount
  useEffect(() => {
    if (!systemHealthChecked) {
      checkRequirements();
      setSystemHealthChecked(true);
    }
  }, [systemHealthChecked, checkRequirements]);

  const canProceed = validation.valid && 
    (!creationRequirements || creationRequirements.valid) && 
    !hasUnresolvedCriticalIssues;

  const totalIssues = validation.errors.length + validation.warnings.length;
  const criticalIssues = validation.errors.filter(e => e.severity === 'critical').length;

  const handleDataCorrection = (correctedData: any) => {
    onDataChange({ ...data, ...correctedData });
  };

  const handleManualValidation = async () => {
    if (data) {
      await validateContract(data);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* System Health Overview */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Shield className="h-5 w-5" />
            حالة النظام
            {healthStats && (
              <Badge variant="outline" className="ml-auto">
                {healthStats.totalIssues} مشكلة مكتشفة
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Creation Requirements */}
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">متطلبات الإنشاء</p>
                {isLoadingRequirements ? (
                  <p className="text-sm text-muted-foreground">جاري الفحص...</p>
                ) : creationRequirements?.valid ? (
                  <p className="text-sm text-green-600">جميع المتطلبات متوفرة</p>
                ) : (
                  <p className="text-sm text-red-600">
                    {creationRequirements?.missing_requirements?.length || 0} متطلب مفقود
                  </p>
                )}
              </div>
            </div>

            {/* System Health */}
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">صحة النظام</p>
                <p className="text-sm text-muted-foreground">
                  {hasUnresolvedCriticalIssues ? 'يوجد مشاكل حرجة' : 'النظام يعمل بصورة طبيعية'}
                </p>
              </div>
            </div>

            {/* Smart Features */}
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-medium">الميزات الذكية</p>
                <p className="text-sm text-muted-foreground">التحقق التلقائي مفعل</p>
              </div>
            </div>
          </div>

          {/* Requirements Details */}
          {creationRequirements && !creationRequirements.valid && (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">متطلبات مفقودة:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {creationRequirements.missing_requirements?.map((req: any, index: number) => (
                      <li key={index}>{req.message}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* System Health Issues */}
          {hasUnresolvedCriticalIssues && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <p className="font-medium text-red-800">تحذير: يوجد مشاكل حرجة في النظام</p>
                <p className="text-sm text-red-600 mt-1">
                  يُنصح بحل هذه المشاكل قبل إنشاء عقود جديدة
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Contract Data Validation */}
      <EnhancedContractValidation
        data={data}
        onDataCorrection={handleDataCorrection}
        onValidate={handleManualValidation}
        isValidating={isValidating}
      />

      {/* Advanced Mode Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedMode(!showAdvancedMode)}
        >
          {showAdvancedMode ? 'إخفاء' : 'إظهار'} الوضع المتقدم
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleManualValidation}
            disabled={isValidating}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            إعادة التحقق
          </Button>
        </div>
      </div>

      {/* Advanced Mode Content */}
      {showAdvancedMode && (
        <Card>
          <CardHeader>
            <CardTitle>معلومات تفصيلية للمطورين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">حالة التحقق:</p>
                  <p className="text-muted-foreground">
                    {validation.valid ? 'صالح' : 'غير صالح'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">عدد الأخطاء:</p>
                  <p className="text-muted-foreground">{validation.errors.length}</p>
                </div>
                <div>
                  <p className="font-medium">عدد التحذيرات:</p>
                  <p className="text-muted-foreground">{validation.warnings.length}</p>
                </div>
                <div>
                  <p className="font-medium">الحالة الصحية:</p>
                  <p className="text-muted-foreground">
                    {hasUnresolvedCriticalIssues ? 'خطر' : 'آمن'}
                  </p>
                </div>
              </div>

              {/* Raw Data Preview */}
              <div>
                <p className="font-medium mb-2">بيانات العقد (JSON):</p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onPrevious}>
          السابق
        </Button>

        <div className="flex items-center gap-2">
          {totalIssues > 0 && (
            <Badge variant={criticalIssues > 0 ? "destructive" : "secondary"}>
              {totalIssues} مشكلة
            </Badge>
          )}
          
          <Button 
            onClick={onNext} 
            disabled={!canProceed || isValidating}
            className="min-w-[120px]"
          >
            {!canProceed ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                يوجد مشاكل
              </>
            ) : isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                جاري التحقق...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                التالي
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};