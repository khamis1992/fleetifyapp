import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { TaqadiJobActionsMenu, TAQADI_PORTAL_URL } from '../TaqadiJobActionsMenu';

afterEach(cleanup);
describe('Taqadi job additional actions', () => {
  it('offers portal verification and status refresh when submission is uncertain', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    render(<TaqadiJobActionsMenu requiresVerification refreshing={false} onRefresh={refresh} />);
    await user.click(screen.getByRole('button', { name: 'إجراءات إضافية' }));
    const portal = screen.getByRole('menuitem', { name: 'فتح تقاضي للتحقق من الطلب' });
    expect(portal).toHaveAttribute('href', TAQADI_PORTAL_URL);
    expect(portal).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.queryByText(/إعادة من البداية|إعادة تشغيل/)).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'تحديث حالة العملية' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('remains useful for active and filed jobs without retry actions', async () => {
    const user = userEvent.setup();
    render(<TaqadiJobActionsMenu requiresVerification={false} refreshing={false} onRefresh={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'إجراءات إضافية' }));
    expect(screen.getByRole('menuitem', { name: 'فتح تقاضي' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'تحديث حالة العملية' })).toBeVisible();
  });
  it('keeps an allowed retry supplied by the parent and prevents repeated refresh while pending', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    const retry = vi.fn();
    render(<TaqadiJobActionsMenu requiresVerification={false} refreshing onRefresh={refresh}>
      <DropdownMenuItem onSelect={retry}>إعادة من البداية</DropdownMenuItem>
    </TaqadiJobActionsMenu>);
    await user.click(screen.getByRole('button', { name: 'إجراءات إضافية' }));
    expect(screen.getByRole('menuitem', { name: 'جارٍ تحديث الحالة...' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitem', { name: 'جارٍ تحديث الحالة...' }));
    expect(refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', { name: 'إعادة من البداية' }));
    await waitFor(() => expect(retry).toHaveBeenCalledOnce());
  });
});
