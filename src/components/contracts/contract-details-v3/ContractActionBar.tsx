import { CheckCircle2, ChevronLeft, FileDown, MoreHorizontal, Printer, RefreshCw, Scale, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Contract } from '@/types/contracts';
import { canReactivateCancelledContract } from '@/services/contractReactivationService';
import { permanentlyDeletableContractStatusesV3, type ContractFinancialSnapshot } from './tokens';

export interface ContractActionBarProps {
  contract: Contract; snapshot: ContractFinancialSnapshot; violationsCount: number;
  daysRemaining: number | null; formatCurrency: (amount: number) => string;
  onEdit: () => void; onPrint: () => void; onExport: () => void; onRefresh: () => void;
  onRenew: () => void; onTerminate: () => void; onReactivate: () => void;
  onConvertToLegal: () => void; onRemoveLegal: () => void; onDeletePermanent: () => void;
  onCollect: () => void; onOpenViolations: () => void; onOpenDocuments: () => void;
  documentGenerationBlocker?: string | null;
}
export function ContractActionBar(props: ContractActionBarProps) {
  const { contract, snapshot, daysRemaining, violationsCount, onPrint, onExport, onRefresh,
    onRenew, onTerminate, onReactivate, onConvertToLegal, onRemoveLegal, onDeletePermanent,
    onCollect, onOpenDocuments, onOpenViolations, documentGenerationBlocker } = props;
  const status = String(contract.status || '').trim().toLowerCase();
  const isLegal = status === 'under_legal_procedure';
  const cancelled = canReactivateCancelledContract(status);
  const canCancel = ['active','suspended','expired','pending','draft'].includes(status);
  const canLegal = ['active','cancelled','canceled','closed','expired'].includes(status);
  const next = cancelled
    ? { title: 'العقد ملغي', note: 'السجل المالي والمستندات محفوظة. يمكنك مراجعة شروط إعادة التفعيل.', label: 'إعادة تفعيل العقد', action: onReactivate }
    : isLegal
    ? { title: 'ملف تحت المتابعة القانونية', note: 'راجع المستندات أو أزل الإجراء القانوني بعد توثيق السبب.', label: 'إزالة الإجراء القانوني', action: onRemoveLegal }
    : { title: daysRemaining !== null && daysRemaining < 0 ? 'انتهت مدة العقد' : 'متابعة العقد',
        note: snapshot.dueNowTotal > 0 ? 'توجد مستحقات مفتوحة. راجع الفواتير والإيصالات قبل التسوية.' : 'اختر الخدمة المطلوبة لإدارة العقد.',
        label: snapshot.dueNowTotal > 0 ? 'الفواتير والتحصيل' : 'المستندات', action: snapshot.dueNowTotal > 0 ? onCollect : onOpenDocuments };
  return <section className="rounded-2xl border border-teal-100 bg-[#edf6f3] p-4 sm:p-5" aria-label="إجراءات العقد">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-teal-950">{next.title}</p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-teal-900/70">{next.note}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button onClick={next.action} className="h-11 gap-2 rounded-xl bg-teal-700 px-5 text-white hover:bg-teal-800">{next.label}<ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" onClick={onPrint} disabled={Boolean(documentGenerationBlocker)} title={documentGenerationBlocker || undefined} className="h-11 gap-2 rounded-xl border-teal-200 bg-white text-teal-900"><Printer className="h-4 w-4" />طباعة</Button>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild><Button variant="outline" className="h-11 gap-2 rounded-xl border-teal-200 bg-white text-teal-900"><MoreHorizontal className="h-4 w-4" />المزيد</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl bg-white p-2 text-slate-800">
            <DropdownMenuLabel>إدارة العقد</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onRefresh} className="gap-2 py-2.5"><RefreshCw className="h-4 w-4" />تحديث البيانات</DropdownMenuItem>
            <DropdownMenuItem onSelect={onExport} disabled={Boolean(documentGenerationBlocker)} className="gap-2 py-2.5"><FileDown className="h-4 w-4" />تصدير العقد الرسمي</DropdownMenuItem>
            {status === 'active' && <DropdownMenuItem onSelect={onRenew} className="gap-2 py-2.5"><RefreshCw className="h-4 w-4" />تجديد العقد</DropdownMenuItem>}
            {cancelled && <DropdownMenuItem onSelect={onReactivate} className="gap-2 py-2.5"><CheckCircle2 className="h-4 w-4" />إعادة تفعيل العقد</DropdownMenuItem>}
            {canLegal && <DropdownMenuItem onSelect={onConvertToLegal} className="gap-2 py-2.5"><Scale className="h-4 w-4" />تحويل للشؤون القانونية</DropdownMenuItem>}
            {canCancel && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={onTerminate} className="gap-2 py-2.5 text-rose-700"><XCircle className="h-4 w-4" />إلغاء العقد</DropdownMenuItem></>}
            {permanentlyDeletableContractStatusesV3.has(status) && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={onDeletePermanent} className="gap-2 py-2.5 text-rose-700"><Trash2 className="h-4 w-4" />حذف نهائي</DropdownMenuItem></>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    {violationsCount > 0 && <button type="button" onClick={onOpenViolations} className="mt-4 flex w-full items-center justify-between gap-3 border-t border-teal-200/60 pt-3 text-right text-sm text-amber-800"><span>{violationsCount} مخالفة غير مسددة تحتاج مراجعة قبل الإلغاء أو إعادة التفعيل</span><ChevronLeft className="h-4 w-4 shrink-0" /></button>}
  </section>;
}
