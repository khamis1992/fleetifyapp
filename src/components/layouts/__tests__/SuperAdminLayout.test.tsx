import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'super-id',
      roles: ['super_admin'],
      profile: { first_name: 'Admin', last_name: 'User' },
    },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useFleetifyTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/navigation/QuickSearch', () => ({
  QuickSearch: () => null,
}));

import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';

describe('SuperAdminLayout', () => {
  it('renders route content supplied by RouteRenderer', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <SuperAdminLayout>
          <div data-testid="admin-route-content">Admin dashboard</div>
        </SuperAdminLayout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('admin-route-content')).toBeInTheDocument();
  });
});
