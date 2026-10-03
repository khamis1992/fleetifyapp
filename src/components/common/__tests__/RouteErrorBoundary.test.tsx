import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

vi.mock('@/lib/sentry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));

function NavigateTo({ to }: { to: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>Navigate</button>;
}
function DraftEditor() {
  const [notes, setNotes] = useState('');
  return <label>Draft notes<input value={notes} onChange={event => setNotes(event.target.value)} /></label>;
}
function BrokenPage(): never { throw new Error('Synthetic route render failure'); }

afterEach(() => { vi.restoreAllMocks(); });

describe('RouteErrorBoundary navigation', () => {
  it('preserves editable page state when only the query string changes', () => {
    render(<MemoryRouter initialEntries={['/report?reportId=saved']}><NavigateTo to="/report" /><RouteErrorBoundary><DraftEditor /></RouteErrorBoundary></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Draft notes'), { target: { value: 'Reviewed source classifications' } });
    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    expect(screen.getByLabelText('Draft notes')).toHaveValue('Reviewed source classifications');
  });

  it('clears a route error on navigation so the destination can render', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    render(<MemoryRouter initialEntries={['/broken']}><NavigateTo to="/good" /><RouteErrorBoundary><Routes><Route path="/broken" element={<BrokenPage />} /><Route path="/good" element={<p>Recovered destination</p>} /></Routes></RouteErrorBoundary></MemoryRouter>);
    expect(screen.queryByText('Recovered destination')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    await waitFor(() => expect(screen.getByText('Recovered destination')).toBeVisible());
  });
});
