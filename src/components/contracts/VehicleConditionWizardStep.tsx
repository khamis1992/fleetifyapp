import * as React from 'react';
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
import { useCreateContractDocument, useExportConditionDiagram } from '@/hooks/useContractDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';
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
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photos?: string[];
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
  const [isOpen, setIsOpen] = React.useState(false);
  const [overallCondition, setOverallCondition] = React.useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [mileage, setMileage] = React.useState<number>(0);
  const [fuelLevel, setFuelLevel] = React.useState<number>(100);
  const [notes, setNotes] = React.useState('');
  const [conditionItems, setConditionItems] = React.useState<ConditionItem[]>(defaultConditionItems);
  const [damagePoints, setDamagePoints] = React.useState<DamagePoint[]>([]);

  // Smart notes generation based on damage points
  const generateAutomaticNotes = (damages: DamagePoint[]) => {
    if (damages.length === 0) {
      return '';
    }

    const damagesByType = damages.reduce((acc, damage) => {
      if (!acc[damage.severity]) {
        acc[damage.severity] = [];
      }
      acc[damage.severity].push(damage.description);
      return acc;
    }, {} as Record<string, string[]>);

    let automaticNotes = '🚗 تقرير الأضرار المسجلة:\n\n';

    if (damagesByType.severe?.length > 0) {
      automaticNotes += '🔴 أضرار خطيرة:\n';
      damagesByType.severe.forEach((desc, index) => {
        automaticNotes += `${index + 1}. ${desc}\n`;
      });
      automaticNotes += '\n';
    }

    if (damagesByType.moderate?.length > 0) {
      automaticNotes += '🟡 أضرار متوسطة:\n';
      damagesByType.moderate.forEach((desc, index) => {
        automaticNotes += `${index + 1}. ${desc}\n`;
      });
      automaticNotes += '\n';
    }

    if (damagesByType.minor?.length > 0) {
      automaticNotes += '🟢 أضرار بسيطة:\n';
      damagesByType.minor.forEach((desc, index) => {
        automaticNotes += `${index + 1}. ${desc}\n`;
      });
      automaticNotes += '\n';
    }

    automaticNotes += `📊 إجمالي الأضرار: ${damages.length}\n`;
    automaticNotes += `📅 تاريخ الفحص: ${new Date().toLocaleDateString('en-US')}\n`;
    automaticNotes += '\n⚠️ يُرجى مراجعة هذه الأضرار والتأكد من توثيقها قبل بداية العقد.';

    return automaticNotes;
  };

  // Handle damage points change and auto-update notes
  const handleDamagePointsChange = (newDamagePoints: DamagePoint[]) => {
    setDamagePoints(newDamagePoints);
    
    // Generate automatic notes based on damage points
    const autoNotes = generateAutomaticNotes(newDamagePoints);
    
    // If there are damage points, set automatic notes
    // If no damage points, clear the automatic part but keep any manual notes
    if (newDamagePoints.length > 0) {
      setNotes(autoNotes);
    } else {
      // Clear automatic notes if no damage points
      setNotes('');
    }
  };

  const createConditionReport = useCreateConditionReport();
  const updateConditionReport = useUpdateConditionReport();
  const createDocument = useCreateContractDocument();
  const exportDiagram = useExportConditionDiagram();

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

    // Validation
    if (mileage <= 0) {
      toast.error('يرجى إدخال قراءة عداد صحيحة');
      return;
    }

    if (fuelLevel < 0 || fuelLevel > 100) {
      toast.error('يرجى إدخال مستوى وقود صحيح (0-100%)');
      return;
    }

    try {
      // Get user's company and current vehicle data
      const [profileResult, vehicleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('vehicles')
          .select('odometer_reading, current_mileage')
          .eq('id', vehicleId)
          .single()
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
        toast.error('لم يتم العثور على بيانات المستخدم');
        return;
      }

      if (vehicleResult.error) {
        console.error('Error fetching vehicle:', vehicleResult.error);
        toast.error('لم يتم العثور على بيانات المركبة');
        return;
      }

      const profile = profileResult.data;
      const vehicle = vehicleResult.data;

      // Validate mileage reading
      const currentOdometer = vehicle.odometer_reading || vehicle.current_mileage || 0;
      if (mileage < currentOdometer) {
        toast.error(`قراءة العداد يجب أن تكون أكبر من أو تساوي القراءة الحالية (${currentOdometer.toLocaleString()} كم)`);
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
        damage_points: damagePoints,
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
                    <VehicleConditionDiagram 
                      damagePoints={damagePoints} 
                      onDamagePointsChange={handleDamagePointsChange}
                      onExport={contractId ? async (imageBlob) => {
                        // This will be called when the report is saved
                        // The export will happen automatically
                      } : undefined}
                    />

            {/* General Notes */}
            <div>
              <Label htmlFor="notes" className="flex items-center gap-2">
                ملاحظات عامة
                {damagePoints.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    🤖 تم إنشاؤها تلقائياً من كروكي المركبة
                  </Badge>
                )}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  damagePoints.length > 0 
                    ? "تم إنشاء الملاحظات تلقائياً من الأضرار المحددة على الكروكي. يمكنك تعديلها أو إضافة المزيد..."
                    : "أضف أي ملاحظات إضافية حول حالة المركبة..."
                }
                rows={Math.max(4, Math.min(8, Math.ceil(notes.length / 60)))}
                className={damagePoints.length > 0 ? "border-blue-200 bg-blue-50/30" : ""}
              />
              {damagePoints.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  تم توليد هذه الملاحظات تلقائياً بناءً على الأضرار المحددة في كروكي المركبة
                </p>
              )}
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