import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { VehicleConditionDiagram } from './VehicleConditionDiagram';
import { UnifiedOdometerInput } from './UnifiedOdometerInput';
import { useUpdateConditionReport } from '@/hooks/useVehicleCondition';
import { useUpdateOdometerForOperation } from '@/hooks/useUnifiedOdometerManagement';
import type { VehicleConditionReport as VehicleConditionReportType, UpdateConditionReportData } from '@/hooks/useVehicleCondition';
import { CheckCircle, AlertTriangle, X, FileText } from 'lucide-react';

interface VehicleConditionReportProps {
  report: VehicleConditionReportType;
  readonly?: boolean;
  onStatusChange?: (status: string) => void;
  onClose?: () => void;
}

export const VehicleConditionReport: React.FC<VehicleConditionReportProps> = ({
  report,
  readonly = false,
  onStatusChange,
  onClose
}) => {
  const [formData, setFormData] = useState({
    overall_condition: report.overall_condition,
    mileage_reading: report.mileage_reading || 0,
    fuel_level: report.fuel_level || 100,
    notes: report.notes || '',
    damage_points: report.damage_points,
    status: report.status
  });

  const updateMutation = useUpdateConditionReport();
  const { updateForDispatchStart, updateForDispatchEnd } = useUpdateOdometerForOperation();

  const handleSave = async () => {
    console.log('Save button clicked!');
    console.log('Readonly:', readonly);
    console.log('Report ID:', report.id);
    console.log('Form data:', formData);
    
    if (readonly) return;

    try {
      // First update the odometer reading in the unified system
      if (report.dispatch_permit_id && formData.mileage_reading) {
        const odometerData = {
          vehicle_id: report.vehicle_id,
          permit_id: report.dispatch_permit_id,
          odometer_reading: formData.mileage_reading,
          fuel_level_percentage: formData.fuel_level,
          notes: `${report.inspection_type === 'pre_dispatch' ? 'Pre-dispatch' : 'Post-dispatch'} condition report`
        };

        if (report.inspection_type === 'pre_dispatch') {
          await updateForDispatchStart(odometerData);
        } else if (report.inspection_type === 'post_dispatch') {
          await updateForDispatchEnd(odometerData);
        }
      }

      // Then update the condition report
      const updateData: UpdateConditionReportData = {
        overall_condition: formData.overall_condition,
        mileage_reading: formData.mileage_reading,
        fuel_level: formData.fuel_level,
        notes: formData.notes,
        damage_points: formData.damage_points,
        status: formData.status
      };

      console.log('Update data:', updateData);
      
      await updateMutation.mutateAsync({ id: report.id, updates: updateData });
      console.log('Save successful!');
      onStatusChange?.(formData.status);
      // Close the dialog after successful save
      onClose?.();
    } catch (error) {
      console.error('Save failed:', error);
      // The mutation will handle retries automatically via react-query
    }
  };


  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'fair': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor': return <X className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'requires_attention': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير حالة المركبة
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(formData.status)}>
                {formData.status === 'pending' ? 'قيد الانتظار' : 
                 formData.status === 'approved' ? 'موافق عليه' : 
                 formData.status === 'requires_attention' ? 'يتطلب انتباه' : 
                 formData.status}
              </Badge>
              {getConditionIcon(formData.overall_condition)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">الحالة العامة</label>
              <Select
                value={formData.overall_condition}
                onValueChange={(value: unknown) => setFormData({ ...formData, overall_condition: value })}
                disabled={readonly}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">ممتاز</SelectItem>
                  <SelectItem value="good">جيد</SelectItem>
                  <SelectItem value="fair">مقبول</SelectItem>
                  <SelectItem value="poor">ضعيف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unified Odometer and Fuel Input */}
          {!readonly && (
            <UnifiedOdometerInput
              vehicleId={report.vehicle_id}
              odometerValue={formData.mileage_reading}
              onOdometerChange={(value) => setFormData({ ...formData, mileage_reading: value })}
              fuelLevel={formData.fuel_level}
              onFuelLevelChange={(value) => setFormData({ ...formData, fuel_level: value })}
              showCurrentReading={true}
              showFuelInput={true}
              disabled={readonly}
              required={false}
            />
          )}

          {/* Read-only display for approved reports */}
          {readonly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">قراءة العداد</h4>
                <p className="text-lg font-medium">
                  {formData.mileage_reading?.toLocaleString()} كم
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">مستوى الوقود</h4>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${formData.fuel_level || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium min-w-[45px]">{formData.fuel_level}%</span>
                </div>
              </div>
            </div>
          )}

          {!readonly && (
            <div>
              <label className="text-sm font-medium">حالة التقرير</label>
              <Select
                value={formData.status}
                onValueChange={(value: unknown) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="approved">موافق عليه</SelectItem>
                  <SelectItem value="requires_attention">يتطلب انتباه</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Vehicle Damage Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>نقاط أضرار المركبة</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleConditionDiagram
            damagePoints={formData.damage_points}
            onDamagePointsChange={(points) => setFormData({ ...formData, damage_points: points })}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>ملاحظات إضافية</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أضف أي ملاحظات إضافية حول حالة المركبة..."
            rows={4}
            disabled={readonly}
            dir="rtl"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readonly && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التقرير'}
          </Button>
          <Button variant="outline">
            إنشاء ملف PDF
          </Button>
        </div>
      )}
    </div>
  );
};