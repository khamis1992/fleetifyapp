import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LegalCaseWorkflowPanel } from '@/components/legal/LegalCaseWorkflowPanel';
import { getCurrentLegalCase } from '../utils/taqadiFiling';
import { useLawsuitPreparationContext } from '../store';

export function LawsuitCaseWorkflowCard() {
  const { state } = useLawsuitPreparationContext();
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
            <p>سيُنشئ النظام سجل التجهيز تلقائيًا عند بدء إجراءات رفع الدعوى.</p>
          </div>
        </div>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-700" />
          <AlertDescription className="text-amber-950">
            لا يلزم أي تسجيل يدوي؛ اضغط «بدء إجراءات رفع الدعوى» وسيُنشأ السجل في مرحلة التجهيز تلقائيًا.
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
        canMarkFiled={false}
        filingBlockReason="تُسجّل حالة الرفع تلقائيًا من إيصال تقاضي؛ لا يلزم إجراء يدوي."
        onChanged={() => void legalCaseQuery.refetch()}
      />
    </section>
  );
}
