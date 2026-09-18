import { ContractSectionHeading } from './contract-details-v3/ContractSection';
import { AlertTriangle, ArrowUpLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

export type RecordedPenalty = Pick<Database['public']['Tables']['penalties']['Row'],
  'id' | 'penalty_number' | 'penalty_date' | 'violation_type' | 'amount' | 'payment_status' | 'status' | 'responsibility_party'>;

export const isRecordedPenaltyOpen = (penalty: RecordedPenalty) =>
  !['paid', 'completed'].includes(String(penalty.payment_status).toLowerCase())
  && !['handled', 'resolved', 'waived', 'transferred', 'cancelled', 'canceled'].includes(String(penalty.status).toLowerCase());

export function ContractRecordedPenalties({ penalties, formatCurrency }: {
  penalties: RecordedPenalty[];
  formatCurrency: (amount: number) => string;
}) {
  const navigate = useNavigate();
  if (!penalties.length) return null;
  const open = penalties.filter(isRecordedPenaltyOpen);
  return (
    <section aria-label="المخالفات المسجلة على العقد">
      <ContractSectionHeading number="04" title="المخالفات والمسؤوليات" description="راجع المبالغ والمسؤولية عن كل مخالفة قبل إلغاء العقد أو إعادة تفعيله." />
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-100 bg-amber-50/60 p-5">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><AlertTriangle className="h-5 w-5 text-amber-700" />المخالفات المسجلة على العقد</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{open.length} مخالفة غير مسددة · {formatCurrency(open.reduce((sum, p) => sum + Number(p.amount || 0), 0))}</p>
          <p className="mt-1 text-xs text-slate-500">تُحتسب هذه السجلات عند إلغاء العقد أو إعادة تفعيله. لا يسقط إلغاء فاتورتها مسؤولية المخالفة.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/fleet/traffic-violations')} className="gap-2">إدارة المخالفات<ArrowUpLeft className="h-4 w-4" /></Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['رقم المخالفة', 'التاريخ', 'النوع', 'المبلغ', 'المسؤولية', 'السداد'].map(label => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{penalties.map(p => (
            <tr key={p.id}>
              <td className="px-5 py-4 font-mono">{p.penalty_number}</td><td className="px-5 py-4">{p.penalty_date}</td>
              <td className="px-5 py-4">{p.violation_type || 'مخالفة مرورية'}</td><td className="px-5 py-4 font-semibold">{formatCurrency(Number(p.amount || 0))}</td>
              <td className="px-5 py-4">{p.responsibility_party === 'company' ? 'الشركة' : p.responsibility_party === 'customer' ? 'العميل' : 'تحتاج مراجعة'}</td>
              <td className="px-5 py-4">{isRecordedPenaltyOpen(p) ? 'غير مسددة' : ['paid','completed'].includes(p.payment_status || '') ? 'مسددة' : 'معالجة'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      </div>
    </section>
  );
}
