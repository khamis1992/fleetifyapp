import { Badge } from '@/components/ui/badge';

export function ContractIdentityBadge({ type, status, reason }: { type: string; status?: string | null; reason?: string | null }) {
  if (!['signed_contract', 'signed_contract_image'].includes(type)) return null;
  return <Badge title={reason || undefined} variant={status === 'matched' ? 'secondary' : 'destructive'} className="whitespace-normal text-[10px]">
    {status === 'matched' ? 'هوية العميل مطابقة' : status === 'mismatch' ? 'غير مطابق — غير معتمد' : 'بانتظار مراجعة الهوية — غير معتمد'}
  </Badge>;
}
