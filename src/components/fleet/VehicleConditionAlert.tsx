import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { ConditionComparison } from "@/hooks/useVehicleConditionComparison";

interface VehicleConditionAlertProps {
  comparison: ConditionComparison;
  onViewDetails?: () => void;
}

export const VehicleConditionAlert = ({ comparison, onViewDetails }: VehicleConditionAlertProps) => {
  const { summary, damageChanges, conditionChanges } = comparison;

  const getAlertVariant = () => {
    if (summary.requiresAttention) return "destructive";
    if (summary.conditionImproved) return "default";
    return "default";
  };

  const getAlertIcon = () => {
    if (summary.requiresAttention) return <AlertTriangle className="h-4 w-4" />;
    if (summary.conditionImproved) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getAlertTitle = () => {
    if (summary.requiresAttention) return "تحتاج لانتباه - تم اكتشاف أضرار جديدة";
    if (summary.conditionImproved) return "تحسن حالة المركبة";
    return "تقرير مقارنة حالة المركبة";
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      {getAlertIcon()}
      <AlertTitle>{getAlertTitle()}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          {/* Damage Summary */}
          <div className="flex flex-wrap gap-2">
            {summary.totalNewDamages > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {summary.totalNewDamages} ضرر جديد
              </Badge>
            )}
            {summary.totalResolvedDamages > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {summary.totalResolvedDamages} ضرر تم إصلاحه
              </Badge>
            )}
            {conditionChanges.overallConditionChange.improved && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                تحسن الحالة العامة
              </Badge>
            )}
          </div>

          {/* Key Changes */}
          <div className="text-sm text-muted-foreground space-y-1">
            {conditionChanges.mileageIncrease > 0 && (
              <div>المسافة المقطوعة: {conditionChanges.mileageIncrease.toLocaleString()} كم</div>
            )}
            {conditionChanges.fuelLevelChange !== 0 && (
              <div>
                تغيير مستوى الوقود: 
                {conditionChanges.fuelLevelChange > 0 ? '+' : ''}
                {conditionChanges.fuelLevelChange}%
              </div>
            )}
            <div>
              الحالة العامة: {conditionChanges.overallConditionChange.from} ← {conditionChanges.overallConditionChange.to}
            </div>
          </div>

          {/* Detailed Damage Information */}
          {damageChanges.newDamages.length > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">الأضرار الجديدة المكتشفة:</h4>
              <div className="space-y-1">
                {damageChanges.newDamages.slice(0, 3).map((damage, index) => (
                  <div key={damage.id} className="text-sm flex items-center gap-2">
                    <Badge 
                      variant={damage.severity === 'severe' ? 'destructive' : damage.severity === 'moderate' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {damage.severity === 'severe' ? 'شديد' : damage.severity === 'moderate' ? 'متوسط' : 'بسيط'}
                    </Badge>
                    <span className="text-muted-foreground">{damage.description}</span>
                  </div>
                ))}
                {damageChanges.newDamages.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    ... و {damageChanges.newDamages.length - 3} أضرار أخرى
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {onViewDetails && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewDetails}
                className="text-xs"
              >
                عرض التفاصيل الكاملة
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};