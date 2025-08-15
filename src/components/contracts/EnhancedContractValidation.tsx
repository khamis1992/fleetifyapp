import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Info,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useContractValidation, ValidationAlert, ContractFormData } from '@/hooks/useContractValidation';
import { cn } from '@/lib/utils';

interface EnhancedContractValidationProps {
  data: ContractFormData;
  onDataCorrection?: (correctedData: Partial<ContractFormData>) => void;
  onValidate?: () => void;
  isValidating?: boolean;
  className?: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
    case 'low': return <Info className="h-4 w-4 text-blue-500" />;
    default: return <Info className="h-4 w-4" />;
  }
};

const getSeverityBadgeVariant = (severity: string) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'outline';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
    case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    default: return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20';
  }
};

export const EnhancedContractValidation: React.FC<EnhancedContractValidationProps> = ({
  data,
  onDataCorrection,
  onValidate,
  isValidating: externalValidating = false,
  className
}) => {
  const { 
    validation, 
    isValidating, 
    validateContract, 
    debouncedValidation 
  } = useContractValidation();
  
  const [retryCount, setRetryCount] = useState(0);
  const [lastValidationData, setLastValidationData] = useState<ContractFormData | null>(null);
  const [validationProgress, setValidationProgress] = useState(0);
  

  const isCurrentlyValidating = isValidating || externalValidating;

  // Auto-validate when data changes
  useEffect(() => {
    if (data && JSON.stringify(data) !== JSON.stringify(lastValidationData)) {
      setLastValidationData(data);
      debouncedValidation(data);
    }
  }, [data, debouncedValidation, lastValidationData]);

  // Progress simulation during validation
  useEffect(() => {
    if (isCurrentlyValidating) {
      setValidationProgress(0);
      const interval = setInterval(() => {
        setValidationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setValidationProgress(100);
    }
  }, [isCurrentlyValidating]);


  const retryValidation = async () => {
    setRetryCount(prev => prev + 1);
    if (data) {
      await validateContract(data);
    }
  };

  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;
  const totalIssues = validation.errors.length + validation.warnings.length;
  const criticalIssues = validation.errors.filter(e => e.severity === 'critical').length;

  if (isCurrentlyValidating) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              جاري التحقق من البيانات...
            </CardTitle>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {retryCount > 0 ? `المحاولة ${retryCount + 1}` : 'التحقق الأولي'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={validationProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              يتم التحقق من صحة البيانات وتوافقها مع النظام...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasIssues && validation.valid) {
    return (
      <Card className={cn("w-full border-green-200 bg-green-50 dark:bg-green-900/20", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 space-x-reverse">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="text-center">
              <p className="font-medium text-green-800 dark:text-green-200">
                تم التحقق من البيانات بنجاح
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                جميع البيانات صحيحة ومتوافقة مع النظام
              </p>
            </div>
            <Shield className="h-5 w-5 text-green-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {criticalIssues > 0 ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            نتائج التحقق من البيانات
            <Badge variant={criticalIssues > 0 ? "destructive" : "secondary"}>
              {totalIssues} مشكلة
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryValidation}
              disabled={isCurrentlyValidating}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              إعادة التحقق
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Errors */}
        {validation.errors.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              أخطاء يجب إصلاحها ({validation.errors.length})
            </h4>
            {validation.errors.map((error, index) => (
              <Alert 
                key={`error-${index}`} 
                className={cn("border-l-4", getSeverityColor(error.severity))}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(error.severity)}
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-medium">
                        {error.message}
                      </AlertTitle>
                      {error.conflicts && error.conflicts.length > 0 && (
                        <AlertDescription className="mt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer font-medium">
                              عرض التفاصيل ({error.conflicts.length})
                            </summary>
                            <div className="mt-2 space-y-1">
                              {error.conflicts.map((conflict: any, idx: number) => (
                                <div key={idx} className="bg-background rounded p-2">
                                  {JSON.stringify(conflict, null, 2)}
                                </div>
                              ))}
                            </div>
                          </details>
                        </AlertDescription>
                      )}
                    </div>
                  </div>
                  <Badge variant={getSeverityBadgeVariant(error.severity)} className="text-xs">
                    {error.severity}
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              تحذيرات ({validation.warnings.length})
            </h4>
            {validation.warnings.map((warning, index) => (
              <Alert 
                key={`warning-${index}`} 
                className={cn("border-l-4", getSeverityColor(warning.severity))}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(warning.severity)}
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-medium">
                        {warning.message}
                      </AlertTitle>
                      {warning.count && (
                        <AlertDescription className="text-xs text-muted-foreground">
                          العدد: {warning.count}
                        </AlertDescription>
                      )}
                    </div>
                  </div>
                  <Badge variant={getSeverityBadgeVariant(warning.severity)} className="text-xs">
                    {warning.severity}
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        )}


        {/* Manual Actions */}
        {(onDataCorrection || onValidate) && (
          <div className="flex gap-2 pt-4 border-t">
            {onValidate && (
              <Button onClick={onValidate} variant="outline" size="sm">
                <RefreshCw className="h-3 w-3 mr-1" />
                إعادة التحقق اليدوي
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};