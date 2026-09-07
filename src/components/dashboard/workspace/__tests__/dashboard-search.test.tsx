import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalSearch } from '@/components/common/GlobalSearch';

vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-test' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

describe('dashboard global search integration', () => {
  it('opens a named search dialog directly without broadcasting a keyboard shortcut', () => {
    const keyboardListener = vi.fn();
    document.addEventListener('keydown', keyboardListener);
    const view = render(<MemoryRouter><GlobalSearch /></MemoryRouter>);
    fireEvent(document, new Event('fleetify:open-global-search'));
    expect(screen.getByRole('dialog', { name: 'البحث في النظام' })).toBeInTheDocument();
    expect(keyboardListener).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.unmount();
    document.removeEventListener('keydown', keyboardListener);
  });
});
