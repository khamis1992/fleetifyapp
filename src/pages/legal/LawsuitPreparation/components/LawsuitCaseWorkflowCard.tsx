import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Gavel, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LegalCaseWorkflowPanel } from '@/components/legal/LegalCaseWorkflowPanel';
import { getCurrentLegalCase } from '../utils/taqadiFiling';
import { useLawsuitPreparationContext } from '../store';

export function LawsuitCaseWorkflowCard() {
  const { state, actions } = useLawsuitPreparationContext();
  const { companyId, contractId } = state;
  const legalCaseQuery = useQuery({
    queryKey: ['lawsuit-legal-case', companyId, contractId],
    enabled: Boolean(companyId && contractId),
    queryFn: () => {
      if (!companyId || !contractId) {
        throw new Error('تعذر تحديد الشركة أو العقد');
      }
      return getCurrentLegalCase(companyId, contractId);
    },
    staleTime: 5_000,
  });

  if (legalCaseQuery.isLoading) {
    return (
      <section className="lawsuit-section-panel flex min-h-36 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#173A63]" />
      </section>
    );
  }

  const legalCase = legalCaseQuery.data;
  if (!legalCase) {
    return (
      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading">
          <div>
            <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">حالة القضية</Badge>
            <h2>سير عمل القضية</h2>
            <p>يجب تسجيل القضية في النظام أولًا حتى يمكن متابعة مراحلها بعد رفعها في تقاضي.</p>
          </div>
        </div>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-700" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-amber-950">
            <span>لا توجد قضية قانونية مرتبطة بهذا العقد حتى الآن.</span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await actions.registerCase();
                await legalCaseQuery.refetch();
              }}
              disabled={state.ui.isRegistering}
            >
              {state.ui.isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
              تسجيل القضية
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="lawsuit-section-panel">
      <div className="lawsuit-section-heading">
        <div>
          <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">حالة القضية</Badge>
          <h2>سير عمل القضية</h2>
          <p>تتغير إلى «تم رفع الدعوى» تلقائيًا بعد نجاح الاعتماد النهائي في تقاضي، ويمكن متابعة المراحل التالية من هنا.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" dir="ltr">{legalCase.case_number}</Badge>
          {legalCase.case_reference && (
            <Badge variant="outline" dir="ltr">تقاضي: {legalCase.case_reference}</Badge>
          )}
        </div>
      </div>

      <LegalCaseWorkflowPanel
        caseId={legalCase.id}
        onChanged={() => void legalCaseQuery.refetch()}
      />
    </section>
  );
}
