import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContractCancellationImpact } from '@/hooks/useContractRenewal';
import { ContractCancellationImpactPanel } from './ContractCancellationImpactPanel';
import type { VehicleHandoffConsent } from '@/services/contractVehicleHandoff';

export interface HandoffReview { scope: string; ready: boolean; consent?: VehicleHandoffConsent }

export function VehicleContractHandoffPanel({ companyId, vehicleId, startDate, endDate, scope, onReview, disabled }: {
  companyId: string; vehicleId: string; startDate?: string; endDate?: string; scope: string;
  onReview: (review: HandoffReview) => void; disabled?: boolean;
}) {
  const [approval, setApproval] = useState('');
  const [reason, setReason] = useState('');
  const conflicts = useQuery({
    queryKey: ['vehicle-contract-handoff', companyId, vehicleId, startDate, endDate],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts')
        .select('id, contract_number, status, start_date, end_date, updated_at, legal_status, vehicle_returned')
        .eq('company_id', companyId).eq('vehicle_id', vehicleId)
        .in('status', ['active', 'pending', 'confirmed', 'suspended', 'under_legal_procedure']);
      if (error) throw error;
      return (data || []).filter(contract =>
        !(contract.status === 'under_legal_procedure' && contract.vehicle_returned)
        && (!startDate || !contract.end_date || contract.end_date >= startDate)
        && (!endDate || !contract.start_date || contract.start_date <= endDate));
    },
  });
  const previous = conflicts.data?.length === 1 ? conflicts.data[0] : undefined;
  const eligible = !!previous && previous.status !== 'under_legal_procedure' && !previous.legal_status;
  const impact = useContractCancellationImpact({ companyId, contractId: previous?.id, enabled: eligible });
  const fingerprint = `${scope}:${previous?.id}:${previous?.updated_at}`;
  const checked = approval === fingerprint;
  const ready = !conflicts.isFetching && !conflicts.isError && !!conflicts.data
    && (conflicts.data.length === 0 || (eligible && checked && reason.trim().length >= 5
      && !!previous.updated_at && !impact.isFetching && !impact.isError && impact.data?.contractId === previous.id));
  useEffect(() => {
    onReview({ scope, ready, consent: ready && previous && checked ? {
      contractId: previous.id, updatedAt: previous.updated_at!, reason: reason.trim(),
    } : undefined });
  }, [scope, ready, previous?.id, previous?.updated_at, checked, reason, onReview]);

  if (conflicts.isPending || conflicts.isFetching) return <p role="status" className="mb-4 text-sm">جارٍ فحص العقود المرتبطة بالمركبة…</p>;
  if (conflicts.isError) return <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
    تعذر فحص ارتباط المركبة. يجب إكمال الفحص قبل إنشاء العقد.
    <button type="button" className="ms-2 underline" onClick={() => void conflicts.refetch()}>إعادة الفحص</button>
  </div>;
  if (!conflicts.data?.length) return <p role="status" className="mb-4 text-sm text-emerald-700">لا توجد عقود متداخلة مع المدة المختارة.</p>;
  return <section aria-label="مراجعة نقل المركبة" className="mb-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <h3 className="font-bold">المركبة مرتبطة بعقد خلال المدة المختارة</h3>
    {conflicts.data.map(contract => <p key={contract.id}>
      <a className="font-semibold underline" href={`/contracts/${contract.id}`} target="_blank" rel="noopener noreferrer">{contract.contract_number}</a>
      <span className="ms-2" dir="ltr">{contract.start_date} — {contract.end_date}</span>
    </p>)}
    {!eligible ? <p>يلزم مراجعة العقود المتداخلة أو الملف القانوني قبل نقل المركبة. يمكنك اختيار مركبة أخرى.</p> : <>
      <p>يمكن إلغاء العقد السابق وإنشاء الجديد بتأكيد واحد عند حفظ النموذج. إذا فشل الإنشاء، يبقى العقد السابق دون تغيير. تبقى المستحقات والمخالفات على العميل السابق، ولا تُسجّل معاينة استلام للمركبة تلقائيًا.</p>
      <ContractCancellationImpactPanel impact={impact.data} isLoading={impact.isPending || impact.isFetching} error={impact.error} />
      {impact.isError && <button type="button" className="underline" onClick={() => void impact.refetch()}>إعادة فحص المخالفات</button>}
      <label className="block">سبب إلغاء العقد السابق
        <textarea className="mt-1 block w-full rounded-lg border border-amber-300 bg-white p-2" value={reason} disabled={disabled}
          onChange={event => { setReason(event.target.value); setApproval(''); }} placeholder="اكتب السبب (5 أحرف على الأقل)" />
      </label>
      <label className="flex items-start gap-2 font-semibold">
        <input type="checkbox" checked={checked} disabled={disabled || reason.trim().length < 5}
          onChange={event => setApproval(event.target.checked ? fingerprint : '')} />
        أوافق على إلغاء العقد السابق ونقل المركبة عند إنشاء العقد الجديد
      </label>
    </>}
  </section>;
}
