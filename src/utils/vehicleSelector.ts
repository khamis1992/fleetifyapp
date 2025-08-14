/**
 * أدوات مساعدة لمكون اختيار المركبة
 * تحتوي على دوال للتحقق من صحة البيانات والتشخيص
 */

import type { Vehicle } from '@/components/vehicle-installments/VehicleSelector';

/**
 * التحقق من صحة بيانات المركبة
 */
export const validateVehicle = (vehicle: any): vehicle is Vehicle => {
  if (!vehicle) {
    console.warn('مركبة فارغة أو null');
    return false;
  }

  if (!vehicle.id) {
    console.warn('مركبة بدون معرف:', vehicle);
    return false;
  }

  if (!vehicle.plate_number) {
    console.warn('مركبة بدون رقم لوحة:', vehicle);
    return false;
  }

  return true;
};

/**
 * تنظيف قائمة المركبات من البيانات غير الصحيحة
 */
export const sanitizeVehicleList = (vehicles: any[]): Vehicle[] => {
  if (!Array.isArray(vehicles)) {
    console.warn('قائمة المركبات ليست مصفوفة:', vehicles);
    return [];
  }

  return vehicles.filter(validateVehicle);
};

/**
 * البحث في المركبات
 */
export const searchVehicles = (vehicles: Vehicle[], searchTerm: string): Vehicle[] => {
  if (!searchTerm.trim()) {
    return vehicles;
  }

  const searchLower = searchTerm.toLowerCase().trim();
  
  return vehicles.filter(vehicle => {
    const fields = [
      vehicle.plate_number || '',
      vehicle.make || '',
      vehicle.model || '',
      vehicle.year?.toString() || ''
    ];

    return fields.some(field => 
      field.toLowerCase().includes(searchLower)
    );
  });
};

/**
 * فلترة المركبات المستبعدة
 */
export const filterExcludedVehicles = (vehicles: Vehicle[], excludeIds: string[]): Vehicle[] => {
  if (!excludeIds.length) {
    return vehicles;
  }

  return vehicles.filter(vehicle => !excludeIds.includes(vehicle.id));
};

/**
 * تنسيق عرض المركبة
 */
export const formatVehicleDisplay = (vehicle: Vehicle): string => {
  const parts = [
    vehicle.plate_number || 'غير محدد',
    '-',
    vehicle.make || '',
    vehicle.model || '',
    vehicle.year ? `(${vehicle.year})` : ''
  ].filter(Boolean);

  return parts.join(' ').trim();
};

/**
 * إنشاء معرف فريد للمركبة (للاستخدام كـ key في React)
 */
export const getVehicleKey = (vehicle: Vehicle, index?: number): string => {
  return vehicle.id || `vehicle-${index || 0}`;
};

/**
 * تشخيص مشاكل اختيار المركبة
 */
export const diagnoseVehicleSelection = (
  vehicles: any,
  selectedId?: string,
  excludeIds?: string[]
) => {
  const report = {
    vehiclesCount: 0,
    validVehicles: 0,
    invalidVehicles: 0,
    selectedVehicleFound: false,
    excludedCount: 0,
    availableCount: 0,
    issues: [] as string[]
  };

  // فحص قائمة المركبات
  if (!vehicles) {
    report.issues.push('قائمة المركبات فارغة (null/undefined)');
    return report;
  }

  if (!Array.isArray(vehicles)) {
    report.issues.push('قائمة المركبات ليست مصفوفة');
    return report;
  }

  report.vehiclesCount = vehicles.length;

  if (vehicles.length === 0) {
    report.issues.push('لا توجد مركبات في القائمة');
    return report;
  }

  // فحص صحة كل مركبة
  vehicles.forEach((vehicle, index) => {
    if (validateVehicle(vehicle)) {
      report.validVehicles++;
    } else {
      report.invalidVehicles++;
      report.issues.push(`مركبة غير صحيحة في المؤشر ${index}`);
    }
  });

  // فحص المركبة المختارة
  if (selectedId) {
    const selectedVehicle = vehicles.find((v: any) => v?.id === selectedId);
    report.selectedVehicleFound = !!selectedVehicle;
    
    if (!selectedVehicle) {
      report.issues.push(`المركبة المختارة (${selectedId}) غير موجودة في القائمة`);
    }
  }

  // فحص المركبات المستبعدة
  if (excludeIds?.length) {
    report.excludedCount = excludeIds.length;
    report.availableCount = report.validVehicles - report.excludedCount;
    
    if (report.availableCount <= 0) {
      report.issues.push('جميع المركبات مستبعدة - لا توجد خيارات متاحة');
    }
  } else {
    report.availableCount = report.validVehicles;
  }

  return report;
};

/**
 * طباعة تقرير التشخيص
 */
export const printDiagnosticReport = (
  vehicles: any,
  selectedId?: string,
  excludeIds?: string[]
) => {
  const report = diagnoseVehicleSelection(vehicles, selectedId, excludeIds);
  
  console.group('🚗 تشخيص اختيار المركبة');
  console.log('📊 الإحصائيات:', {
    'إجمالي المركبات': report.vehiclesCount,
    'مركبات صحيحة': report.validVehicles,
    'مركبات غير صحيحة': report.invalidVehicles,
    'مركبات مستبعدة': report.excludedCount,
    'مركبات متاحة': report.availableCount
  });
  
  if (selectedId) {
    console.log('🎯 المركبة المختارة:', {
      'المعرف': selectedId,
      'موجودة': report.selectedVehicleFound ? '✅' : '❌'
    });
  }
  
  if (report.issues.length > 0) {
    console.warn('⚠️ المشاكل المكتشفة:');
    report.issues.forEach(issue => console.warn(`  - ${issue}`));
  } else {
    console.log('✅ لا توجد مشاكل');
  }
  
  console.groupEnd();
  
  return report;
};
