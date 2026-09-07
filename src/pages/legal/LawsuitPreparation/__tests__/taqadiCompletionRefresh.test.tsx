import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';
import { useTaqadiCompletionRefresh } from '../hooks/useTaqadiCompletionRefresh';

describe('completion when returning to the preparation page', () => {
  it('invalidates stale workflow and preparation data even when the first observed job is already filed', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const workflow = ['legal-case-workflow', 'company-1', 'case-1'];
    client.setQueryData(workflow, { workflow_stage: 'preparation' });
    client.setQueryData(['legal-case-workflow', 'company-2', 'case-2'], { workflow_stage: 'preparation' });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { unmount } = renderHook(() => useTaqadiCompletionRefresh('company-1', 'contract-1', {
      id: 'job-1', legal_case_id: 'case-1', status: 'filed', updated_at: '2026-09-06',
    }), { wrapper });
    await waitFor(() => expect(client.getQueryState(workflow)?.isInvalidated).toBe(true));
    expect(client.getQueryState(['legal-case-workflow', 'company-2', 'case-2'])?.isInvalidated).toBe(false);
    act(() => unmount());
    client.clear();
  });
});
