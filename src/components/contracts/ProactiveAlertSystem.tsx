// @ts-nocheck
import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Clock, Users, Car } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidationResult, ValidationAlert } from '@/hooks/useContractValidation';
import { cn } from '@/lib/utils';

interface ProactiveAlertSystemProps {
  validation: ValidationResult;
  isValidating?: boolean;
  onDismissAlert?: (alertType: string) => void;
  showConflictDetails?: boolean;
}

const getSeverityIcon = (severity: ValidationAlert['severity']) => {
  switch (severity) {
    case 'critical':
      return <X className="h-4 w-4" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <AlertCircle className="h-4 w-4" />;
    case 'low':
      return <Info className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: ValidationAlert['severity']) => {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const getAlertVariant = (severity: ValidationAlert['severity']) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

const AlertItem: React.FC<{
  alert: ValidationAlert;
  onDismiss?: (alertType: string) => void;
  showConflictDetails?: boolean;
}> = ({ alert, onDismiss, showConflictDetails }) => {
  // Debug each alert item
  console.log('🚨 [ALERT_ITEM] Rendering alert:', {
    message: alert.message,
    severity: alert.severity,
    type: alert.type,
    alertData: alert
  });

  return (
    <Alert variant={getAlertVariant(alert.severity)} className="mb-3 border-2">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon(alert.severity)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <AlertDescription 
                className={cn(
                  "font-medium leading-relaxed",
                  alert.severity === 'critical' || alert.severity === 'high' 
                    ? "text-destructive dark:text-destructive" 
                    : "text-foreground"
                )}
                style={{ 
                  fontSize: '15px',
                  lineHeight: '1.5',
                  fontWeight: '500'
                }}
              >
                {alert.message || 'رسالة خطأ غير محددة'}
              </AlertDescription>
              <Badge 
                variant={getSeverityColor(alert.severity)} 
                className="text-xs font-medium mt-1 flex-shrink-0"
              >
                {alert.severity === 'critical' && 'خطر'}
                {alert.severity === 'high' && 'عالي'}
                {alert.severity === 'medium' && 'متوسط'}
                {alert.severity === 'low' && 'منخفض'}
              </Badge>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(alert.type)}
                className="h-auto p-1 flex-shrink-0 hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Display conflict details for vehicle conflicts */}
          {showConflictDetails && alert.conflicts && Array.isArray(alert.conflicts) && alert.conflicts.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">العقود المتضاربة:</p>
              {alert.conflicts.map((conflict: any, index: number) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span className="font-medium">{conflict.contract_number || 'رقم العقد غير متوفر'}</span>
                      </div>
                      <Badge variant="outline">{conflict.status || 'غير محدد'}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{conflict.customer_name || 'اسم العميل غير متوفر'}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{conflict.start_date || 'غير محدد'} إلى {conflict.end_date || 'غير محدد'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Display outstanding amount for payment issues */}
          {alert.amount && (
            <div className="mt-2 text-sm text-muted-foreground">
              المبلغ المستحق: {alert.amount} د.ك
            </div>
          )}

          {/* Display contract count for max contracts issue */}
          {alert.count && (
            <div className="mt-2 text-sm text-muted-foreground">
              عدد العقود النشطة: {alert.count}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

export const ProactiveAlertSystem: React.FC<ProactiveAlertSystemProps> = ({
  validation,
  isValidating = false,
  onDismissAlert,
  showConflictDetails = true
}) => {
  // Debug logging to understand what's happening
  console.log('🔍 [PROACTIVE_ALERT_SYSTEM] Validation data:', {
    errors: validation.errors,
    warnings: validation.warnings,
    errorsCount: validation.errors.length,
    warningsCount: validation.warnings.length,
    isValidating
  });

  const hasAlerts = validation.errors.length > 0 || validation.warnings.length > 0;

  if (isValidating) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            جارٍ التحقق من البيانات...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!hasAlerts) {
    return null;
  }

  return (
    <div className="space-y-3">
      {validation.errors.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" />
              أخطاء يجب إصلاحها ({validation.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {validation.errors.map((error, index) => {
              console.log(`🔴 [ERROR_${index}] Processing error:`, error);
              return (
                <AlertItem
                  key={`error-${index}`}
                  alert={error}
                  onDismiss={onDismissAlert}
                  showConflictDetails={showConflictDetails}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {validation.warnings.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-warning-foreground flex items-center gap-2 font-semibold">
              <AlertCircle className="h-5 w-5" />
              تحذيرات ({validation.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {validation.warnings.map((warning, index) => (
              <AlertItem
                key={`warning-${index}`}
                alert={warning}
                onDismiss={onDismissAlert}
                showConflictDetails={showConflictDetails}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};