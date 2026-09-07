import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContractActionBar, type ContractActionBarProps } from '../ContractActionBar';
import { ContractHero } from '../ContractHero';

const setup = (status: string) => {
  const props = {
    contract: { id: 'contract', contract_number: 'LTO202410', status },
    snapshot: { dueNowTotal: 46000, remainingTotal: 46000, openInvoicesCount: 31 },
    violationsCount: 11, daysRemaining: -218, formatCurrency: (value: number) => value + ' QAR',
    ...Object.fromEntries(['onEdit','onPrint','onExport','onRefresh','onRenew','onTerminate','onReactivate',
      'onConvertToLegal','onRemoveLegal','onDeletePermanent','onCollect','onOpenViolations','onOpenDocuments']
      .map(key => [key, vi.fn()])),
  } as unknown as ContractActionBarProps;
  return props;
};

describe('contract workspace actions', () => {
  it('makes reactivation discoverable even when a cancelled contract has unpaid invoices', () => {
    const props = setup('cancelled');
    render(<ContractActionBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تفعيل العقد' }));
    expect(props.onReactivate).toHaveBeenCalledOnce();
    expect(props.onCollect).not.toHaveBeenCalled();
  });
  it('routes legal reversal to its dedicated confirmation and exposes recorded penalties', () => {
    const props = setup('under_legal_procedure');
    render(<ContractActionBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'إزالة الإجراء القانوني' }));
    expect(props.onRemoveLegal).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /11 مخالفة غير مسددة/ }));
    expect(props.onOpenViolations).toHaveBeenCalledOnce();
  });
  it('honors document generation blockers instead of allowing printing', () => {
    const props = setup('active');
    render(<ContractActionBar {...props} documentGenerationBlocker="تحتاج المستندات مراجعة" />);
    expect(screen.getByRole('button', { name: 'طباعة' })).toBeDisabled();
  });
  it('keeps an invalid historical date from crashing the identity header', () => {
    const props = setup('active');
    render(<ContractHero contract={{ ...props.contract, start_date: 'invalid', end_date: 'invalid' }}
      customerName="عميل" vehicleName="مركبة" totalAmount={54000} monthlyAmount={1500}
      paidAmount={7524} paidPayments={5} totalPayments={36} daysRemaining={null}
      progressPercentage={0} snapshot={props.snapshot} formatCurrency={props.formatCurrency}
      onBack={vi.fn()} onEdit={vi.fn()} onStatusClick={vi.fn()} onCustomerClick={vi.fn()} onVehicleClick={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'LTO202410' })).toBeVisible();
    expect(screen.getByText('المدة غير محددة')).toBeVisible();
  });
});
