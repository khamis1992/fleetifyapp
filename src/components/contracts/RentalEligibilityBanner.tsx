import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRentalEligibility } from '@/hooks/useRentalEligibility';
import { cn } from '@/lib/utils';

export function RentalEligibilityBanner({ companyId, vehicleId, customerId, className }: {
  companyId?: string | null; vehicleId?: string | null; customerId?: string | null; className?: string;
}) {
  const { data, isLoading, error } = useRentalEligibility(companyId, vehicleId, customerId);
  if (!vehicleId) return null;
  if (isLoading) return <div dir="rtl" className={cn('flex items-center gap-2 rounded-lg border p-3 text-sm', className)}>
    <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحقق من حالة المركبة والمخالفات...
  </div>;
  const message = error instanceof Error ? error.message : data?.message;
  if (!message || data?.level === 'allow') return null;
  const blocked = data?.level === 'block' || Boolean(error);
  return <div dir="rtl" role="alert" className={cn('rounded-lg border p-3 text-sm', blocked ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900', className)}>
    <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div>
      <p>{message}</p>
      {data?.trafficViolationsPath && <Link className="mt-1 inline-block font-semibold underline" to={data.trafficViolationsPath}>عرض المخالفات المرورية</Link>}
    </div></div>
  </div>;
}

export function RentalEligibilityNotice({ className }: { className?: string }) {
  return <div dir="rtl" className={cn('rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700', className)}>
    المركبات المحجوزة في شارع 52 أو مركز الشرطة أو المسروقة غير متاحة للتأجير. حجز البلدية والمخالفات دون الحد يظهران كتنبيه قبل الإرسال.
    {' '}<Link className="font-semibold underline" to="/fleet/traffic-violations">عرض المخالفات المرورية</Link>
  </div>;
}
