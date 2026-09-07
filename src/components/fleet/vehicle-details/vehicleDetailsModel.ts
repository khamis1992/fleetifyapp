import { isContractOccupyingVehicle, type VehicleOccupancyContract } from '@/utils/vehicleOperationalStatus';

/** Presentation only: database triggers remain the authority for stored status. */
export function vehicleRentalDecision(
  vehicle: { status?: string; is_active?: boolean },
  contracts: VehicleOccupancyContract[],
  maintenance: { status?: string | null }[],
  hasError = false,
) {
  const occupying = contracts.filter((contract) => isContractOccupyingVehicle(contract));
  const inWorkshop = maintenance.some((record) => record.status === 'in_progress');
  if (hasError) return { occupying, canRent: false, label: 'تعذر التحقق من التشغيل', reason: 'أعد تحميل البيانات للتحقق من العقود والصيانة قبل إنشاء عقد.' };
  if (vehicle.is_active === false) return { occupying, canRent: false, label: 'المركبة غير مفعّلة', reason: 'راجع بيانات المركبة قبل إضافتها إلى عقد جديد.' };
  if (occupying.length) return { occupying, canRent: false, label: 'مرتبطة بعقد حالي', reason: 'راجع العقد المرتبط وإجراء إرجاع المركبة قبل التأجير من جديد.' };
  if (inWorkshop) return { occupying, canRent: false, label: 'صيانة قيد التنفيذ', reason: 'تابع إغلاق أمر الصيانة وتحديث الحالة التشغيلية.' };
  if (vehicle.status !== 'available') return { occupying, canRent: false, label: 'غير متاحة للتأجير حالياً', reason: 'راجع الحالة التشغيلية للمركبة؛ تسجيل عقد جديد يخضع لفحص الأهلية.' };
  return { occupying, canRent: true, label: 'متاحة لإنشاء عقد', reason: 'لا يوجد عقد يشغل المركبة حالياً. يتم التحقق من الفترة والأهلية عند إنشاء العقد.' };
}

export const vehicleDetailTabs = [
  { value: 'overview', label: 'نظرة عامة', description: 'هوية المركبة ومواصفاتها الأساسية وأسعار الإيجار المسجلة.' },
  { value: 'contracts', label: 'العقود', description: 'سجل العقود والعملاء، مع تمييز العقود التي تشغل المركبة حالياً.' },
  { value: 'maintenance', label: 'الصيانة', description: 'طلبات الصيانة وتكاليفها وحالة التنفيذ.' },
  { value: 'violations', label: 'المخالفات', description: 'المخالفات المسجلة والملفات المرورية وحالة السداد.' },
  { value: 'insurance', label: 'التأمين والاستمارة', description: 'إدارة التغطية التأمينية ووثائق التسجيل ومواعيد التجديد.' },
  { value: 'documents', label: 'الوثائق', description: 'مكتبة ملفات المركبة: رفع المستندات ومعاينتها وتنزيلها.' },
  { value: 'pricing', label: 'التسعير', description: 'تعرفات الإيجار وفترات سريان الأسعار.' },
  { value: 'technical', label: 'المواصفات', description: 'المعلومات الفنية والتواريخ المهمة وموقع المركبة.' },
  { value: 'financial', label: 'الأصل والتكاليف', description: 'قيم الشراء والإهلاك والبيانات المالية المسجلة للمركبة.' },
] as const;

export function resolveVehicleTab(value: string | null) {
  return vehicleDetailTabs.find((tab) => tab.value === value) || vehicleDetailTabs[0];
}

/** Retrieve complete history, including when the API applies its row limit. */
export async function fetchVehicleHistory<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}
