import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contractFinancialSyncQueryOptions,
  FinancialSyncValidationError,
  FinancialSyncUnavailableError,
  retryContractFinancialReads,
} from '../contractFinancialSynchronization';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));

const scope = { contractId: 'contract-1', contractNumber: 'TEST-1', companyId: 'company-1' };
const invoiceKey = ['contract-invoices', scope.contractId, '2026-01-01'];
const paymentKey = ['contract-payments', scope.contractId, true, 'invoice-1'];
const syncKey = ['contract-financial-refresh', scope.contractId, scope.companyId];
const ack = (changed = true, contractId = scope.contractId) => ({ data: { contract_id: contractId, changed }, error: null });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
};
let client: QueryClient;
let stops: (() => void)[];
const options = () => contractFinancialSyncQueryOptions(client, scope);

function observeReader(key: string[], queryFn: () => Promise<string>, cached = true) {
  if (cached) client.setQueryData(key, 'old');
  const observer = new QueryObserver(client, { queryKey: key, queryFn, staleTime: Infinity, retry: false });
  stops.push(observer.subscribe(() => {}));
  return observer;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  stops = [];
  rpc.mockResolvedValue(ack());
});
afterEach(() => { stops.forEach((stop) => stop()); client.clear(); });

describe('financial synchronization with real QueryClient/QueryObserver', () => {
  it.each([true, false])('refreshes after each identical changed=%s acknowledgement', async (changed) => {
    rpc.mockResolvedValue(ack(changed));
    const reader = vi.fn(async () => `fresh-${rpc.mock.calls.length}`);
    observeReader(invoiceKey, reader);
    for (let round = 1; round <= 2; round += 1) {
      await client.fetchQuery({ ...options(), staleTime: 0 });
      expect(reader).toHaveBeenCalledTimes(round);
      expect(client.getQueryData(invoiceKey)).toBe(`fresh-${round}`);
    }
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('waits for the command and then all active reads before reporting success', async () => {
    const command = deferred<ReturnType<typeof ack>>();
    const invoice = deferred<string>();
    rpc.mockReturnValue(command.promise);
    const reader = vi.fn(() => invoice.promise);
    observeReader(invoiceKey, reader);
    let completed = false;
    const result = client.fetchQuery(options()).then((value) => { completed = true; return value; });
    expect(reader).not.toHaveBeenCalled();
    command.resolve(ack(false));
    await waitFor(() => expect(reader).toHaveBeenCalledTimes(1));
    expect(completed).toBe(false);
    invoice.resolve('corrected invoice');
    expect((await result).readError).toBeNull();
    expect(client.getQueryData(invoiceKey)).toBe('corrected invoice');
  });

  it('replaces an unfinished initial read and ignores its late stale response', async () => {
    const initialRead = deferred<string>();
    const reader = vi.fn()
      .mockReturnValueOnce(initialRead.promise)
      .mockResolvedValue('after-sync');
    observeReader(invoiceKey, reader, false);
    expect(reader).toHaveBeenCalledTimes(1);
    await client.fetchQuery(options());
    expect(reader).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(invoiceKey)).toBe('after-sync');
    initialRead.resolve('before-sync');
    await initialRead.promise;
    await Promise.resolve();
    expect(client.getQueryData(invoiceKey)).toBe('after-sync');
  });

  it('does not retry the command on a post-command read failure and supports read-only recovery', async () => {
    const invoice = vi.fn().mockRejectedValue(new Error('read unavailable'));
    const payment = vi.fn(async () => 'fresh payment');
    observeReader(invoiceKey, invoice);
    observeReader(paymentKey, payment);
    const result = await client.fetchQuery({ ...options(), retryDelay: 0 });
    expect(result.readError).toContain('اكتملت مزامنة');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(invoiceKey)?.status).toBe('error');
    expect(client.getQueryData(paymentKey)).toBe('fresh payment');
    invoice.mockResolvedValue('recovered invoice');
    await retryContractFinancialReads(client, scope);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(invoiceKey)).toBe('recovered invoice');
    expect(client.getQueryData(syncKey)).toEqual({ ...result, readError: null });
  });

  it('retains the warning when read-only recovery also fails', async () => {
    observeReader(invoiceKey, async () => { throw new Error('still unavailable'); });
    const result = await client.fetchQuery(options());
    await expect(retryContractFinancialReads(client, scope)).rejects.toThrow('تعذر تحميل');
    expect(client.getQueryData(syncKey)).toEqual(result);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    null, {}, [], { changed: true }, { contract_id: 'other-contract', changed: true },
    { contract_id: scope.contractId, changed: 'false' }, { contract_id: scope.contractId },
  ])('rejects malformed or mismatched acknowledgement %j without automatic resubmission', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    const reader = vi.fn(async () => 'fresh');
    observeReader(invoiceKey, reader);
    await expect(client.fetchQuery({ ...options(), retryDelay: 0 })).rejects.toBeInstanceOf(FinancialSyncValidationError);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(reader).not.toHaveBeenCalled();
    expect(client.getQueryState(syncKey)?.status).toBe('error');
  });

  it('keeps bounded RPC error retries, but never invalidates readers on a failed RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } });
    const reader = vi.fn(async () => 'fresh');
    observeReader(invoiceKey, reader);
    await expect(client.fetchQuery({ ...options(), retryDelay: 0 })).rejects.toEqual({ message: 'RPC unavailable' });
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(reader).not.toHaveBeenCalled();
  });

  it.each(['PGRST202', '42883'])('explains missing RPC %s without retrying or claiming success', async (code) => {
    rpc.mockResolvedValue({ data: null, error: { code, message: 'function unavailable' } });
    const reader = vi.fn(async () => 'fresh');
    observeReader(invoiceKey, reader);
    await expect(client.fetchQuery({ ...options(), retryDelay: 0 })).rejects.toBeInstanceOf(FinancialSyncUnavailableError);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(reader).not.toHaveBeenCalled();
  });

  it('does not invalidate the active synchronization query or loop after completion', async () => {
    const observer = new QueryObserver(client, options());
    stops.push(observer.subscribe(() => {}));
    await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
    expect(client.getQueryState(syncKey)?.isInvalidated).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
    await observer.refetch();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(syncKey)?.isInvalidated).toBe(false);
  });

  it('reuses a fresh completion across unmount/remount without repeating the command', async () => {
    const first = new QueryObserver(client, options());
    const stop = first.subscribe(() => {});
    stops.push(stop);
    await waitFor(() => expect(first.getCurrentResult().isSuccess).toBe(true));
    stop();
    const second = new QueryObserver(client, options());
    stops.push(second.subscribe(() => {}));
    expect(second.getCurrentResult().isSuccess).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('keeps an old in-flight operation scoped after navigation to another contract', async () => {
    const oldCommand = deferred<ReturnType<typeof ack>>();
    rpc.mockReturnValueOnce(oldCommand.promise);
    const oldObserver = new QueryObserver(client, options());
    const stop = oldObserver.subscribe(() => {});
    stops.push(stop);
    stop();
    const otherScope = { ...scope, contractId: 'contract-2', contractNumber: 'TEST-2' };
    const otherKey = ['contract-invoices', otherScope.contractId, '2026-01-01'];
    const otherReader = vi.fn(async () => 'other fresh');
    observeReader(otherKey, otherReader);
    rpc.mockResolvedValue(ack(false, otherScope.contractId));
    const other = new QueryObserver(client, contractFinancialSyncQueryOptions(client, otherScope));
    stops.push(other.subscribe(() => {}));
    await waitFor(() => expect(other.getCurrentResult().isSuccess).toBe(true));
    oldCommand.resolve(ack());
    await waitFor(() => expect(client.getQueryState(syncKey)?.status).toBe('success'));
    expect(otherReader).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(otherKey)).toBe('other fresh');
    expect(other.getCurrentResult().data?.contractId).toBe(otherScope.contractId);
  });

  it.each(['contractId', 'companyId', 'contractNumber'] as const)('does not execute with an empty %s', async (field) => {
    const invalid = contractFinancialSyncQueryOptions(client, { ...scope, [field]: '' });
    expect(invalid.enabled).toBe(false);
    await expect(client.fetchQuery(invalid)).rejects.toBeInstanceOf(FinancialSyncValidationError);
    expect(rpc).not.toHaveBeenCalled();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await expect(retryContractFinancialReads(client, { ...scope, [field]: ' ' })).rejects.toBeInstanceOf(FinancialSyncValidationError);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
