// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useContractVehicle } from '@/hooks/useContractVehicle';
import { useCreateConditionReport } from '@/hooks/useVehicleCondition';
import { useUpdateOdometerForOperation } from '@/hooks/useUnifiedOdometerManagement';
import { UnifiedOdometerInput } from '@/components/fleet/UnifiedOdometerInput';
import { Printer, Calendar, Clock, Eraser, Undo, X } from 'lucide-react';
import { VoiceInput } from '@/components/mobile';

interface InteractiveVehicleInspectionFormProps {
  vehicleId: string;
  contractId?: string;
  onComplete?: (reportId: string) => void;
}

interface DrawingPoint {
  x: number;
  y: number;
  type: 'damage';
  tool: 'x';
}

interface AccessoryItem {
  id: string;
  name: string;
  nameAr: string;
  checked: boolean;
}

const InteractiveVehicleInspectionForm: React.FC<InteractiveVehicleInspectionFormProps> = ({
  vehicleId,
  contractId,
  onComplete
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'x'>('x');
  const [drawingHistory, setDrawingHistory] = useState<DrawingPoint[]>([]);
  const [fuelLevel, setFuelLevel] = useState(50);
  const [mileage, setMileage] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState('');
  // Signature states removed - using manual signing after print

  const { data: vehicle } = useContractVehicle(vehicleId);
  const createConditionReportMutation = useCreateConditionReport();
  const { updateForContractStart } = useUpdateOdometerForOperation();

  const [accessories, setAccessories] = useState<AccessoryItem[]>([
    { id: 'spare_tire', name: 'Spare Tire', nameAr: 'إطار احتياطي', checked: false },
    { id: 'jack', name: 'Jack', nameAr: 'رافعة', checked: false },
    { id: 'tools', name: 'Tools', nameAr: 'أدوات', checked: false },
    { id: 'manual', name: 'Manual', nameAr: 'دليل الاستخدام', checked: false },
    { id: 'registration', name: 'Registration', nameAr: 'رخصة القيادة', checked: false },
    { id: 'insurance', name: 'Insurance', nameAr: 'تأمين', checked: false },
    { id: 'first_aid', name: 'First Aid Kit', nameAr: 'حقيبة إسعافات', checked: false },
    { id: 'fire_extinguisher', name: 'Fire Extinguisher', nameAr: 'طفاية حريق', checked: false },
    { id: 'warning_triangle', name: 'Warning Triangle', nameAr: 'مثلث تحذير', checked: false },
    { id: 'charger', name: 'Charger', nameAr: 'شاحن', checked: false }
  ]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 400;

    // Make canvas transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect || !canvas) return;

    // Calculate proper coordinates accounting for canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    drawMark(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Remove pen tool functionality
    return;
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const drawMark = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;
    
    // Only draw X marks for damage
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 8, y + 8);
    ctx.moveTo(x + 8, y - 8);
    ctx.lineTo(x - 8, y + 8);
    ctx.stroke();

    // Add to history
    setDrawingHistory(prev => [...prev, {
      x,
      y,
      type: 'damage',
      tool: 'x'
    }]);
  };

  const undoLastMark = () => {
    if (drawingHistory.length === 0) return;

    const newHistory = [...drawingHistory];
    newHistory.pop();
    setDrawingHistory(newHistory);

    // Redraw canvas
    redrawCanvas();
  };

  const clearCanvas = () => {
    setDrawingHistory([]);
    redrawCanvas();
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Clear canvas but keep it transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all marks (only X marks now)
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3;

    drawingHistory.forEach(point => {
      ctx.beginPath();
      ctx.moveTo(point.x - 8, point.y - 8);
      ctx.lineTo(point.x + 8, point.y + 8);
      ctx.moveTo(point.x + 8, point.y - 8);
      ctx.lineTo(point.x - 8, point.y + 8);
      ctx.stroke();
    });
  };

  const handleAccessoryChange = (accessoryId: string, checked: boolean) => {
    setAccessories(prev => prev.map(item => 
      item.id === accessoryId ? { ...item, checked } : item
    ));
  };

  const fillCurrentDateTime = () => {
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US');
    // This would typically set date/time fields if they existed
    toast({
      title: "تم تعبئة التاريخ والوقت",
      description: `التاريخ والوقت الحالي: ${currentDateTime}`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    try {
      console.log('Starting save process for vehicle condition report...');
      console.log('Vehicle ID:', vehicleId);
      console.log('Contract ID:', contractId);
      console.log('Mileage:', mileage);
      console.log('Fuel level:', fuelLevel);
      
      // Validation
      if (!mileage || mileage <= 0) {
        toast({
          title: "خطأ في البيانات",
          description: "يرجى إدخال قراءة عداد صحيحة أكبر من 0",
          variant: "destructive",
        });
        return;
      }

      if (fuelLevel < 0 || fuelLevel > 100) {
        toast({
          title: "خطأ في البيانات", 
          description: "يرجى إدخال مستوى وقود صحيح بين 0 و 100%",
          variant: "destructive",
        });
        return;
      }

      if (!vehicleId || vehicleId === 'none') {
        toast({
          title: "خطأ في البيانات",
          description: "لم يتم تحديد المركبة بشكل صحيح",
          variant: "destructive",
        });
        return;
      }

      // First, update the odometer reading in the unified system
      if (contractId) {
        await updateForContractStart({
          vehicle_id: vehicleId,
          contract_id: contractId,
          odometer_reading: mileage,
          fuel_level_percentage: fuelLevel,
          notes: additionalNotes || 'قراءة العداد عند بداية العقد'
        });
      }

      const conditionData = {
        overall_condition: 'good' as const,
        mileage_reading: mileage,
        fuel_level: fuelLevel,
        notes: additionalNotes || '',
        condition_items: accessories.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.checked ? 'present' : 'missing'
        }), {}),
        damage_points: drawingHistory || []
      };

      console.log('Condition data prepared:', conditionData);

      const requestData = {
        vehicle_id: vehicleId,
        contract_id: contractId || undefined,
        inspection_type: 'contract_inspection' as const,
        ...conditionData
      };

      console.log('Final request data:', requestData);

      const result = await createConditionReportMutation.mutateAsync(requestData);

      console.log('Condition report created successfully:', result);

      toast({
        title: "تم حفظ التقرير بنجاح",
        description: "تم حفظ تقرير حالة المركبة وتحديث العداد بنجاح",
      });

      onComplete?.(result.id);
    } catch (error) {
      console.error('Error saving condition report:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      
      // Provide more specific error messages
      let errorMessage = "حدث خطأ أثناء حفظ تقرير حالة المركبة";
      let errorDetails = "";
      
      if (error instanceof Error) {
        errorDetails = error.message;
        console.error('Error message:', error.message);
        
        if (error.message.includes('invalid input value') || error.message.includes('خطأ في البيانات المدخلة')) {
          errorMessage = "خطأ في البيانات المدخلة. تحقق من صحة جميع الحقول";
        } else if (error.message.includes('permission denied') || error.message.includes('غير مصرح')) {
          errorMessage = "غير مصرح لك بإنشاء تقارير حالة المركبات";
        } else if (error.message.includes('foreign key') || error.message.includes('المركبة المحددة غير موجودة')) {
          errorMessage = "المركبة المحددة غير موجودة أو غير صحيحة";
        } else if (error.message.includes('duplicate key') || error.message.includes('يوجد تقرير حالة مسبق')) {
          errorMessage = "يوجد تقرير حالة مسبق لهذه المركبة";
        } else if (error.message.includes('null value') || error.message.includes('بعض الحقول المطلوبة فارغة')) {
          errorMessage = "بعض الحقول المطلوبة فارغة. تحقق من البيانات";
        } else {
          errorMessage = `خطأ في حفظ التقرير: ${error.message}`;
        }
      }
      
      console.error('Final error message:', errorMessage);
      console.error('Error details:', errorDetails);
      
      toast({
        title: "خطأ في حفظ التقرير",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-background" dir="rtl">
      <Card>
        <CardHeader className="print:hidden">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">تقرير فحص المركبة</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fillCurrentDateTime}>
                <Clock className="h-4 w-4 ml-2" />
                تعبئة التاريخ/الوقت
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vehicle Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div>
              <Label>رقم اللوحة</Label>
              <Input value={vehicle?.plate_number || ''} readOnly className="mt-1" />
            </div>
            <div>
              <Label>الموديل</Label>
              <Input value={`${vehicle?.make || ''} ${vehicle?.model || ''}`} readOnly className="mt-1" />
            </div>
            <div>
              <Label>السنة</Label>
              <Input value={vehicle?.year || ''} readOnly className="mt-1" />
            </div>
          </div>

          {/* Accessories Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الملحقات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {accessories.map((accessory) => (
                  <div key={accessory.id} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={accessory.id}
                      checked={accessory.checked}
                      onCheckedChange={(checked) => 
                        handleAccessoryChange(accessory.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={accessory.id} className="text-sm">
                      {accessory.nameAr}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Diagram Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">كروكي المركبة</CardTitle>
              <div className="flex gap-2 print:hidden">
                <Button
                  variant="default"
                  size="sm"
                >
                  <X className="h-4 w-4 ml-1" />
                  تلف
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button variant="outline" size="sm" onClick={undoLastMark}>
                  <Undo className="h-4 w-4 ml-1" />
                  تراجع
                </Button>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <Eraser className="h-4 w-4 ml-1" />
                  مسح
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-background relative">
                <div 
                  className="relative w-full h-[500px] bg-contain bg-center bg-no-repeat rounded mx-auto max-w-sm"
                  style={{ backgroundImage: 'url(/مخطط.png)' }}
                >
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair rounded"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unified Odometer and Fuel Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">قراءة العداد ومستوى الوقود</CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedOdometerInput
                vehicleId={vehicleId}
                odometerValue={mileage}
                onOdometerChange={setMileage}
                fuelLevel={fuelLevel}
                onFuelLevelChange={setFuelLevel}
                showCurrentReading={true}
                showFuelInput={true}
                required={true}
              />
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">شروط وأحكام التسليم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="space-y-3 text-sm">
                  <div className="border-b pb-2">
                    <p className="font-medium text-foreground mb-1">
                      أُقرّ باستلام المركبة بالمواصفات المذكورة وأتعهد بالمحافظة عليها وإرجاعها بحالتها السليمة عند انتهاء المدة المتفق عليها في العقد.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      I acknowledge receiving the vehicle as described. I will keep it in good condition and return it in the same condition upon the agreed contract end.
                    </p>
                  </div>
                  
                  <div className="border-b pb-2">
                    <p className="font-medium text-foreground mb-1">
                      في حال وقوع حادث خلال فترة العقد أو تجديداته، أتعهد بإحضار تقرير حادث، ولن يُغلق العقد دون تقديم التقرير. ألتزم أيضًا بسداد رسوم فتح الملف وأي مبلغ نسبة تحمّل وفق وثيقة التأمين الشامل.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      If any accident occurs during the rental term or its renewals, I undertake to obtain and provide an official accident report. The contract will not be closed without it. I also agree to pay the file-opening fee and any deductible stated in the comprehensive insurance policy.
                    </p>
                  </div>
                  
                  <div className="border-b pb-2">
                    <p className="font-medium text-foreground mb-1">
                      تُستلم المركبة من المستأجر في مقر الجهة المؤجرة فقط.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Vehicle returns are accepted only at the lessor's premises.
                    </p>
                  </div>
                  
                  <div className="border-b pb-2">
                    <p className="font-medium text-foreground mb-1">
                      يجب إعادة المركبة ومستوى الوقود مماثلًا لما كان عند التسليم، وإلا تُستوفى تكلفة التعبئة.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Vehicle must be returned with the same fuel level as at handover; otherwise refueling charges apply.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">
                      غرامة/تعويض اتفاقي عن أي حادث (إن وُجد):
                    </p>
                    <Input
                      placeholder="المبلغ بالدينار الكويتي"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ملاحظات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="أدخل أي ملاحظات إضافية حول حالة المركبة..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="min-h-24"
              />
              <VoiceInput
                value={additionalNotes}
                onTranscript={(transcript) => setAdditionalNotes(transcript)}
                language="ar-SA"
                compact
                className="flex justify-end"
              />
            </CardContent>
          </Card>

          {/* Signatures - Manual signing after printing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توقيع المستأجر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-solid border-foreground/20 rounded-lg p-8 h-24 flex flex-col justify-end">
                  <div className="border-b border-foreground/30 w-full"></div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">التوقيع</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توقيع المؤجر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-solid border-foreground/20 rounded-lg p-8 h-24 flex flex-col justify-end">
                  <div className="border-b border-foreground/30 w-full"></div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">التوقيع</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توقيع على تقرير الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-solid border-foreground/20 rounded-lg p-8 h-24 flex flex-col justify-end">
                  <div className="border-b border-foreground/30 w-full"></div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">التوقيع</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Important Legal Notice */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-primary border border-primary/30 rounded-lg p-4 bg-primary/10">
                  بالتوقيع، يُعد هذا المستند ملحقًا مكملًا لشروط عقد الإيجار ومُلزمًا للطرفين.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 print:hidden">
            <Button variant="outline" onClick={clearCanvas}>
              <Eraser className="h-4 w-4 ml-2" />
              مسح الكل
            </Button>
            <Button onClick={handleSave} disabled={createConditionReportMutation.isPending}>
              {createConditionReportMutation.isPending ? 'جاري الحفظ...' : 'حفظ التقرير'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveVehicleInspectionForm;