import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerWorkspace, CustomerSearch } from '../customer-workspace/CustomerWorkspace';
import { customerSections, resolveCustomerSection } from '../customer-workspace/navigation';
import { buildCustomerSnapshotV3, buildProfileCompletionV3 } from '../customer-details-v3/tokens';
import ContractsTab from '../tabs/ContractsTab';
import PhoneNumbersTab from '../tabs/PhoneNumbersTab';
import InvoicesTab from '../tabs/InvoicesTab';

const snapshot = buildCustomerSnapshotV3({ contracts: [], invoices: [], trafficViolations: [], scheduledFollowups: [] });
const noop = () => {};
describe('customer workspace navigation and actions', () => {
  it('preserves direct links to all nine sections and maps old bookmarks', () => {
    for (const section of customerSections) expect(resolveCustomerSection(section)).toBe(section);
    expect(resolveCustomerSection('financial')).toBe('invoices');
    expect(resolveCustomerSection('phones')).toBe('info');
    expect(resolveCustomerSection('notes')).toBe('activity');
    expect(resolveCustomerSection('untrusted')).toBe('overview');
  });
  it('exposes direct navigation and keeps edit/payment actions connected', () => {
    const onSectionChange = vi.fn(), onEdit = vi.fn(), onAddPayment = vi.fn();
    render(<CustomerWorkspace customer={{}} customerName="عميل الاختبار" initials="ع ا" snapshot={snapshot}
      completion={buildProfileCompletionV3({}, 0)} contractsCount={0} formatCurrency={n => `${n} ر.ق`}
      onBack={noop} onEdit={onEdit} onCall={noop} onWhatsApp={noop} onOpenContracts={noop}
      section="documents" onSectionChange={onSectionChange} onCreateContract={noop} onAddPayment={onAddPayment}
      counts={{ documents: 0 }} loadingSummary={false} actions={<span>إجراءات الملف</span>}><p>محتوى المستندات</p></CustomerWorkspace>);
    expect(screen.getByRole('button', { name: /المستندات/ })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'الدفعات' }));
    expect(onSectionChange).toHaveBeenCalledWith('payments');
    fireEvent.click(screen.getByRole('button', { name: 'تعديل البيانات' }));
    expect(onEdit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل دفعة' }));
    expect(onAddPayment).toHaveBeenCalledOnce();
  });
  it('allows clearing a search with an accessible control', () => {
    const onChange = vi.fn();
    render(<CustomerSearch value="عقد" onChange={onChange} placeholder="بحث العقود"/>);
    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
  it('keeps cancelled contracts distinct and links to the contract id when number is absent', () => {
    render(<MemoryRouter><ContractsTab contracts={[{ id: 'c-1', status: 'cancelled', end_date: 'invalid' }]} customerId="u-1" navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByText('ملغي')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/contracts/c-1');
  });
  it('does not expose invalid call actions for customers without a phone', () => {
    render(<PhoneNumbersTab customer={{}}/>);
    expect(screen.queryByRole('button', { name: 'اتصال' })).not.toBeInTheDocument();
  });
  it('opens an invoice from its keyboard-accessible action and prevents printing a filtered statement', () => {
    const invoice = { id: 'i-1', invoice_number: 'INV-01', total_amount: 100, paid_amount: 0, payment_status: 'unpaid' };
    const onInvoiceClick = vi.fn();
    render(<InvoicesTab invoices={[invoice]} onInvoiceClick={onInvoiceClick} isFiltered/>);
    fireEvent.click(screen.getByRole('button', { name: 'عرض الفاتورة INV-01' }));
    expect(onInvoiceClick).toHaveBeenCalledWith(invoice);
    expect(screen.getByRole('button', { name: 'طباعة كشف المستحقات' })).toBeDisabled();
  });
});
