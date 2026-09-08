import { useState, type FormEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useCustomerOperations } from '@/hooks/business/useCustomerOperations';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { hasArabicText } from '@/utils/formatCustomerName';
import { hasKnownTaqadiNationality } from '@/utils/taqadiNationality';

interface Props {
  customerId: string;
  customerName: string;
  nationality: string | null;
  onClose: () => void;
}

export function NationalityCompletionDialog({ customerId, customerName, nationality, onClose }: Props) {
  const [value, setValue] = useState(hasKnownTaqadiNationality(nationality) ? nationality || '' : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { companyId } = useUnifiedCompanyAccess();
  const { updateCustomer } = useCustomerOperations({ enableDuplicateCheck: false, autoCreateAccounts: false, sendWelcomeEmail: false });
  const valid = hasKnownTaqadiNationality(value) && hasArabicText(value);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!companyId || !valid) {
      setError(!companyId ? 'تعذر تحديد الشركة. أعد تحميل الصفحة.' : 'أدخل الجنسية الصحيحة باللغة العربية كما وردت في المستند.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      // Reuse the audited, company-scoped customer operation. Never submit the
      // partial customer projection from the lawsuit page as a complete record.
      await updateCustomer.mutateAsync({ id: customerId, nationality: value.trim() });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الجنسية. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent dir="rtl" className="sm:max-w-md" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader className="text-right">
          <DialogTitle>استكمال جنسية العميل</DialogTitle>
          <DialogDescription>العميل: {customerName}. أدخل الجنسية وفق الهوية أو العقد الموقّع؛ بلد الإقامة لا يحدد الجنسية.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="lawsuit-customer-nationality">الجنسية الصحيحة</Label>
            <Input id="lawsuit-customer-nationality" autoFocus value={value} disabled={saving} onChange={(event) => { setValue(event.target.value); setError(''); }} placeholder="الجنسية باللغة العربية" maxLength={100} aria-invalid={Boolean(error)} aria-describedby={error ? 'lawsuit-nationality-error' : 'lawsuit-nationality-help'} />
            <p id="lawsuit-nationality-help" className="text-xs leading-6 text-slate-600">تُحفظ الجنسية في سجل العميل، وتُحدّث صفحات العميل وعقوده وتجهيز الدعوى تلقائيًا.</p>
            {error && <div className="space-y-2"><p id="lawsuit-nationality-error" role="alert" className="text-sm text-red-700">{error}</p><a href={`/customers/${customerId}`} className="text-sm font-semibold text-[#173A63] underline">فتح ملف العميل لاستكمال بقية البيانات</a></div>}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={saving || !valid || !companyId} className="gap-2 bg-[#173A63] text-white hover:bg-[#102C4D]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ والتحديث...' : 'حفظ الجنسية وتحديث الجاهزية'}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>إلغاء</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
