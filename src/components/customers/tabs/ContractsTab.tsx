import { FileText, Plus } from 'lucide-react';
import { Link, type NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getContractChipV3 } from '../customer-details-v3/tokens';
import { format, isValid } from 'date-fns';

const displayDate = (value?: string) => value && isValid(new Date(value)) ? format(new Date(value), 'dd/MM/yyyy') : '—';
export default function ContractsTab({ contracts, navigate, customerId }: { contracts: any[]; navigate: NavigateFunction; customerId: string }) {
  return <div className="cw-contract-list">
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2"><p className="text-xs text-slate-500">{contracts.length} عقد في العرض الحالي</p><Button className="cw-primary gap-2" onClick={() => navigate('/contracts?customer=' + customerId)}><Plus size={15}/>إنشاء عقد</Button></div>
    {contracts.length ? contracts.map(contract => {
      const status = getContractChipV3(contract.status);
      return <Link className="cw-contract" key={contract.id} to={'/contracts/' + (contract.contract_number || contract.id)}>
        <div className="cw-contract-top"><div><h3>{[contract.vehicle?.make, contract.vehicle?.model].filter(Boolean).join(' ') || 'مركبة غير محددة'}</h3><p>عقد <bdi>#{contract.contract_number || contract.id}</bdi> · <bdi>{contract.vehicle?.plate_number || 'لوحة غير مسجلة'}</bdi></p></div><span className={'rounded-md border px-3 py-1 text-xs ' + status.chip}>{status.label}</span></div>
        <dl className="cw-contract-facts"><div><dt>الإيجار الشهري</dt><dd>{Number(contract.monthly_amount || 0).toLocaleString()} ر.ق</dd></div><div><dt>بداية العقد</dt><dd><bdi>{displayDate(contract.start_date)}</bdi></dd></div><div><dt>نهاية العقد</dt><dd><bdi>{displayDate(contract.end_date)}</bdi></dd></div></dl>
      </Link>;
    }) : <div className="cw-empty"><FileText size={36}/><h3>لا توجد عقود في هذا العرض</h3><p>يمكنك إنشاء عقد جديد للعميل، أو تغيير البحث إذا كنت تبحث عن عقد محدد.</p></div>}
  </div>;
}
