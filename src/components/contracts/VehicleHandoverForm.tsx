import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, Printer, Save } from 'lucide-react';

interface VehicleHandoverFormData {
  // بيانات العقد
  contract_date: string;
  contract_time: string;
  weekday: string;
  
  // بيانات السيارة
  plate_number: string;
  brand: string;
  model: string;
  color: string;
  type: string;
  mileage_out: number;
  
  // بيانات المستأجر
  lessee_name: string;
  civil_id: string;
  license_no: string;
  nationality: string;
  phone: string;
  month_rent: number;
  months: number;
  handover_area: string;
  
  // الملحقات
  accessories: {
    spare_tire: boolean;
    repair_kit: boolean;
    floor_mats: boolean;
    cig_lighter: boolean;
    wheel_caps: boolean;
    jack: boolean;
    wipers: boolean;
    ashtray: boolean;
    radio: boolean;
    mirror_in: boolean;
    mirror_out: boolean;
    extinguisher: boolean;
    headrests: boolean;
    orig_reg: boolean;
  };
  
  // الوقود
  fuel_percent: number;
  
  // حالة السيارة
  driver_side: string;
  passenger_side: string;
  notes: string;
  
  // الغرامات
  accident_fine: number;
  liquidated_damages: string;
  
  // التوقيعات
  lessee_sign_name: string;
  lessor_name: string;
  received_by_renter_only: boolean;
  terms_accepted: boolean;
}

const weekdays = [
  'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
];

const accessories = [
  { key: 'spare_tire', label: 'إطار احتياطي' },
  { key: 'repair_kit', label: 'عدة تصليح' },
  { key: 'floor_mats', label: 'فرشات أرضية' },
  { key: 'cig_lighter', label: 'ولاعة سجائر' },
  { key: 'wheel_caps', label: 'غطاء إطارات' },
  { key: 'jack', label: 'رافعة سيارة' },
  { key: 'wipers', label: 'المساحات' },
  { key: 'ashtray', label: 'طفاية سجائر' },
  { key: 'radio', label: 'راديو/مسجل' },
  { key: 'mirror_in', label: 'مرايا داخلية' },
  { key: 'mirror_out', label: 'مرايا خارجية' },
  { key: 'extinguisher', label: 'طفاية حريق' },
  { key: 'headrests', label: 'سنادات رأس' },
  { key: 'orig_reg', label: 'دفتر السيارة الأصلي' },
];

export const VehicleHandoverForm: React.FC = () => {
  const [formData, setFormData] = useState<VehicleHandoverFormData>({
    contract_date: '',
    contract_time: '',
    weekday: '',
    plate_number: '',
    brand: '',
    model: '',
    color: '',
    type: '',
    mileage_out: 0,
    lessee_name: '',
    civil_id: '',
    license_no: '',
    nationality: '',
    phone: '',
    month_rent: 0,
    months: 1,
    handover_area: '',
    accessories: {
      spare_tire: false,
      repair_kit: false,
      floor_mats: false,
      cig_lighter: false,
      wheel_caps: false,
      jack: false,
      wipers: false,
      ashtray: false,
      radio: false,
      mirror_in: false,
      mirror_out: false,
      extinguisher: false,
      headrests: false,
      orig_reg: false,
    },
    fuel_percent: 50,
    driver_side: '',
    passenger_side: '',
    notes: '',
    accident_fine: 0,
    liquidated_damages: '',
    lessee_sign_name: '',
    lessor_name: '',
    received_by_renter_only: false,
    terms_accepted: false,
  });

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('accessories.')) {
      const accessoryKey = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        accessories: {
          ...prev.accessories,
          [accessoryKey]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle-handover-form.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFormData({
      contract_date: '',
      contract_time: '',
      weekday: '',
      plate_number: '',
      brand: '',
      model: '',
      color: '',
      type: '',
      mileage_out: 0,
      lessee_name: '',
      civil_id: '',
      license_no: '',
      nationality: '',
      phone: '',
      month_rent: 0,
      months: 1,
      handover_area: '',
      accessories: {
        spare_tire: false,
        repair_kit: false,
        floor_mats: false,
        cig_lighter: false,
        wheel_caps: false,
        jack: false,
        wipers: false,
        ashtray: false,
        radio: false,
        mirror_in: false,
        mirror_out: false,
        extinguisher: false,
        headrests: false,
        orig_reg: false,
      },
      fuel_percent: 50,
      driver_side: '',
      passenger_side: '',
      notes: '',
      accident_fine: 0,
      liquidated_damages: '',
      lessee_sign_name: '',
      lessor_name: '',
      received_by_renter_only: false,
      terms_accepted: false,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 print:p-0">
      {/* Header */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            شركة البشائر الخليجية لتأجير السيارات
          </CardTitle>
          <p className="text-lg font-semibold">نموذج تسليم/معاينة سيارة</p>
          <p className="text-sm text-muted-foreground">
            Car Inspection & Delivery Form
          </p>
        </CardHeader>
      </Card>

      {/* بيانات العقد */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات العقد / Contract Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>تاريخ العقد</Label>
              <Input
                type="date"
                value={formData.contract_date}
                onChange={(e) => handleInputChange('contract_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>وقت العقد</Label>
              <Input
                type="time"
                value={formData.contract_time}
                onChange={(e) => handleInputChange('contract_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>اليوم</Label>
              <Select value={formData.weekday} onValueChange={(value) => handleInputChange('weekday', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر اليوم" />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* بيانات السيارة */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات السيارة / Car Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>رقم اللوحة (Plate No.)</Label>
              <Input
                value={formData.plate_number}
                onChange={(e) => handleInputChange('plate_number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الماركة (Brand)</Label>
              <Input
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الموديل (Model)</Label>
              <Input
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>اللون (Color)</Label>
              <Input
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>النوع/الشكل (Type)</Label>
              <Input
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                placeholder="مثال: جيب / Sedan"
              />
            </div>
            <div className="space-y-2">
              <Label>العداد عند التأجير (Car Mileage)</Label>
              <NumberInput
                value={formData.mileage_out.toString()}
                onChange={(value) => handleInputChange('mileage_out', parseInt(value) || 0)}
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* بيانات المستأجر */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات المستأجر / Lessee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>اسم المستأجر (Lessee Name)</Label>
              <Input
                value={formData.lessee_name}
                onChange={(e) => handleInputChange('lessee_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الرقم المدني (Civil ID No.)</Label>
              <Input
                value={formData.civil_id}
                onChange={(e) => handleInputChange('civil_id', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الرخصة (License No.)</Label>
              <Input
                value={formData.license_no}
                onChange={(e) => handleInputChange('license_no', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الجنسية (Nationality)</Label>
              <Input
                value={formData.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف (Phone)</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>إيجار الشهر (Month Rent)</Label>
              <NumberInput
                value={formData.month_rent.toString()}
                onChange={(value) => handleInputChange('month_rent', parseFloat(value) || 0)}
                step="0.001"
                placeholder="مثال: 210.000"
              />
            </div>
            <div className="space-y-2">
              <Label>عدد الأشهر (Months)</Label>
              <NumberInput
                value={formData.months.toString()}
                onChange={(value) => handleInputChange('months', parseInt(value) || 1)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>موقع التسليم</Label>
              <Input
                value={formData.handover_area}
                onChange={(e) => handleInputChange('handover_area', e.target.value)}
                placeholder="مثال: الري"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الملحقات */}
      <Card>
        <CardHeader>
          <CardTitle>ملحقات السيارة / Accessories Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {accessories.map((accessory) => (
              <div key={accessory.key} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={accessory.key}
                  checked={formData.accessories[accessory.key as keyof typeof formData.accessories]}
                  onCheckedChange={(checked) => 
                    handleInputChange(`accessories.${accessory.key}`, checked)
                  }
                />
                <Label htmlFor={accessory.key} className="text-sm">
                  {accessory.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* مؤشر الوقود */}
      <Card>
        <CardHeader>
          <CardTitle>مؤشر الوقود / Fuel Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Label className="min-w-0">E</Label>
              <Input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.fuel_percent}
                onChange={(e) => handleInputChange('fuel_percent', parseInt(e.target.value))}
                className="flex-1"
              />
              <Label className="min-w-0">F</Label>
              <span className="text-sm font-medium min-w-0">{formData.fuel_percent}%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              يلتزم المستأجر عند إعادة السيارة بأن يكون المؤشر كما استلمها، وإلا يتحمل تكاليف التعبئة.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* حالة السيارة */}
      <Card>
        <CardHeader>
          <CardTitle>حالة السيارة / Vehicle Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>جانب السائق (Driver Side)</Label>
              <Textarea
                value={formData.driver_side}
                onChange={(e) => handleInputChange('driver_side', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>جانب الراكب (Passenger Side)</Label>
              <Textarea
                value={formData.passenger_side}
                onChange={(e) => handleInputChange('passenger_side', e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label>ملاحظات إضافية / Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* إقرار وتعهد */}
      <Card>
        <CardHeader>
          <CardTitle>إقرار وتعهد / Declaration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <p>
              أقر أنا الموقع أدناه (المستأجر) بأنني استأجرت واستلمت السيارة المبين بياناتها أعلاه من (المؤجر) وهي بحالة سليمة،
              وأتعهد بالمحافظة عليها وإعادتها بالموعـد المتفق عليه وبنفس حالتها، وأتحمل تكاليف أي أضرار خلال فترة العقد وتجديداته،
              وألتزم بجميع بنود العقد.
            </p>
            <p className="text-muted-foreground">
              I, the undersigned (the Lessee), acknowledge receiving the above-mentioned vehicle in good condition and undertake to
              maintain and return it as agreed. I bear all costs of damages during the rental period and abide by the contract conditions.
            </p>
            <p>
              في حال وقوع حادث خلال فترة العقد وتجديداته، أتعهد بإحضار تقرير حادث، ولن يُغلق العقد قبل تقديم التقرير،
              وألتزم بدفع قيمة فتح الملف ونسبة التحمل حسب بوليصة التأمين الشامل سواء كان الحادث من طرفين أو طرف واحد أو ضد مجهول.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* الغرامات */}
      <Card>
        <CardHeader>
          <CardTitle>شروط مالية إضافية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>غرامة عن أي حادث (دينار)</Label>
              <NumberInput
                value={formData.accident_fine.toString()}
                onChange={(value) => handleInputChange('accident_fine', parseFloat(value) || 0)}
                step="0.001"
                placeholder="مثال: 400.000"
              />
            </div>
            <div className="space-y-2">
              <Label>مبلغ تعويضي اتفاقي</Label>
              <Input
                value={formData.liquidated_damages}
                onChange={(e) => handleInputChange('liquidated_damages', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التوقيعات */}
      <Card>
        <CardHeader>
          <CardTitle>التوقيعات / Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 border border-dashed rounded-lg">
              <h4 className="font-semibold">إسم وتوقيع المستأجر / Lessee Name & Signature</h4>
              <Input
                value={formData.lessee_sign_name}
                onChange={(e) => handleInputChange('lessee_sign_name', e.target.value)}
                placeholder="اسم المستأجر"
              />
              <div className="space-y-2">
                <Label className="text-sm">التوقيع:</Label>
                <div className="border border-dashed h-20 rounded-md"></div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="received_by_renter_only"
                  checked={formData.received_by_renter_only}
                  onCheckedChange={(checked) => handleInputChange('received_by_renter_only', checked)}
                />
                <Label htmlFor="received_by_renter_only" className="text-sm">
                  يتم استلام السيارة من المستأجر في مقر المؤجر فقط
                </Label>
              </div>
            </div>

            <div className="space-y-4 p-4 border border-dashed rounded-lg">
              <h4 className="font-semibold">المؤجر / Lessor</h4>
              <Input
                value={formData.lessor_name}
                onChange={(e) => handleInputChange('lessor_name', e.target.value)}
                placeholder="اسم الموظف المستلم"
              />
              <div className="space-y-2">
                <Label className="text-sm">التوقيع:</Label>
                <div className="border border-dashed h-20 rounded-md"></div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="terms_accepted"
                  checked={formData.terms_accepted}
                  onCheckedChange={(checked) => handleInputChange('terms_accepted', checked)}
                  required
                />
                <Label htmlFor="terms_accepted" className="text-sm">
                  أوافق على الشروط المذكورة أعلاه
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الأزرار */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button onClick={handlePrint} variant="default">
          <Printer className="w-4 h-4 ml-2" />
          طباعة / Print
        </Button>
        <Button onClick={handleSave} variant="outline">
          <Save className="w-4 h-4 ml-2" />
          حفظ البيانات (JSON)
        </Button>
        <Button onClick={handleReset} variant="destructive">
          <FileText className="w-4 h-4 ml-2" />
          مسح الحقول
        </Button>
      </div>

      {/* Footer */}
      <Separator className="print:hidden" />
      <div className="flex justify-between items-center text-sm text-muted-foreground print:text-black">
        <span>نموذج داخلي – معاينة وتسليم سيارة</span>
        <span>Internal Form – Car Handover & Inspection</span>
      </div>
    </div>
  );
};