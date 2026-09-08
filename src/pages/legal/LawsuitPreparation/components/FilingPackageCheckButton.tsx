import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLawsuitPreparationContext } from '../store';
import { buildTaqadiFilingPayload, type TaqadiFilingPayload } from '../utils/taqadiAutomation';
import { getFilingReadiness } from '../utils/filingReadiness';
import { taqadiErrorMessage } from '../utils/taqadiErrorMessage';

type ValidatePackageRpc = (
  name: 'validate_taqadi_filing_payload_v1',
  args: { p_company_id: string; p_contract_id: string; p_payload: TaqadiFilingPayload },
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** Runs the same read-only validator used by enqueue/retry, without starting a job. */
export function FilingPackageCheckButton() {
  const { state } = useLawsuitPreparationContext();
  const [checking, setChecking] = useState(false);

  const checkPackage = async () => {
    setChecking(true);
    try {
      if (!state.companyId) throw new Error('تعذر تحديد الشركة');
      if (!state.contractId) throw new Error('تعذر تحديد العقد');
      const readiness = getFilingReadiness(state);
      if (!readiness.canStartFiling) throw new Error(readiness.missingReasons.join('، '));
      const payload = buildTaqadiFilingPayload(state, window.location.href);
      const { data, error } = await (supabase.rpc as unknown as ValidatePackageRpc)(
        'validate_taqadi_filing_payload_v1',
        { p_company_id: state.companyId, p_contract_id: state.contractId, p_payload: payload },
      );
      if (error) throw error;
      if (!data || typeof data !== 'object' || !('ready' in data) || typeof data.ready !== 'boolean') {
        throw new Error('تعذر تأكيد نتيجة فحص الحافظة؛ أعد المحاولة.');
      }
      if (!data.ready) {
        const missing = 'missing' in data && Array.isArray(data.missing) ? data.missing : [];
        throw new Error(missing.length
          ? `Filing package is incomplete: ${JSON.stringify(missing)}`
          : 'الحافظة غير جاهزة؛ راجع البيانات والمستندات ثم أعد الفحص.');
      }
      toast.success('اجتازت الحافظة فحص الخادم. لم تبدأ إجراءات الرفع.');
    } catch (error) {
      toast.error(taqadiErrorMessage(error) || 'تعذر فحص الحافظة');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Button type="button" variant="outline" disabled={checking || state.ui.isGeneratingAll || state.ui.isLoading} onClick={checkPackage}>
      {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
      {checking ? 'جارٍ فحص الحافظة...' : 'فحص جاهزية الحافظة'}
    </Button>
  );
}
