import { Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useTrafficMailIngest } from '@/hooks/useTrafficMailIngest';
import { toast } from 'sonner';

export function TrafficMailSyncControl({ companyId, onSynced }: { companyId?: string | null; onSynced: () => void }) {
  const { status, sync } = useTrafficMailIngest(companyId);
  const state = status.data?.state;
  const configured = status.data?.configured;
  const lastSync = state?.last_sync_at
    ? format(new Date(state.last_sync_at), 'd MMM yyyy، h:mm a', { locale: ar })
    : 'لم تتم المزامنة بعد';

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync();
      onSynced();
      toast.success(result.initialized ? 'تم ربط البريد. ستُستورد الرسائل الجديدة فقط.' : `اكتملت المزامنة: ${result.inserted || 0} مخالفة جديدة`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذرت مزامنة بريد وزارة الداخلية');
    }
  };

  return (
    <div className="flex min-w-[270px] items-center gap-3 rounded-[8px] border border-[#DDE5EF] bg-[#F8FAFC] px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#EAF8FE] text-[#0EA5E9]">
        {configured ? <ShieldCheck className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-[#102B4E]">بريد مخالفات وزارة الداخلية</p>
        <p className="truncate text-[11px] font-bold text-[#64748B]">
          {status.isLoading ? 'جارٍ فحص الاتصال…' : configured ? `آخر مزامنة: ${lastSync}` : 'إعداد اتصال Outlook مطلوب'}
        </p>
        {state?.last_error && <p className="max-w-[220px] truncate text-[10px] font-bold text-[#FB6B7A]" title={state.last_error}>{state.last_error}</p>}
      </div>
      <Button
        size="sm"
        variant={configured ? 'outline' : 'default'}
        disabled={!companyId || status.isLoading || sync.isPending || !configured}
        onClick={handleSync}
        className="h-8 shrink-0 rounded-[8px] px-3 text-xs font-black"
        title={configured ? 'استيراد الرسائل الجديدة من Outlook' : 'أضف أسرار Microsoft Graph إلى Edge Function أولاً'}
      >
        <RefreshCw className={`ml-1 h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
        {configured ? 'مزامنة الآن' : 'ربط Outlook'}
      </Button>
    </div>
  );
}
