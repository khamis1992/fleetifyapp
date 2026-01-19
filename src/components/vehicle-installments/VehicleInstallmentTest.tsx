import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VehicleSelector } from './VehicleSelector';

/**
 * مكون اختبار لـ VehicleSelector
 * يُستخدم للتحقق من عمل المكون بشكل صحيح
 */
export const VehicleInstallmentTest = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [excludeIds, setExcludeIds] = useState<string[]>([]);

  // بيانات اختبار وهمية
  const mockVehicles = [
    {
      id: '1',
      plate_number: 'أ ب ج 123',
      make: 'تويوتا',
      model: 'كامري',
      year: 2023
    },
    {
      id: '2',
      plate_number: 'د هـ و 456',
      make: 'نيسان',
      model: 'التيما',
      year: 2022
    },
    {
      id: '3',
      plate_number: 'ز ح ط 789',
      make: 'هيونداي',
      model: 'إلنترا',
      year: 2024
    }
  ];

  const handleVehicleSelect = (vehicleId: string) => {
    console.log('تم اختيار المركبة:', vehicleId);
    setSelectedVehicleId(vehicleId);
  };

  const addToExcludeList = () => {
    if (selectedVehicleId && !excludeIds.includes(selectedVehicleId)) {
      setExcludeIds(prev => [...prev, selectedVehicleId]);
    }
  };

  const clearExcludeList = () => {
    setExcludeIds([]);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>اختبار مكون اختيار المركبة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* اختبار حالة عادية */}
        <div>
          <h3 className="text-lg font-semibold mb-2">حالة عادية</h3>
          <VehicleSelector
            vehicles={mockVehicles}
            selectedVehicleId={selectedVehicleId}
            onSelect={handleVehicleSelect}
            placeholder="اختر المركبة..."
          />
        </div>

        {/* اختبار مع استبعاد مركبات */}
        <div>
          <h3 className="text-lg font-semibold mb-2">مع استبعاد مركبات</h3>
          <VehicleSelector
            vehicles={mockVehicles}
            selectedVehicleId={selectedVehicleId}
            excludeVehicleIds={excludeIds}
            onSelect={handleVehicleSelect}
            placeholder="اختر مركبة غير مستبعدة..."
          />
          <div className="mt-2 space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={addToExcludeList}
              disabled={!selectedVehicleId}
            >
              استبعاد المركبة المختارة
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearExcludeList}
            >
              مسح الاستبعادات
            </Button>
          </div>
        </div>

        {/* اختبار حالة التحميل */}
        <div>
          <h3 className="text-lg font-semibold mb-2">حالة التحميل</h3>
          <VehicleSelector
            vehicles={[]}
            onSelect={() => {}}
            isLoading={true}
            placeholder="جاري التحميل..."
          />
        </div>

        {/* اختبار حالة الخطأ */}
        <div>
          <h3 className="text-lg font-semibold mb-2">حالة الخطأ</h3>
          <VehicleSelector
            vehicles={[]}
            onSelect={() => {}}
            error="خطأ في تحميل المركبات"
            placeholder="خطأ..."
          />
        </div>

        {/* اختبار حالة لا توجد مركبات */}
        <div>
          <h3 className="text-lg font-semibold mb-2">لا توجد مركبات</h3>
          <VehicleSelector
            vehicles={[]}
            onSelect={() => {}}
            placeholder="لا توجد مركبات..."
          />
        </div>

        {/* اختبار حالة معطلة */}
        <div>
          <h3 className="text-lg font-semibold mb-2">حالة معطلة</h3>
          <VehicleSelector
            vehicles={mockVehicles}
            onSelect={() => {}}
            disabled={true}
            placeholder="معطل..."
          />
        </div>

        {/* معلومات الحالة الحالية */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">الحالة الحالية</h3>
          <p><strong>المركبة المختارة:</strong> {selectedVehicleId || 'لا شيء'}</p>
          <p><strong>المركبات المستبعدة:</strong> {excludeIds.length > 0 ? excludeIds.join(', ') : 'لا شيء'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleInstallmentTest;
