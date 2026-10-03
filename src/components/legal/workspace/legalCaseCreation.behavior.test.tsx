import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LegalCaseCreationWizard from '../LegalCaseCreationWizard';

const mocks = vi.hoisted(() => ({ create: vi.fn(), from: vi.fn(), error: vi.fn(), companyId: 'company-a' }));
vi.mock('@/hooks/useLegalCases', () => ({ useCreateLegalCase: () => ({ mutateAsync: mocks.create, isPending: false }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: mocks.companyId }) }));
vi.mock('@/hooks/useCaseDraft', () => ({ useCaseDraft: () => ({ saveDraft: vi.fn(), lastSaved: null }) }));
vi.mock('@/hooks/useTranslation', () => ({ useFleetifyTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock('../LegalComplaintGenerator', () => ({ LegalComplaintGenerator: () => null }));
// Keep selection semantics native so these tests focus on the wizard branching and persistence payload.
vi.mock('@/components/ui/select', async () => {
  const react = await import('react');
  return {
    Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => {
      const items = react.Children.toArray(children) as React.ReactElement<{ id?: string; children?: React.ReactNode }>[];
      return <select id={items[0].props.id} value={value} onChange={event => onValueChange(event.target.value)}>{items[1]}</select>;
    },
    SelectTrigger: () => null, SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
  };
});

function fillIncomingClaim(amount?: string) {
  fireEvent.change(screen.getByLabelText('اتجاه الدعوى *'), { target: { value: 'filed_against_us' } });
  fireEvent.change(screen.getByLabelText('عنوان القضية *'), { target: { value: 'دعوى موثقة على الشركة' } });
  if (amount !== undefined) fireEvent.change(screen.getByLabelText('قيمة المطالبة (ر.ق) *'), { target: { value: amount } });
  fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
  fireEvent.change(screen.getByLabelText('اسم المدعي *'), { target: { value: 'المدعي بحسب صحيفة الدعوى' } });
  fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
  fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
}

describe('incoming lawsuit creation', () => {
  beforeEach(() => { mocks.create.mockReset().mockResolvedValue({ id: 'case-a' }); mocks.from.mockReset(); mocks.error.mockReset(); mocks.companyId = 'company-a'; });

  it('creates an incoming claim with cents without customer invoice queries or invented outcome/payment', async () => {
    render(<LegalCaseCreationWizard open onOpenChange={vi.fn()} />);
    fillIncomingClaim('123.45');
    expect(screen.getByText(/لم تُرفق ملفات المستندات من هذا المعالج/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إنشاء ملف البلاغ' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء القضية' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    const payload = mocks.create.mock.calls[0][0];
    expect(payload).toMatchObject({ case_direction: 'filed_against_us', case_value: 123.45, client_name: 'المدعي بحسب صحيفة الدعوى', case_status: 'active' });
    expect(payload.client_id).toBeUndefined();
    expect(payload.outcome_amount).toBeUndefined();
    expect(payload.payment_direction).toBeUndefined();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('refuses a missing claim value rather than silently creating zero', async () => {
    render(<LegalCaseCreationWizard open onOpenChange={vi.fn()} />);
    fillIncomingClaim();
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء القضية' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('clears the current case input when the active company changes', () => {
    const view = render(<LegalCaseCreationWizard open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('عنوان القضية *'), { target: { value: 'company-a only' } });
    mocks.companyId = 'company-b';
    view.rerender(<LegalCaseCreationWizard open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText('عنوان القضية *')).toHaveValue('');
    expect(screen.getByLabelText('قيمة المطالبة (ر.ق) *')).toHaveValue(null);
  });
});
