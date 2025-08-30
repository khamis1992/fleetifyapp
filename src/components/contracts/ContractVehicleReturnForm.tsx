import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { CreateContractVehicleReturnData } from '@/hooks/useContractVehicleReturn';
import { useContractVehicle } from '@/hooks/useContractVehicle';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface Damage {
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  cost_estimate?: number;
}

interface DamagePoint {
  id: string;
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
}

interface ContractVehicleReturnFormProps {
  contract: any;
  onSubmit: (data: CreateContractVehicleReturnData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ContractVehicleReturnForm: React.FC<ContractVehicleReturnFormProps> = ({
  contract,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const { data: vehicleData } = useContractVehicle(contract.vehicle_id);
  const { formatCurrency } = useCurrencyFormatter();
  const [formData, setFormData] = useState<CreateContractVehicleReturnData>({
    contract_id: contract.id,
    vehicle_id: contract.vehicle_id,
    return_date: new Date().toISOString().split('T')[0],
    vehicle_condition: 'good',
    fuel_level: 100,
    odometer_reading: undefined,
    damages: [],
    notes: ''
  });

  const [damages, setDamages] = useState<Damage[]>([]);
  const [damagePoints, setDamagePoints] = useState<DamagePoint[]>([]);
  const [newDamage, setNewDamage] = useState<Damage>({
    type: '',
    description: '',
    severity: 'minor',
    cost_estimate: undefined
  });

  // Smart notes generation based on damage points
  const generateAutomaticNotes = (damages: DamagePoint[], manualDamages: Damage[]) => {
    const allDamages = [...damages, ...manualDamages.map(d => ({ severity: d.severity, description: d.description }))]
    
    if (allDamages.length === 0) {
      return '';
    }

    const damagesByType = allDamages.reduce((acc, damage) => {
      const severity = damage.severity === 'major' ? 'severe' : damage.severity;
      if (!acc[severity]) {
        acc[severity] = [];
      }
      acc[severity].push(damage.description);
      return acc;
    }, {} as Record<string, string[]>);

    let automaticNotes = '🚗 تقرير إرجاع المركبة - الأضرار المسجلة:\n\n';

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

    automaticNotes += `📊 إجمالي الأضرار: ${allDamages.length}\n`;
    automaticNotes += `📅 تاريخ الإرجاع: ${new Date().toLocaleDateString('ar-SA')}\n`;
    automaticNotes += '\n⚠️ يُرجى مراجعة هذه الأضرار وتقدير التكلفة قبل إغلاق العقد.';

    return automaticNotes;
  };

  // Update notes when damage points or manual damages change
  const updateAutomaticNotes = () => {
    const autoNotes = generateAutomaticNotes(damagePoints, damages);
    setFormData(prev => ({ ...prev, notes: autoNotes }));
  };

  // Handle damage points change and auto-update notes
  const handleDamagePointsChange = (newDamagePoints: DamagePoint[]) => {
    setDamagePoints(newDamagePoints);
    // Update automatic notes after damage points change
    setTimeout(() => {
      const autoNotes = generateAutomaticNotes(newDamagePoints, damages);
      if (newDamagePoints.length > 0 || damages.length > 0) {
        setFormData(prev => ({ ...prev, notes: autoNotes }));
      } else {
        setFormData(prev => ({ ...prev, notes: '' }));
      }
    }, 100);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // جمع كل الأضرار من المجسم والإدخال اليدوي
    const allDamages = [
      ...damages,
      ...damagePoints.map(point => ({
        type: 'ضرر على المجسم',
        description: point.description,
        severity: point.severity === 'severe' ? 'major' as const : 
                  point.severity === 'moderate' ? 'moderate' as const : 'minor' as const,
        position: { x: point.x, y: point.y },
        id: point.id
      }))
    ];
    
    onSubmit({
      ...formData,
      damages: allDamages
    });
  };

  const addDamage = () => {
    if (newDamage.type && newDamage.description) {
      const updatedDamages = [...damages, newDamage];
      setDamages(updatedDamages);
      setNewDamage({
        type: '',
        description: '',
        severity: 'minor',
        cost_estimate: undefined
      });
      // Update automatic notes after adding damage
      setTimeout(() => {
        const autoNotes = generateAutomaticNotes(damagePoints, updatedDamages);
        setFormData(prev => ({ ...prev, notes: autoNotes }));
      }, 100);
    }
  };

  const removeDamage = (index: number) => {
    const updatedDamages = damages.filter((_, i) => i !== index);
    setDamages(updatedDamages);
    // Update automatic notes after removing damage
    setTimeout(() => {
      const autoNotes = generateAutomaticNotes(damagePoints, updatedDamages);
      if (damagePoints.length > 0 || updatedDamages.length > 0) {
        setFormData(prev => ({ ...prev, notes: autoNotes }));
      } else {
        setFormData(prev => ({ ...prev, notes: '' }));
      }
    }, 100);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      case 'moderate': return 'bg-orange-100 text-orange-800';
      case 'major': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Contract Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات العقد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>رقم العقد</Label>
              <Input value={contract.contract_number} disabled />
            </div>
            <div>
              <Label>العميل</Label>
              <Input value={
                contract.customers?.customer_type === 'corporate' 
                  ? (contract.customers?.company_name_ar || 'غير محدد')
                  : `${contract.customers?.first_name_ar || ''} ${contract.customers?.last_name_ar || ''}`.trim() || 'غير محدد'
              } disabled />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>المركبة</Label>
              <Input value={
                vehicleData ? 
                  `${vehicleData.make || ''} ${vehicleData.model || ''} (${vehicleData.year || ''})`.trim() || 'غير محدد'
                  : 'غير محدد'
              } disabled />
            </div>
            <div>
              <Label>رقم اللوحة</Label>
              <Input value={vehicleData?.plate_number || 'غير محدد'} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تفاصيل إرجاع المركبة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="return_date">تاريخ الإرجاع</Label>
              <Input
                id="return_date"
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="vehicle_condition">حالة المركبة</Label>
              <Select
                value={formData.vehicle_condition}
                onValueChange={(value: 'excellent' | 'good' | 'fair' | 'poor') =>
                  setFormData({ ...formData, vehicle_condition: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">ممتازة</SelectItem>
                  <SelectItem value="good">جيدة</SelectItem>
                  <SelectItem value="fair">مقبولة</SelectItem>
                  <SelectItem value="poor">سيئة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fuel_level">مستوى الوقود (%)</Label>
              <Input
                id="fuel_level"
                type="number"
                min="0"
                max="100"
                value={formData.fuel_level}
                onChange={(e) => setFormData({ ...formData, fuel_level: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="odometer_reading">قراءة العداد (كم)</Label>
              <Input
                id="odometer_reading"
                type="number"
                value={formData.odometer_reading || ''}
                onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Damages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أضرار المركبة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vehicle Damage Diagram */}
          <div>
            <h4 className="font-medium mb-4">مجسم أضرار المركبة</h4>
          <VehicleConditionDiagram
            damagePoints={damagePoints}
            onDamagePointsChange={handleDamagePointsChange}
            readOnly={false}
            conditionReportId={contract.id} // Pass contract ID as placeholder for condition report
          />
          </div>

          {/* Separator */}
          {damagePoints.length > 0 && damages.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">أو</span>
              </div>
            </div>
          )}

          {/* Add New Damage */}
          <div>
            <h4 className="font-medium mb-4">إضافة أضرار يدوياً</h4>
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="damage_type">نوع الضرر</Label>
                <Input
                  id="damage_type"
                  placeholder="مثال: خدش، انبعاج"
                  value={newDamage.type}
                  onChange={(e) => setNewDamage({ ...newDamage, type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="damage_description">الوصف</Label>
                <Input
                  id="damage_description"
                  placeholder="وصف تفصيلي"
                  value={newDamage.description}
                  onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="damage_severity">الشدة</Label>
                <Select
                  value={newDamage.severity}
                  onValueChange={(value: 'minor' | 'moderate' | 'major') =>
                    setNewDamage({ ...newDamage, severity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">طفيف</SelectItem>
                    <SelectItem value="moderate">متوسط</SelectItem>
                    <SelectItem value="major">شديد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={addDamage} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة ضرر
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Manual Damages */}
          {damages.length > 0 && (
            <div>
              <h4 className="font-medium mb-4">الأضرار المضافة يدوياً</h4>
              <div className="space-y-2">
                {damages.map((damage, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <strong>{damage.type}</strong>
                        <p className="text-sm text-gray-600">{damage.description}</p>
                      </div>
                      <div>
                        <Badge className={getSeverityColor(damage.severity)}>
                          {damage.severity}
                        </Badge>
                      </div>
                      <div>
                        {damage.cost_estimate && (
                          <p className="text-sm">التكلفة المقدرة: {formatCurrency(damage.cost_estimate ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDamage(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {damages.length === 0 && damagePoints.length === 0 && (
            <p className="text-gray-500 text-center py-4">لا توجد أضرار مسجلة</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            ملاحظات إضافية
            {(damagePoints.length > 0 || damages.length > 0) && (
              <Badge variant="secondary" className="text-xs">
                🤖 تم إنشاؤها تلقائياً من الأضرار
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={
              (damagePoints.length > 0 || damages.length > 0)
                ? "تم إنشاء الملاحظات تلقائياً من الأضرار المحددة. يمكنك تعديلها أو إضافة المزيد..."
                : "أي ملاحظات إضافية حول حالة المركبة أو عملية الإرجاع..."
            }
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={Math.max(4, Math.min(8, Math.ceil(formData.notes.length / 60)))}
            className={(damagePoints.length > 0 || damages.length > 0) ? "border-blue-200 bg-blue-50/30" : ""}
          />
          {(damagePoints.length > 0 || damages.length > 0) && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              تم توليد هذه الملاحظات تلقائياً بناءً على الأضرار المسجلة في كروكي المركبة والأضرار اليدوية
            </p>
          )}
        </CardContent>
      </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جاري إنشاء نموذج الإرجاع...' : 'إنشاء نموذج الإرجاع'}
          </Button>
        </div>
      </form>
    );
  };
