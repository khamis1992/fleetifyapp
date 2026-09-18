import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const isSeizedActiveContract = (contractStatus?: string | null, vehicleStatus?: string | null) =>
  contractStatus === 'active' && ['street_52', 'police_station'].includes(vehicleStatus || '');

export function SeizedActiveContractBanner({ contractStatus, vehicleStatus, className }: {
  contractStatus?: string | null;
  vehicleStatus?: string | null;
  className?: string;
}) {
  if (!isSeizedActiveContract(contractStatus, vehicleStatus)) return null;
  const location = vehicleStatus === 'street_52' ? 'شارع 52' : 'مركز الشرطة';
  return <div dir="rtl" role="alert" className={cn('flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-900', className)}>
    <AlertTriangle className="h-4 w-4 shrink-0" />
    المركبة محجوزة ({location}) — العقد ما زال نشط
  </div>;
}
