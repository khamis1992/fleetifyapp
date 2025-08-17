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
import { Printer, Calendar, Clock, Eraser, Undo, X, Circle } from 'lucide-react';

interface InteractiveVehicleInspectionFormProps {
  vehicleId: string;
  contractId?: string;
  onComplete?: (reportId: string) => void;
}

interface DrawingPoint {
  x: number;
  y: number;
  type: 'damage' | 'scratch' | 'dent';
  tool: 'x' | 'o' | 'pen';
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
  const [currentTool, setCurrentTool] = useState<'x' | 'o' | 'pen'>('x');
  const [drawingHistory, setDrawingHistory] = useState<DrawingPoint[]>([]);
  const [fuelLevel, setFuelLevel] = useState([50]);
  const [mileage, setMileage] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');
  const [companySignature, setCompanySignature] = useState('');

  const { data: vehicle } = useContractVehicle(vehicleId);
  const createConditionReportMutation = useCreateConditionReport();

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
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawMark(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool !== 'pen') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawMark(x, y);
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

    switch (currentTool) {
      case 'x':
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 8);
        ctx.lineTo(x + 8, y + 8);
        ctx.moveTo(x + 8, y - 8);
        ctx.lineTo(x - 8, y + 8);
        ctx.stroke();
        break;
      case 'o':
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'pen':
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        break;
    }

    // Add to history
    setDrawingHistory(prev => [...prev, {
      x,
      y,
      type: currentTool === 'x' ? 'damage' : currentTool === 'o' ? 'scratch' : 'dent',
      tool: currentTool
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

    // Redraw all marks
    ctx.strokeStyle = '#DC2626';
    ctx.fillStyle = '#DC2626';
    ctx.lineWidth = 3;

    drawingHistory.forEach(point => {
      switch (point.tool) {
        case 'x':
          ctx.beginPath();
          ctx.moveTo(point.x - 8, point.y - 8);
          ctx.lineTo(point.x + 8, point.y + 8);
          ctx.moveTo(point.x + 8, point.y - 8);
          ctx.lineTo(point.x - 8, point.y + 8);
          ctx.stroke();
          break;
        case 'o':
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case 'pen':
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
          break;
      }
    });
  };

  const handleAccessoryChange = (accessoryId: string, checked: boolean) => {
    setAccessories(prev => prev.map(item => 
      item.id === accessoryId ? { ...item, checked } : item
    ));
  };

  const fillCurrentDateTime = () => {
    const now = new Date();
    const currentDateTime = now.toLocaleString('ar-SA');
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
      const conditionData = {
        overall_condition: 'good' as const,
        mileage: parseInt(mileage) || 0,
        fuel_level: fuelLevel[0],
        general_notes: additionalNotes,
        condition_items: accessories.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.checked ? 'present' : 'missing'
        }), {}),
        damage_points: drawingHistory,
        inspector_signature: companySignature,
        customer_signature: customerSignature
      };

      const result = await createConditionReportMutation.mutateAsync({
        vehicle_id: vehicleId,
        contract_id: contractId || undefined,
        inspection_type: 'contract_inspection',
        ...conditionData
      });

      toast({
        title: "تم حفظ التقرير بنجاح",
        description: "تم حفظ تقرير حالة المركبة بنجاح",
      });

      onComplete?.(result.id);
    } catch (error) {
      toast({
        title: "خطأ في حفظ التقرير",
        description: "حدث خطأ أثناء حفظ تقرير حالة المركبة",
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
                  variant={currentTool === 'x' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentTool('x')}
                >
                  <X className="h-4 w-4 ml-1" />
                  تلف
                </Button>
                <Button
                  variant={currentTool === 'o' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentTool('o')}
                >
                  <Circle className="h-4 w-4 ml-1" />
                  خدش
                </Button>
                <Button
                  variant={currentTool === 'pen' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentTool('pen')}
                >
                  قلم
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

          {/* Fuel Level and Mileage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">مستوى الوقود</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Slider
                    value={fuelLevel}
                    onValueChange={setFuelLevel}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-center">
                    <span className="text-2xl font-bold">{fuelLevel[0]}%</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>فارغ</span>
                    <span>ممتلئ</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">قراءة العداد</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  placeholder="أدخل قراءة العداد"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="text-center text-xl"
                />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  كيلومتر
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ملاحظات إضافية</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="أدخل أي ملاحظات إضافية حول حالة المركبة..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="min-h-24"
              />
            </CardContent>
          </Card>

          {/* Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توقيع المستأجر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Input
                    placeholder="توقيع المستأجر"
                    value={customerSignature}
                    onChange={(e) => setCustomerSignature(e.target.value)}
                    className="text-center"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توقيع المؤجر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Input
                    placeholder="توقيع المؤجر"
                    value={companySignature}
                    onChange={(e) => setCompanySignature(e.target.value)}
                    className="text-center"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

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