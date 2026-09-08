import { useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TAQADI_PORTAL_URL } from './TaqadiJobActionsMenu';
import type { VerifiedRestartConfirmation } from '../utils/taqadiVerifiedRestart';

export type VerifiedRestartTarget = Pick<VerifiedRestartConfirmation, 'jobId' | 'expectedUpdatedAt' | 'requestId'>;

// Mount a fresh dialog per request; a network retry retains the same request ID.
export function TaqadiVerifiedRestartDialog({ target, contractNumber, stale, pending, blockReason, onClose, onConfirm }: {
  target: VerifiedRestartTarget;
  contractNumber?: string;
  stale: boolean;
  pending: boolean;
  blockReason?: string | null;
  onClose: () => void;
  onConfirm: (confirmation: VerifiedRestartConfirmation) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const disabled = pending || stale || Boolean(blockReason) || !confirmed || note.trim().length < 10;
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="text-start sm:text-start">
          <DialogTitle>إعادة من البداية بعد التحقق</DialogTitle>
          <DialogDescription className="leading-7">
            العقد <bdi>{contractNumber}</bdi> — جرت محاولة اعتماد سابقة ولم يتأكد الإيصال.
            راجع الطلب في تقاضي قبل بدء محاولة جديدة.
          </DialogDescription>
        </DialogHeader>
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="leading-7">
            إذا كان الطلب مودعًا أو له رقم مرجعي، استكمل «الإغلاق والتسجيل» بالإيصال الموجود.
            الإعادة ستبدأ خطوات الرفع والاعتماد من جديد بالحزمة الحالية، مع الاحتفاظ بسجل المحاولات السابقة.
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="justify-center">
          <a href={TAQADI_PORTAL_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />فتح تقاضي لمراجعة الطلب
          </a>
        </Button>
        <div className="flex items-start gap-3 rounded-xl border p-4">
          <Checkbox id="restart-verified-unsubmitted" checked={confirmed} disabled={pending || stale}
            onCheckedChange={(value) => setConfirmed(value === true)} className="mt-1" />
          <Label htmlFor="restart-verified-unsubmitted" className="cursor-pointer text-sm leading-7">
            راجعت هذا الطلب في تقاضي وتأكدت أنه لم يُودع ولا يوجد له رقم مرجعي
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="restart-verification-note">نتيجة المراجعة</Label>
          <Textarea id="restart-verification-note" value={note} maxLength={2000} rows={3}
            disabled={pending || stale} onChange={(event) => setNote(event.target.value)}
            placeholder="دوّن ما ظهر لك عند مراجعة الطلب في تقاضي" />
          <p className="text-xs text-slate-500">10 أحرف على الأقل. ستُحفظ المراجعة باسمك في سجل العملية.</p>
        </div>
        {(stale || blockReason) && <p role="alert" className="text-sm leading-7 text-red-700">
          {stale ? 'تغيرت حالة العملية. أغلق هذه النافذة وحدّث الحالة قبل إعادة المراجعة.' : blockReason}
        </p>}
        <DialogFooter className="gap-2 sm:justify-start">
          <Button disabled={disabled} onClick={() => {
            if (!disabled) onConfirm({ ...target, confirmedNotSubmitted: confirmed, verificationNote: note.trim() });
          }}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {pending ? 'جارٍ تجهيز الإعادة...' : 'تحديث الحزمة والبدء من البداية'}
          </Button>
          <Button variant="outline" disabled={pending} onClick={onClose}>رجوع</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
