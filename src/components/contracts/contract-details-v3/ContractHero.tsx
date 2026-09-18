import { CalendarDays, Car, ChevronLeft, FilePenLine, UserRound, UserCheck } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatAssignedEmployeeNameV3, getContractStatusMetaV3, type ContractFinancialSnapshot } from './tokens';
import type { Contract } from '@/types/contracts';

export interface ContractHeroProps {
  contract: Contract; customerName: string; vehicleName: string; plateNumber?: string;
  totalAmount: number; monthlyAmount: number; paidAmount: number;
  paidPayments: number; totalPayments: number; daysRemaining: number | null;
  progressPercentage: number; snapshot: ContractFinancialSnapshot;
  formatCurrency: (amount: number) => string;
  onBack: () => void; onEdit: () => void; onStatusClick: () => void;
  onCustomerClick: () => void; onVehicleClick: () => void;
}
const dateLabel = (value?: string | null) => {
  const date = value ? parseISO(value) : null;
  return date && isValid(date) ? format(date, 'd MMMM yyyy', { locale: ar }) : 'غير محدد';
};

export function ContractHero({ contract, customerName, vehicleName, plateNumber, totalAmount,
  monthlyAmount, paidAmount, paidPayments, totalPayments, daysRemaining, snapshot,
  formatCurrency, onBack, onEdit, onStatusClick, onCustomerClick, onVehicleClick }: ContractHeroProps) {
  const status = getContractStatusMetaV3(contract.status);
  const collected = totalAmount > 0 ? Math.max(0, Math.min(snapshot.remainingTotal > 0 ? 99 : 100, Math.floor(paidAmount / totalAmount * 100))) : 0;
  const metrics = [
    { label: 'قيمة العقد', value: totalAmount, note: formatCurrency(monthlyAmount) + ' شهريًا', color: 'text-slate-900' },
    { label: 'المحصل', value: paidAmount, note: <><span>{collected}%</span> من قيمة العقد</>, color: 'text-teal-700' },
    { label: ['cancelled', 'canceled'].includes(contract.status) ? 'الفواتير المفتوحة' : 'المتبقي على العقد', value: ['cancelled', 'canceled'].includes(contract.status) ? snapshot.outstandingTotal : snapshot.remainingTotal, note: ['cancelled', 'canceled'].includes(contract.status) ? 'بعد استبعاد الفواتير الملغاة' : snapshot.openInvoicesCount + ' فاتورة مفتوحة', color: 'text-slate-900' },
    { label: 'المستحق الآن', value: snapshot.dueNowTotal, note: 'بحسب الفواتير والاستحقاقات', color: snapshot.dueNowTotal > 0 ? 'text-amber-700' : 'text-teal-700' },
  ];
  return (
    <header className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm" aria-label="ملخص العقد">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:px-7">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 px-0 text-slate-500"><ChevronLeft className="h-4 w-4 rotate-180" />جميع العقود</Button>
        <span className="text-xs font-medium text-slate-400">إدارة العقود / ملف العقد</span>
      </div>
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-teal-700">{contract.contract_type === 'rent_to_own' ? 'تأجير منتهٍ بالتملك' : 'عقد تأجير مركبة'}</span>
            <button type="button" onClick={onStatusClick} className={cn('rounded-full border px-3 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700', status.chip)} aria-label={'تغيير حالة العقد: ' + status.label}>{status.label}</button>
          </div>
          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"><bdi>{contract.contract_number}</bdi></h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{dateLabel(contract.start_date)} — {dateLabel(contract.end_date)}</span>
            <span className={cn('text-xs font-semibold', daysRemaining !== null && daysRemaining < 0 ? 'text-amber-700' : 'text-teal-700')}>
              {daysRemaining === null ? 'المدة غير محددة' : daysRemaining < 0 ? 'انتهت المدة منذ ' + Math.abs(daysRemaining) + ' يوم' : 'متبقي ' + daysRemaining + ' يوم'}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={onEdit} className="h-10 gap-2 self-start rounded-xl border-slate-200 bg-white text-slate-700"><FilePenLine className="h-4 w-4" />تعديل بيانات العقد</Button>
      </div>
      <div className="grid grid-cols-2 border-y border-slate-100 bg-[#fafcfb] xl:grid-cols-4">
        {metrics.map(metric => <div key={metric.label} className="min-w-0 border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5 xl:border-b-0">
          <p className="text-xs font-medium text-slate-500">{metric.label}</p>
          <p className={cn('mt-2 break-words text-base font-bold tabular-nums sm:text-2xl', metric.color)}><bdi>{formatCurrency(metric.value)}</bdi></p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{metric.note}</p>
        </div>)}
      </div>
      <div className="grid gap-3 p-5 sm:p-7 lg:grid-cols-3">
        <button type="button" onClick={onCustomerClick} className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-4 text-right transition hover:border-teal-400 hover:bg-teal-50/40">
          <UserRound className="mt-1 h-5 w-5 shrink-0 text-teal-700" /><div className="min-w-0"><p className="text-xs text-slate-500">العميل</p><p className="mt-1 font-semibold leading-6 text-slate-800">{customerName}</p><p className="mt-1 text-xs text-slate-500"><bdi>{contract.customer?.phone || 'لا يوجد رقم اتصال'}</bdi></p>
            {contract.customer?.customer_type === 'individual' && <p className="mt-1 text-xs text-slate-600">الجنسية: {contract.customer.nationality || 'غير مسجلة'}</p>}
          </div><ChevronLeft className="ms-auto mt-1 h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <button type="button" onClick={onVehicleClick} className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-4 text-right transition hover:border-teal-400 hover:bg-teal-50/40">
          <Car className="mt-1 h-5 w-5 shrink-0 text-teal-700" /><div className="min-w-0"><p className="text-xs text-slate-500">المركبة</p><p className="mt-1 font-semibold leading-6 text-slate-800">{vehicleName}</p><p className="mt-1 text-xs text-slate-500">اللوحة <bdi className="font-mono font-semibold">{plateNumber || 'غير محددة'}</bdi></p></div><ChevronLeft className="ms-auto mt-1 h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-4"><UserCheck className="mt-1 h-5 w-5 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-500">مسؤول المتابعة</p><p className="mt-1 font-semibold leading-6 text-slate-800">{formatAssignedEmployeeNameV3(contract.assigned_employee)}</p><p className="mt-1 text-xs text-slate-500">{snapshot.financialReviewRequired ? 'الأقساط بانتظار المطابقة' : paidPayments + ' من ' + totalPayments + ' قسط مسدد'}</p></div></div>
      </div>
    </header>
  );
}
