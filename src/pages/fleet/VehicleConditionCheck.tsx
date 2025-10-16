import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';
import { UnifiedOdometerInput } from '@/components/fleet/UnifiedOdometerInput';
import { ArrowLeft, Car, ClipboardCheck, Fuel, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateOdometerForOperation } from '@/hooks/useUnifiedOdometerManagement';

interface ConditionItem {
  id: string;
  name: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

interface DamagePoint {
  id: string;
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photos?: string[];
}

export const VehicleConditionCheck = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { updateForDispatchStart, updateForDispatchEnd } = useUpdateOdometerForOperation();
  
  const permitId = searchParams.get('permitId');
  const vehicleId = searchParams.get('vehicleId');
  const vehicleName = searchParams.get('vehicleName');
  const inspectionType = searchParams.get('type') || 'pre_dispatch';

  const [overallCondition, setOverallCondition] = useState<string>('');
  const [odometerReading, setOdometerReading] = useState<number>(0);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [notes, setNotes] = useState<string>('');
  const [damagePoints, setDamagePoints] = useState<DamagePoint[]>([]);
  
  const [conditionItems, setConditionItems] = useState<ConditionItem[]>([
    { id: '1', name: 'الإطارات الأمامية', condition: 'good' },
    { id: '2', name: 'الإطارات الخلفية', condition: 'good' },
    { id: '3', name: 'المصابيح الأمامية', condition: 'good' },
    { id: '4', name: 'المصابيح الخلفية', condition: 'good' },
    { id: '5', name: 'المرايا', condition: 'good' },
    { id: '6', name: 'الزجاج الأمامي', condition: 'good' },
    { id: '7', name: 'الزجاج الخلفي', condition: 'good' },
    { id: '8', name: 'المحرك', condition: 'good' },
    { id: '9', name: 'الفرامل', condition: 'good' },
    { id: '10', name: 'نظام التكييف', condition: 'good' },
    { id: '11', name: 'حزام الأمان', condition: 'good' },
    { id: '12', name: 'الهيكل الخارجي', condition: 'good' },
  ]);

  const handleConditionChange = (itemId: string, condition: 'excellent' | 'good' | 'fair' | 'poor') => {
    setConditionItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, condition } : item
      )
    );
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'fair': return 'متوسط';
      case 'poor': return 'ضعيف';
      default: return condition;
    }
  };

  const handleSave = async () => {
    try {
      // Update the odometer reading in the unified system if we have the necessary data
      if (permitId && vehicleId && odometerReading > 0) {
        const odometerData = {
          vehicle_id: vehicleId,
          permit_id: permitId,
          odometer_reading: odometerReading,
          fuel_level_percentage: fuelLevel,
          notes: `${inspectionType === 'pre_dispatch' ? 'Pre-dispatch' : 'Post-dispatch'} condition check`
        };

        if (inspectionType === 'pre_dispatch') {
          await updateForDispatchStart(odometerData);
        } else {
          await updateForDispatchEnd(odometerData);
        }
      }

      // Here you would typically save the condition report to the database
      toast({
        title: "تم حفظ تقرير الفحص",
        description: "تم حفظ تقرير فحص حالة المركبة بنجاح",
      });
      
      // Navigate back to dispatch permits
      navigate('/fleet/dispatch-permits');
    } catch (error) {
      logger.error('Error saving condition check:', error);
      toast({
        title: "خطأ في حفظ التقرير",
        description: "حدث خطأ أثناء حفظ تقرير الفحص. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    navigate('/fleet/dispatch-permits');
  };

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-3xl font-bold">فحص حالة المركبة</h1>
            <p className="text-muted-foreground">
              {vehicleName} - {inspectionType === 'pre_dispatch' ? 'فحص ما قبل التشغيل' : 'فحص ما بعد التشغيل'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicle Condition Checklist */}
          <div className="space-y-6">
            {/* Overall Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  معلومات عامة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">الحالة العامة</label>
                  <Select value={overallCondition} onValueChange={setOverallCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة العامة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">ممتاز</SelectItem>
                      <SelectItem value="good">جيد</SelectItem>
                      <SelectItem value="fair">متوسط</SelectItem>
                      <SelectItem value="poor">ضعيف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Unified Odometer and Fuel Input */}
                {vehicleId && (
                  <UnifiedOdometerInput
                    vehicleId={vehicleId}
                    odometerValue={odometerReading}
                    onOdometerChange={setOdometerReading}
                    fuelLevel={fuelLevel}
                    onFuelLevelChange={setFuelLevel}
                    showCurrentReading={true}
                    showFuelInput={true}
                    required={false}
                  />
                )}
              </CardContent>
            </Card>

            {/* Detailed Checklist */}
            <Card>
              <CardHeader>
                <CardTitle>قائمة الفحص التفصيلية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conditionItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex gap-2">
                        {['excellent', 'good', 'fair', 'poor'].map((condition) => (
                          <Button
                            key={condition}
                            variant={item.condition === condition ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleConditionChange(item.id, condition as any)}
                            className={item.condition === condition ? getConditionColor(condition) : ''}
                          >
                            {getConditionText(condition)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات إضافية</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب أي ملاحظات أو تفاصيل إضافية حول حالة المركبة..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Vehicle Diagram */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  مخطط المركبة - تحديد الأضرار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VehicleConditionDiagram
                  damagePoints={damagePoints}
                  onDamagePointsChange={setDamagePoints}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>ملخص الفحص</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">الحالة العامة: </span>
                    {overallCondition && (
                      <Badge className={getConditionColor(overallCondition)}>
                        {getConditionText(overallCondition)}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">نقاط الضرر: </span>
                    <Badge variant="outline">{damagePoints.length}</Badge>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    حفظ التقرير
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="flex-1">
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};