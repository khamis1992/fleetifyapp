import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmployeeWorkspacePresentation, WorkspaceButton, WorkspaceDialogContent, WorkspaceDialogHeader } from '../WorkspacePresentation';
import { AddNoteDialog } from '@/components/employee/dialogs/AddNoteDialog';
import { ScheduleFollowupDialog } from '@/components/employee/dialogs/ScheduleFollowupDialog';

const mocks = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn() }));
vi.mock('../employee-workspace.css', () => ({}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'employee', profile: { id: 'profile', company_id: 'company' } } }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }), useMutation: () => ({ mutateAsync: mocks.save, isPending: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/integrations/supabase/customerCommunicationsClient', () => ({ customerCommunicationsClient: {} }));
const contracts = [{ id: 'contract-1', contract_number: 'C-TEST-01', customer_name: 'عميل اختبار', customer_id: 'customer-1' }];
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({}); });

describe('employee action presentation', () => {
  it('applies the design through dialog portals and preserves disabled actions', () => {
    const save = vi.fn();
    render(<EmployeeWorkspacePresentation><Dialog open><WorkspaceDialogContent><WorkspaceDialogHeader><DialogTitle>إجراء تجريبي</DialogTitle><DialogDescription>مراجعة الإجراء</DialogDescription></WorkspaceDialogHeader><WorkspaceButton disabled onClick={save}>اعتماد</WorkspaceButton></WorkspaceDialogContent></Dialog></EmployeeWorkspacePresentation>);
    expect(screen.getByRole('dialog')).toHaveClass('ew-dialog');
    expect(screen.getByText(/إجراءات العمل/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اعتماد' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد' }));
    expect(save).not.toHaveBeenCalled();
  });
  it('leaves shared workflows outside the employee provider unchanged', () => {
    render(<Dialog open><WorkspaceDialogContent><WorkspaceDialogHeader><DialogTitle>إجراء مشترك</DialogTitle><DialogDescription>وصف</DialogDescription></WorkspaceDialogHeader><WorkspaceButton>حفظ</WorkspaceButton></WorkspaceDialogContent></Dialog>);
    expect(screen.getByRole('dialog')).not.toHaveClass('ew-dialog');
    expect(screen.getByRole('button', { name: 'حفظ' })).not.toHaveAttribute('data-employee-tone');
    expect(screen.queryByText(/إجراءات العمل/)).not.toBeInTheDocument();
  });
  it('keeps contract context and note validation across the redesigned sections', async () => {
    const close = vi.fn();
    render(<EmployeeWorkspacePresentation><AddNoteDialog open onOpenChange={close} contracts={contracts} preselectedContractId="contract-1" /></EmployeeWorkspacePresentation>);
    expect(screen.getByRole('region', { name: 'العقد وتصنيف الملاحظة' })).toHaveTextContent('عميل اختبار');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }));
    expect(await screen.findByText('يجب كتابة ملاحظة (10 أحرف على الأقل)')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'محتوى الملاحظة *' }), { target: { value: 'تم التواصل مع العميل ومراجعة تفاصيل العقد.' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ contract_id: 'contract-1', note_content: 'تم التواصل مع العميل ومراجعة تفاصيل العقد.' })));
    expect(close).not.toHaveBeenCalled();
  });
  it('keeps appointment date selection in form state and cancel does not save', async () => {
    const close = vi.fn();
    render(<EmployeeWorkspacePresentation><ScheduleFollowupDialog open onOpenChange={close} contracts={contracts} preselectedContractId="contract-1" /></EmployeeWorkspacePresentation>);
    const timing = screen.getByRole('region', { name: 'الموعد والأولوية' });
    fireEvent.click(within(timing).getByRole('button', { name: 'غداً' }));
    expect(within(timing).getByLabelText('التاريخ *')).not.toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'جدولة المتابعة' }));
    expect(await screen.findByText('يجب كتابة عنوان المتابعة')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء', exact: true }));
    expect(close).toHaveBeenCalledWith(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
