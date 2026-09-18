import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260828193227_add_awaiting_legal_case_acceptance_stage.sql');
const rollback = read('supabase/rollbacks/20260828193227_add_awaiting_legal_case_acceptance_stage.rollback.sql');
const workflowHook = read('src/hooks/useLegalCaseWorkflow.ts');
const workflowPanel = read('src/components/legal/LegalCaseWorkflowPanel.tsx');
const documentGenerators = read('src/pages/legal/LawsuitPreparation/utils/documentGenerators.ts');
const lawsuitContext = read('src/pages/legal/LawsuitPreparation/store/LawsuitPreparationContext.tsx');

describe('awaiting legal case acceptance workflow stage', () => {
  it('adds the new value to the database constraint and frontend model', () => {
    expect(migration).toContain("'awaiting_acceptance'");
    expect(workflowHook).toContain("| 'awaiting_acceptance'");
    expect(workflowHook).toContain("{ value: 'awaiting_acceptance', label: 'بانتظار قبول الدعوى' }");
  });

  it('enforces filed -> awaiting acceptance -> hearings', () => {
    expect(migration).toContain("WHEN 'filed' THEN p_target_stage IN ('awaiting_acceptance', 'cancelled')");
    expect(migration).toContain("WHEN 'awaiting_acceptance' THEN p_target_stage IN ('hearings', 'cancelled')");
    expect(migration).toContain("v_case.workflow_stage NOT IN ('awaiting_acceptance', 'hearings')");
    expect(workflowPanel).toContain("transition('awaiting_acceptance'");
  });

  it('keeps the contract legally filed and creates court acceptance follow-up work', () => {
    expect(migration).toContain("WHEN 'awaiting_acceptance' THEN 'legal_case_filed'");
    expect(migration).toContain("v_case.workflow_stage = 'awaiting_acceptance'");
    expect(migration).toContain("'court-acceptance:' || v_case.id::text");
    expect(migration).toContain("metadata->>'workflow_key' = 'court-acceptance:' || p_case_id::text");
  });

  it('provides a data-safe rollback to the filed stage', () => {
    expect(rollback).toContain("WHERE workflow_stage = 'awaiting_acceptance'");
    expect(rollback).toContain("workflow_stage = 'filed'");
    expect(rollback).not.toContain("'awaiting_acceptance',\n      'hearings'");
  });

  it('keeps the original filing date visible after leaving the filed stage', () => {
    expect(documentGenerators).toContain('filingDate: state.legalCase?.filing_date');
    expect(documentGenerators).not.toContain("workflow_stage === 'filed' && state.legalCase.filing_date");
    expect(lawsuitContext).toContain("const filedOn = legalCase?.filing_date?.slice(0, 10) || null");
  });
});
