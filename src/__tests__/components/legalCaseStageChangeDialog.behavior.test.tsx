import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LegalCaseStageChangeDialog } from '@/components/legal/LegalCaseStageChangeDialog';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderDialog(canCorrectUnfiled = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LegalCaseStageChangeDialog
        open
        onOpenChange={vi.fn()}
        companyId="company-1"
        caseId="case-1"
        caseNumber="CASE-26-0030"
        currentStage="filed"
        canOverrideUnsettled={false}
        canCorrectUnfiled={canCorrectUnfiled}
      />
    </QueryClientProvider>,
  );
}

describe('LegalCaseStageChangeDialog behavior', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: { id: 'case-1' }, error: null });
  });

  it('enables approval immediately after selecting awaiting acceptance', async () => {
    const user = userEvent.setup();
    renderDialog();

    const approveButton = screen.getByRole('button', { name: 'اعتماد المرحلة الجديدة' });
    expect(approveButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /بانتظار قبول الدعوى/ }));

    expect(screen.getByDisplayValue('تم تأكيد إيداع الدعوى وبدء انتظار قبول المحكمة')).toBeInTheDocument();
    expect(approveButton).toBeEnabled();

    await user.click(approveButton);

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('transition_legal_case_workflow_v1', {
        p_company_id: 'company-1',
        p_case_id: 'case-1',
        p_target_stage: 'awaiting_acceptance',
        p_reason: 'تم تأكيد إيداع الدعوى وبدء انتظار قبول المحكمة',
      });
    });
  });

  it('lets a manager request the protected correction with a manual reason', async () => {
    const user = userEvent.setup();
    renderDialog(true);

    await user.click(screen.getByRole('button', { name: /تجهيز الملف/ }));
    expect(screen.getByText(/سيتحقق النظام مجدداً/)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('سبب التغيير'),
      'لا يوجد أي دليل فعلي على رفع الدعوى',
    );
    await user.click(screen.getByRole('button', { name: 'اعتماد المرحلة الجديدة' }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('correct_unfiled_legal_case_to_preparation_v1', {
        p_company_id: 'company-1',
        p_case_id: 'case-1',
        p_reason: 'لا يوجد أي دليل فعلي على رفع الدعوى',
      });
    });
  });
});
