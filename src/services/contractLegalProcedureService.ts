import { supabase } from '@/integrations/supabase/client';

type RevertLegalProcedureInput = {
  contractId: string;
  companyId: string;
  reason?: string;
};

export async function revertContractLegalProcedure({
  contractId,
  companyId,
  reason = 'تمت إزالة الإجراء القانوني من العقد',
}: RevertLegalProcedureInput) {
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, status, legal_status')
    .eq('id', contractId)
    .eq('company_id', companyId)
    .single();
  if (contractError) throw contractError;

  const [casesResult, delinquentResult, authResult] = await Promise.all([
    supabase
      .from('legal_cases')
      .select('id, case_status, notes, outcome_type, outcome_date, workflow_stage, closed_at, closure_reason')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .not('case_status', 'in', '(closed,settled,withdrawn,dismissed,cancelled)'),
    supabase
      .from('delinquent_customers')
      .select('id, is_active, last_updated_at')
      .eq('contract_id', contractId)
      .eq('company_id', companyId),
    supabase.auth.getUser(),
  ]);
  if (casesResult.error) throw casesResult.error;
  if (delinquentResult.error) throw delinquentResult.error;

  const legalCases = casesResult.data || [];
  const delinquentRecords = delinquentResult.data || [];
  const now = new Date().toISOString();

  const rollback = async () => {
    await Promise.all([
      ...legalCases.map((legalCase) =>
        supabase
          .from('legal_cases')
          .update({
            case_status: legalCase.case_status,
            notes: legalCase.notes,
            outcome_type: legalCase.outcome_type,
            outcome_date: legalCase.outcome_date,
            workflow_stage: legalCase.workflow_stage,
            closed_at: legalCase.closed_at,
            closure_reason: legalCase.closure_reason,
          })
          .eq('id', legalCase.id)
          .eq('company_id', companyId)
      ),
      ...delinquentRecords.map((record) =>
        supabase
          .from('delinquent_customers')
          .update({ is_active: record.is_active, last_updated_at: record.last_updated_at })
          .eq('id', record.id)
          .eq('company_id', companyId)
      ),
      supabase
        .from('contracts')
        .update({ status: contract.status, legal_status: contract.legal_status })
        .eq('id', contractId)
        .eq('company_id', companyId),
    ]);
  };

  try {
    for (const legalCase of legalCases) {
      const notes = [legalCase.notes, `${reason} - ${now}`].filter(Boolean).join('\n\n');
      // Mirror revert_contract_from_legal_v1: the normalize_legacy_legal_terminal_stage
      // trigger rejects case_status='closed' unless an outcome is recorded, so closing
      // without outcome_type fails with HTTP 400.
      const { error } = await supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          outcome_type: legalCase.outcome_type ?? 'withdrawn',
          outcome_date: legalCase.outcome_date ?? now.slice(0, 10),
          notes,
          updated_at: now,
        })
        .eq('id', legalCase.id)
        .eq('company_id', companyId);
      if (error) throw error;
    }

    const { error: delinquentError } = await supabase
      .from('delinquent_customers')
      .update({ is_active: false, last_updated_at: now })
      .eq('contract_id', contractId)
      .eq('company_id', companyId);
    if (delinquentError) throw delinquentError;

    const nextStatus = contract.status === 'under_legal_procedure' ? 'active' : contract.status;
    const { error: updateContractError } = await supabase
      .from('contracts')
      .update({ status: nextStatus, legal_status: null, updated_at: now })
      .eq('id', contractId)
      .eq('company_id', companyId);
    if (updateContractError) throw updateContractError;

    const { error: logError } = await supabase.from('contract_operations_log').insert({
      contract_id: contractId,
      company_id: companyId,
      operation_type: 'revert_from_legal',
      operation_details: { reason, closed_cases: legalCases.length, deactivated_delinquent_records: delinquentRecords.length },
      old_values: { status: contract.status, legal_status: contract.legal_status },
      new_values: { status: nextStatus, legal_status: null },
      notes: reason,
      performed_by: authResult.data.user?.id ?? null,
    });
    if (logError) throw logError;

    return { closedCases: legalCases.length, deactivatedDelinquentRecords: delinquentRecords.length };
  } catch (error) {
    await rollback();
    throw error;
  }
}
