import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { clientOptions } = vi.hoisted(() => ({ clientOptions: { fetch: null as null | typeof fetch } }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, _key: string, options: { global: { fetch: typeof fetch } }) => {
    clientOptions.fetch = options.global.fetch;
    return {};
  },
}));
vi.mock('@/lib/env', () => ({
  getSupabaseConfig: () => ({ url: 'https://fixture.supabase.co', anonKey: 'fixture-key' }),
  debugLog: vi.fn(), securityLog: vi.fn(),
}));
vi.mock('@/lib/capacitorStorage', () => ({ createCapacitorStorageAdapter: () => ({}) }));

describe('Taqadi queue transport', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await import('../client');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  for (const operation of ['resume', 'restart']) {
    it(`waits for a slow ${operation} acknowledgement without replaying the mutation`, async () => {
      const fetchMock = vi.fn((_url: unknown, options: RequestInit) => new Promise<Response>((resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        setTimeout(() => resolve(new Response('{}', { status: 200 })), 25_000);
      }));
      vi.stubGlobal('fetch', fetchMock);
      if (!clientOptions.fetch) throw new Error('Missing configured fetch');
      const request = clientOptions.fetch(`https://fixture.supabase.co/rest/v1/rpc/${operation}_taqadi_filing_job_v2`, { method: 'POST' });
      await vi.advanceTimersByTimeAsync(25_000);
      expect((await request).status).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  }

  it('does not replay an ambiguous network failure after a resume request', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('connection lost'));
    vi.stubGlobal('fetch', fetchMock);
    if (!clientOptions.fetch) throw new Error('Missing configured fetch');
    await expect(clientOptions.fetch('https://fixture.supabase.co/rest/v1/rpc/resume_taqadi_filing_job_v2', { method: 'POST' }))
      .rejects.toThrow('connection lost');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('allows external filing to finish after the former ten-second limit', async () => {
    const fetchMock = vi.fn((_url: unknown, options: RequestInit) => new Promise<Response>((resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      setTimeout(() => resolve(new Response('{}', { status: 200 })), 25_000);
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = clientOptions.fetch!('https://fixture.supabase.co/rest/v1/rpc/record_external_legal_filing_v2', { method: 'POST' });
    await vi.advanceTimersByTimeAsync(25_000);
    expect((await request).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('bounds external filing at sixty seconds without replaying an uncertain write', async () => {
    const fetchMock = vi.fn((_url: unknown, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('signal is aborted without reason', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = clientOptions.fetch!('https://fixture.supabase.co/rest/v1/rpc/record_external_legal_filing_v2', { method: 'POST' });
    const result = expect(request).rejects.toThrow('signal is aborted');
    await vi.advanceTimersByTimeAsync(60_000);
    await result;
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not replay external filing after an HTTP gateway error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 504 }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await clientOptions.fetch!('https://fixture.supabase.co/rest/v1/rpc/record_external_legal_filing_v2', { method: 'POST' })).status).toBe(504);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
