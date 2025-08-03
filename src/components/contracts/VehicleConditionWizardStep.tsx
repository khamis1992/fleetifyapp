import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Car, Plus, Save } from 'lucide-react';
import { useCreateConditionReport, useUpdateConditionReport } from '@/hooks/useVehicleCondition';
import { useCreateContractDocument } from '@/hooks/useContractDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';
import { VehicleDiagramCanvas } from './VehicleDiagramCanvas';
import { toast } from 'sonner';

interface VehicleConditionWizardStepProps {
  vehicleId: string;
  contractId?: string;
  onComplete?: (reportId: string) => void;
}

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
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

const defaultConditionItems: ConditionItem[] = [
  { id: 'body', name: 'هيكل السيارة', condition: 'good' },
  { id: 'engine', name: 'المحرك', condition: 'good' },
  { id: 'transmission', name: 'ناقل الحركة', condition: 'good' },
  { id: 'brakes', name: 'المكابح', condition: 'good' },
  { id: 'tires', name: 'الإطارات', condition: 'good' },
  { id: 'lights', name: 'الأضواء', condition: 'good' },
  { id: 'interior', name: 'الداخلية', condition: 'good' },
  { id: 'air_conditioning', name: 'التكييف', condition: 'good' },
  { id: 'electrical', name: 'النظام الكهربائي', condition: 'good' },
  { id: 'suspension', name: 'نظام التعليق', condition: 'good' }
];

export function VehicleConditionWizardStep({ vehicleId, contractId, onComplete }: VehicleConditionWizardStepProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [overallCondition, setOverallCondition] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [mileage, setMileage] = useState<number>(0);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [notes, setNotes] = useState('');
  const [conditionItems, setConditionItems] = useState<ConditionItem[]>(defaultConditionItems);
  const [damagePoints, setDamagePoints] = useState<DamagePoint[]>([]);

  const createConditionReport = useCreateConditionReport();
  const updateConditionReport = useUpdateConditionReport();
  const createDocument = useCreateContractDocument();

  const handleConditionChange = (itemId: string, condition: ConditionItem['condition']) => {
    setConditionItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, condition } : item
      )
    );
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setConditionItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'fair': return 'مقبول';
      case 'poor': return 'ضعيف';
      default: return condition;
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast.error('لم يتم العثور على بيانات المستخدم');
        return;
      }

      const reportData = {
        dispatch_permit_id: null, // No dispatch permit for contract creation
        vehicle_id: vehicleId,
        inspection_type: (contractId ? 'contract_inspection' : 'pre_dispatch') as 'pre_dispatch' | 'post_dispatch' | 'contract_inspection',
        overall_condition: overallCondition,
        mileage_reading: mileage,
        fuel_level: fuelLevel,
        notes,
        condition_items: conditionItems.reduce((acc, item) => {
          acc[item.id] = {
            condition: item.condition,
            notes: item.notes || ''
          };
          return acc;
        }, {} as Record<string, any>),
        damage_items: damagePoints,
        contract_id: contractId || null
      };

      const report = await createConditionReport.mutateAsync(reportData);

      // If we have a contract, create a document entry linking the report
      if (contractId && report.id) {
        await createDocument.mutateAsync({
          contract_id: contractId,
          document_type: 'condition_report',
          document_name: `تقرير حالة المركبة - ${new Date().toLocaleDateString('en-GB')}`,
          notes: 'تقرير حالة المركبة المأخوذ عند بداية العقد',
          is_required: true,
          condition_report_id: report.id
        });
      }

      toast.success('تم حفظ تقرير حالة المركبة بنجاح');
      setIsOpen(false);
      onComplete?.(report.id);
    } catch (error) {
      console.error('Error saving condition report:', error);
      toast.error('فشل في حفظ تقرير حالة المركبة');
    }
  };

  const hasIssues = conditionItems.some(item => item.condition === 'poor') || damagePoints.length > 0;

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsOpen(true)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              فحص حالة المركبة
            </CardTitle>
            {hasIssues ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                يتطلب انتباه
              </Badge>
            ) : (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                جاهز للفحص
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            انقر لإجراء فحص شامل لحالة المركبة قبل بداية العقد
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Plus className="h-4 w-4" />
            <span className="text-sm">إضافة تقرير حالة</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>فحص حالة المركبة</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Overall Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="overall_condition">الحالة العامة</Label>
                <Select value={overallCondition} onValueChange={(value) => setOverallCondition(value as any)}>
                  <SelectTrigger>
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

              <div>
                <Label htmlFor="mileage">قراءة العداد (كم)</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="fuel_level">مستوى الوقود (%)</Label>
                <Input
                  id="fuel_level"
                  type="number"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(Number(e.target.value))}
                  placeholder="100"
                />
              </div>
            </div>

            {/* Detailed Condition Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">فحص تفصيلي للمكونات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conditionItems.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.name}</span>
                        <Select
                          value={item.condition}
                          onValueChange={(value) => handleConditionChange(item.id, value as ConditionItem['condition'])}
                        >
                          <SelectTrigger className="w-24">
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
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          item.condition === 'excellent' ? 'bg-green-500' :
                          item.condition === 'good' ? 'bg-blue-500' :
                          item.condition === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className={`text-sm ${getConditionColor(item.condition)}`}>
                          {getConditionText(item.condition)}
                        </span>
                      </div>

                      <Input
                        placeholder="ملاحظات (اختياري)"
                        value={item.notes || ''}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Damage Diagram */}
            <VehicleDiagramCanvas
              damagePoints={damagePoints}
              onDamagePointsChange={setDamagePoints}
              isReadOnly={false}
            />

            {/* General Notes */}
            <div>
              <Label htmlFor="notes">ملاحظات عامة</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف أي ملاحظات إضافية حول حالة المركبة..."
                rows={4}
              />
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملخص الفحص</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className={`text-2xl font-bold ${getConditionColor(overallCondition)}`}>
                      {getConditionText(overallCondition)}
                    </div>
                    <div className="text-sm text-muted-foreground">الحالة العامة</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{mileage.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">كيلومتر</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{fuelLevel}%</div>
                    <div className="text-sm text-muted-foreground">مستوى الوقود</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{damagePoints.length}</div>
                    <div className="text-sm text-muted-foreground">نقاط التلف</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={handleSave}
                disabled={createConditionReport.isPending || createDocument.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {createConditionReport.isPending || createDocument.isPending ? 'جاري الحفظ...' : 'حفظ التقرير'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}