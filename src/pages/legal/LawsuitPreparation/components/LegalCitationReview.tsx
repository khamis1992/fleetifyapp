import { getLegalCitationAudit, LEGAL_CITATION_REVIEW_NOTES } from '@/utils/legal-citations';
import { getMemoDocumentDataForGeneration } from '../utils/documentGenerators';
import type { LawsuitPreparationState } from '../store';

/** Preparation-only evidence table; never inserted into a court document. */
export function LegalCitationReview({ state }: { state: LawsuitPreparationState }) {
  if (!state.contract || !state.calculations) return null;
  const rows = getLegalCitationAudit(getMemoDocumentDataForGeneration(state));
  return (
    <details open className="lawsuit-section-panel" data-testid="legal-citation-review">
      <summary className="cursor-pointer font-semibold">مراجعة الاستشهادات القانونية قبل الإخراج</summary>
      <p className="my-3 text-sm text-muted-foreground">جدول داخلي للمواد المستخدمة في المذكرة. كل استشهاد مرتبط بالجملة الحرفية التي تسنده؛ السند غير المتحقق منه يظهر بصيغة [يُستكمل].</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right text-sm">
          <thead><tr><th className="border p-2">المادة</th><th className="border p-2">القانون</th><th className="border p-2">وجه الاستشهاد</th><th className="border p-2">الجملة المثبتة والمصدر</th></tr></thead>
          <tbody>{rows.map(row => (
            <tr key={`${row.law}-${row.article}`}>
              <td className="border p-2">{row.article}</td>
              <td className="border p-2">{row.law}</td>
              <td className="border p-2">{row.proposition}</td>
              <td className="border p-2">{row.supportingText} <a href={row.source} target="_blank" rel="noreferrer" className="underline">النص الرسمي</a></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ul className="my-3 list-disc space-y-2 ps-5 text-sm">{LEGAL_CITATION_REVIEW_NOTES.map(note => <li key={note}>{note}</li>)}</ul>
    </details>
  );
}
