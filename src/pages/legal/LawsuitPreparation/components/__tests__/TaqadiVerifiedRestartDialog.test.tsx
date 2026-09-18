import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaqadiVerifiedRestartDialog } from '../TaqadiVerifiedRestartDialog';

afterEach(cleanup);
const target = { jobId: 'job-1', expectedUpdatedAt: '2026-09-07T15:44:28.709199Z', requestId: 'request-1' };
const base = { target, contractNumber: 'AGR-202504-417240', stale: false, pending: false, onClose: vi.fn(), onConfirm: vi.fn() };
describe('human-verified filing restart', () => {
  it('requires the operator to supply both the portal finding and explicit non-filing confirmation', async () => {
    const user = userEvent.setup(); const onConfirm = vi.fn();
    render(<TaqadiVerifiedRestartDialog {...base} onConfirm={onConfirm} />);
    const submit = screen.getByRole('button', { name: 'تحديث الحزمة والبدء من البداية' });
    const confirmation = screen.getByRole('checkbox');
    expect(confirmation).not.toBeChecked(); expect(submit).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'نتيجة المراجعة' }), 'راجعت الطلب ولم يتم إيداعه');
    expect(submit).toBeDisabled();
    await user.click(confirmation); expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({ ...target, confirmedNotSubmitted: true, verificationNote: 'راجعت الطلب ولم يتم إيداعه' });
  });
  it('invalidates confirmation if the live job changes while the dialog is open', async () => {
    const user = userEvent.setup(); const onConfirm = vi.fn();
    const view = render(<TaqadiVerifiedRestartDialog {...base} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByRole('textbox'), 'راجعت الطلب ولم يتم إيداعه');
    view.rerender(<TaqadiVerifiedRestartDialog {...base} stale onConfirm={onConfirm} />);
    expect(screen.getByText(/تغيرت حالة العملية/)).toBeVisible();
    const submit = screen.getByRole('button', { name: 'تحديث الحزمة والبدء من البداية' });
    expect(submit).toBeDisabled(); await user.click(submit); expect(onConfirm).not.toHaveBeenCalled();
  });
  it('displays a readiness blocker and prevents submitting an incomplete package', () => {
    render(<TaqadiVerifiedRestartDialog {...base} blockReason="أرفق نسخة العقد الموقّع" />);
    expect(screen.getByText('أرفق نسخة العقد الموقّع')).toBeVisible();
    expect(screen.getByRole('button', { name: 'تحديث الحزمة والبدء من البداية' })).toBeDisabled();
  });
  it('prevents duplicate submission and dismissing a pending command', async () => {
    const user = userEvent.setup(); const onClose = vi.fn();
    render(<TaqadiVerifiedRestartDialog {...base} pending onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'جارٍ تجهيز الإعادة...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeDisabled();
    await user.keyboard('{Escape}'); expect(onClose).not.toHaveBeenCalled();
  });
  it('allows closing without any command and offers the portal link', async () => {
    const user = userEvent.setup(); const onClose = vi.fn(); const onConfirm = vi.fn();
    render(<TaqadiVerifiedRestartDialog {...base} onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.getByRole('link', { name: 'فتح تقاضي لمراجعة الطلب' })).toHaveAttribute('target', '_blank');
    await user.click(screen.getByRole('button', { name: 'رجوع' }));
    expect(onClose).toHaveBeenCalledOnce(); expect(onConfirm).not.toHaveBeenCalled();
  });
});
