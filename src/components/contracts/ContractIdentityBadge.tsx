import { Badge } from '@/components/ui/badge';

export function ContractIdentityBadge({ type, status, reason }: { type: string; status?: string | null; reason?: string | null }) {
  if (!['signed_contract', 'signed_contract_image'].includes(type)) return null;
  return <Badge title={reason || undefined} variant="outline" className={`whitespace-normal text-[10px] ${status === 'matched' ? 'border-teal-200 bg-teal-50 text-teal-800' : status === 'mismatch' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
    {status === 'matched' ? reason?.startsWith('مطابقة يدوية معتمدة:') ? 'مطابق يدويًا' : 'هوية العميل مطابقة' : status === 'mismatch' ? 'تعارض في الهوية — يحتاج تحقق' : 'يحتاج مراجعة الهوية'}
  </Badge>;
}
