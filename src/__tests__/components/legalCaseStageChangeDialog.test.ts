import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const dialog = read('src/components/legal/LegalCaseStageChangeDialog.tsx');
const delinquencyPage = read('src/pages/legal/FinancialDelinquency.tsx');
const workflowHook = read('src/hooks/useLegalCaseWorkflow.ts');

describe('delinquency legal case stage change', () => {
  it('exposes the stage action on each active legal case card', () => {
    expect(delinquencyPage).toContain('تغيير مرحلة الدعوى');
    expect(delinquencyPage).toContain('<LegalCaseStageChangeDialog');
    expect(delinquencyPage).toContain(".in('workflow_stage', activeWorkflowStages)");
  });

  it('loads the identity and evidence fields used to detect a signed contract', () => {
    expect(delinquencyPage).toContain('legal_identity_match_status,');
    expect(delinquencyPage).toContain('legal_evidence_state');
    expect(delinquencyPage).toContain('selectLegalContractDocument(');
  });

  it('uses audited workflow RPCs and never writes case_status directly', () => {
    expect(dialog).toContain("db.rpc('transition_legal_case_workflow_v1'");
    expect(dialog).toContain("db.rpc('close_legal_case_final_v1'");
    expect(dialog).toContain("db.rpc('reopen_legal_case_v1'");
    expect(dialog).toContain("db.rpc('correct_unfiled_legal_case_to_preparation_v1'");
    expect(dialog).not.toContain(".update({ case_status");
    expect(dialog).not.toContain(".from('legal_cases').update");
  });

  it('requires a documented reason and prevents invalid stage jumps', () => {
    expect(dialog).toContain('MIN_REASON_LENGTH = 10');
    expect(dialog).toContain('availableTargets.includes(targetStage)');
    expect(dialog).toContain("filed: ['awaiting_acceptance', 'cancelled']");
    expect(dialog).toContain("awaiting_acceptance: ['hearings', 'cancelled']");
    expect(dialog).toContain('aria-pressed={selected}');
  });

  it('shows the court acceptance wait state as an action card', () => {
    expect(workflowHook).toContain("{ value: 'awaiting_acceptance', label: 'بانتظار قبول الدعوى' }");
    expect(dialog).toContain('تم تأكيد الإيداع والدعوى بانتظار قرار القبول');
    expect(dialog).toContain('ما الإجراء التالي؟');
    expect(dialog).not.toContain('<SelectTrigger');
  });

  it('prefills an auditable reason for operational transitions so approval is immediately available', () => {
    expect(dialog).toContain('DEFAULT_TRANSITION_REASONS');
    expect(dialog).toContain("awaiting_acceptance: 'تم تأكيد إيداع الدعوى وبدء انتظار قبول المحكمة'");
    expect(dialog).toContain("DEFAULT_TRANSITION_REASONS[target] || ''");
    expect(dialog).toContain("isReopening || correctionTarget || target === 'closed' || target === 'cancelled'");
  });

  it('keeps terminal transitions explicit and manager overrides guarded', () => {
    expect(dialog).toContain("targetStage === 'closed'");
    expect(dialog).toContain("targetStage === 'cancelled'");
    expect(dialog).toContain('p_override_unsettled: overrideUnsettled');
    expect(dialog).toContain('canOverrideUnsettled');
    expect(dialog).toContain('canCorrectUnfiled');
    expect(dialog).toContain('دون حذف القضية أو مستنداتها');
  });

  it('exposes a manager-only correction guarded by server-side filing evidence checks', () => {
    expect(delinquencyPage).toContain('canCorrectUnfiled={isAdminOrManager()}');
    expect(dialog).toContain("stage === 'filed' && canCorrectUnfiled");
    expect(dialog).toContain('عدم وجود رقم دعوى أو إيصال رفع أو مهمة تقاضي مكتملة');
    expect(workflowHook).toContain('correctUnfiled: (reason: string)');
  });
});
