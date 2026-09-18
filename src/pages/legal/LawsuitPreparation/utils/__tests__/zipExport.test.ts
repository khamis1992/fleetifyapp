import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../store/reducer';
import type { LawsuitPreparationState } from '../../store/types';
import { shouldIncludeGeneratedDocument } from '../zipExport';

function readyState(): LawsuitPreparationState {
  const state = createInitialState('company-1', 'contract-1');
  state.documents.criminalComplaint.status = 'ready';
  state.documents.violations.status = 'ready';
  state.documents.violationsTransfer.status = 'ready';
  return state;
}

describe('ZIP supporting document gates', () => {
  it('never includes a generated criminal complaint merely because an old copy is ready', () => {
    const state = readyState();
    state.ui.includeCriminalComplaint = true;
    expect(shouldIncludeGeneratedDocument(state, 'criminalComplaint')).toBe(false);
  });

  it('excludes unsupported violations and an unselected transfer request', () => {
    const state = readyState();
    state.calculations = {
      overdueRent: 36_000,
      lateFees: 0,
      damagesFee: 0,
      violationsFines: 0,
      violationsCount: 0,
      retentionCompensation: 0,
      securityDepositDeduction: 0,
      total: 36_000,
      invoiceLateFees: [],
      overdueInvoicesCount: 24,
      totalDaysOverdue: 0,
      avgDaysOverdue: 0,
      amountInWords: '',
    };

    expect(shouldIncludeGeneratedDocument(state, 'violations')).toBe(false);
    expect(shouldIncludeGeneratedDocument(state, 'violationsTransfer')).toBe(false);
  });
});
