import * as React from 'react';
import { Brain, Copy, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRunAgentReview } from '@/hooks/useAgentReviews';

export function CollectionMessageButton({ customerId, contractId, phone }: {
  customerId?: string | null;
  contractId?: string | null;
  phone?: string | null;
}) {
  const runAgent = useRunAgentReview('collection_message');
  const [open, setOpen] = React.useState(false);
  const [result, setResult] = React.useState<{
    message: string;
    settlement: string;
    tone: string;
    bestTime: string;
  } | null>(null);

  const generate = async () => {
    const data = await runAgent.mutateAsync(
      contractId ? { contractId } : { customerId },
    );
    setResult({
      message: data.message || '',
      settlement: data.settlement || '',
      tone: data.tone || '',
      bestTime: data.bestTime || '',
    });
    setOpen(true);
  };

  const copyMessage = async () => {
    if (!result?.message) return;
    await navigator.clipboard.writeText(result.message);
    toast.success('تم نسخ الرسالة');
  };

  const openWhatsApp = () => {
    if (!result?.message) return;
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) {
      toast.error('لا يوجد رقم واتساب صالح لهذا العميل');
      return;
    }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(result.message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={generate}
        disabled={runAgent.isPending || (!customerId && !contractId)}
        className="gap-2 rounded-xl border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] hover:bg-[#E0E7FF]"
      >
        {runAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        رسالة مخصصة بالوكيل
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#3730A3]" />
              رسالة تحصيل مخصصة
            </DialogTitle>
            <DialogDescription className="text-right">
              صيغت حسب سجل سداد العميل الفعلي — راجعها قبل الإرسال.
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-3 py-2">
              <div className="flex flex-wrap gap-2">
                {result.tone && <Badge variant="outline">النبرة: {result.tone}</Badge>}
                {result.bestTime && <Badge variant="outline">أفضل وقت: {result.bestTime}</Badge>}
              </div>
              <p className="whitespace-pre-wrap rounded-lg bg-[#F6F8FB] p-4 text-sm leading-7 text-[#1E293B]">
                {result.message}
              </p>
              {result.settlement && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                  <span className="font-bold">اقتراح التسوية: </span>{result.settlement}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyMessage} className="gap-2">
              <Copy className="h-4 w-4" />
              نسخ
            </Button>
            <Button onClick={openWhatsApp} className="gap-2 bg-[#22C7A1] text-white hover:bg-[#1BAA8A]">
              <Send className="h-4 w-4" />
              فتح واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
