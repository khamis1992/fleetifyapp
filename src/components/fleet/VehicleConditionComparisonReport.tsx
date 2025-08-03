import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Car, 
  Fuel, 
  Gauge, 
  AlertTriangle,
  CheckCircle,
  Download,
  FileText
} from "lucide-react";
import { ConditionComparison } from "@/hooks/useVehicleConditionComparison";
import { useDamageReportExport } from "@/hooks/useDamageReportExport";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface VehicleConditionComparisonReportProps {
  comparison: ConditionComparison;
  onClose?: () => void;
}

export const VehicleConditionComparisonReport = ({ 
  comparison, 
  onClose 
}: VehicleConditionComparisonReportProps) => {
  const { exportDamageReport, isExporting } = useDamageReportExport();
  const { summary, damageChanges, conditionChanges, initialReport, returnReport } = comparison;

  const handleExportReport = async () => {
    if (!comparison.contractId) return;
    
    await exportDamageReport({
      conditionReportId: comparison.contractId,
      damagePoints: [
        ...damageChanges.newDamages,
        ...damageChanges.existingDamages,
        ...damageChanges.resolvedDamages
      ],
      title: `تقرير مقارنة حالة المركبة - العقد ${comparison.contractId}`
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'destructive';
      case 'moderate': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'severe': return 'شديد';
      case 'moderate': return 'متوسط';
      default: return 'بسيط';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'ممتازة';
      case 'good': return 'جيدة';
      case 'fair': return 'مقبولة';
      case 'poor': return 'سيئة';
      default: return condition;
    }
  };

  const getConditionScore = (condition: string) => {
    switch (condition) {
      case 'excellent': return 100;
      case 'good': return 75;
      case 'fair': return 50;
      case 'poor': return 25;
      default: return 75;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">تقرير مقارنة حالة المركبة</h2>
          <p className="text-muted-foreground">العقد رقم: {comparison.contractId}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportReport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <FileText className="h-4 w-4 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                تصدير التقرير
              </>
            )}
          </Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>إغلاق</Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">أضرار جديدة</p>
                <p className="text-2xl font-bold text-destructive">{summary.totalNewDamages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">أضرار تم إصلاحها</p>
                <p className="text-2xl font-bold text-green-600">{summary.totalResolvedDamages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <div>
                <p className="text-sm text-muted-foreground">المسافة المقطوعة</p>
                <p className="text-2xl font-bold">{conditionChanges.mileageIncrease.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">كيلومتر</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {summary.conditionImproved ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">حالة المركبة</p>
                <p className="text-lg font-bold">
                  {summary.conditionImproved ? 'تحسنت' : 'تغيرت'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Condition Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            تغييرات الحالة العامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">الحالة العامة</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">البداية:</span>
                  <Badge variant="outline">
                    {getConditionText(conditionChanges.overallConditionChange.from)}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${getConditionScore(conditionChanges.overallConditionChange.from)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">النهاية:</span>
                  <Badge variant={conditionChanges.overallConditionChange.improved ? "default" : "secondary"}>
                    {getConditionText(conditionChanges.overallConditionChange.to)}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${getConditionScore(conditionChanges.overallConditionChange.to)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">المقاييس الأخرى</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    تغيير مستوى الوقود:
                  </span>
                  <span className={`font-medium ${conditionChanges.fuelLevelChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {conditionChanges.fuelLevelChange >= 0 ? '+' : ''}{conditionChanges.fuelLevelChange}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    المسافة المقطوعة:
                  </span>
                  <span className="font-medium">{conditionChanges.mileageIncrease.toLocaleString()} كم</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Damage Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* New Damages */}
        {damageChanges.newDamages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <TrendingUp className="h-5 w-5" />
                أضرار جديدة ({damageChanges.newDamages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {damageChanges.newDamages.map((damage) => (
                  <div key={damage.id} className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={getSeverityColor(damage.severity)} className="text-xs">
                        {getSeverityText(damage.severity)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({damage.x}, {damage.y})
                      </span>
                    </div>
                    <p className="text-sm">{damage.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Damages */}
        {damageChanges.existingDamages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                أضرار موجودة ({damageChanges.existingDamages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {damageChanges.existingDamages.map((damage) => (
                  <div key={damage.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={getSeverityColor(damage.severity)} className="text-xs">
                        {getSeverityText(damage.severity)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({damage.x}, {damage.y})
                      </span>
                    </div>
                    <p className="text-sm">{damage.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolved Damages */}
        {damageChanges.resolvedDamages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                أضرار تم إصلاحها ({damageChanges.resolvedDamages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {damageChanges.resolvedDamages.map((damage) => (
                  <div key={damage.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getSeverityText(damage.severity)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({damage.x}, {damage.y})
                      </span>
                    </div>
                    <p className="text-sm">{damage.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>الجدول الزمني للتقارير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {initialReport && (
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">تقرير الحالة الأولية</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(initialReport.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                  </p>
                  <p className="text-sm">
                    الحالة: {getConditionText(initialReport.overall_condition)} | 
                    العداد: {initialReport.mileage_reading?.toLocaleString()} كم
                  </p>
                </div>
              </div>
            )}
            
            {returnReport && (
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">تقرير الإرجاع</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date((returnReport as any).returned_at || (returnReport as any).created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                  </p>
                  <p className="text-sm">
                    الحالة: {getConditionText((returnReport as any).vehicle_condition)} | 
                    العداد: {(returnReport as any).odometer_reading?.toLocaleString()} كم
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
