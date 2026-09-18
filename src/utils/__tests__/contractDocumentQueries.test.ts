import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { contractDocumentsKey, invalidateContractDocumentDependents } from '../contractDocumentQueries';

const company = 'company-1';
const contract = 'contract-1';
const dependentKeys = [
  [...contractDocumentsKey(company, contract), 'customer-1', 'vehicle-1'],
  [...contractDocumentsKey(company, contract), undefined, undefined],
  ['legal-transfer-readiness', company, contract],
  ['legal-transfer-signed-contract-document', company, contract],
  ['contract-document', contract, company],
  ['contract-violation-evidence-documents', contract, company],
  ['manual-legal-delinquency-queue', company],
  ['employee-signed-contract-documents', company, 'employee-1', contract],
  ['pending-id-scan-count', contract],
];

describe('contract document evidence cache', () => {
  it('demonstrates why the old contract-only prefix misses the actual reader key', async () => {
    const client = new QueryClient();
    try {
      client.setQueryData(dependentKeys[0], []);
      await client.invalidateQueries({ queryKey: ['contract-documents', contract] });
      expect(client.getQueryState(dependentKeys[0])?.isInvalidated).toBe(false);
      await invalidateContractDocumentDependents(client, company, contract);
      expect(client.getQueryState(dependentKeys[0])?.isInvalidated).toBe(true);
    } finally { client.clear(); }
  });

  it('invalidates all known evidence consumers without touching another tenant or unrelated contract', async () => {
    const client = new QueryClient();
    const unrelated = [
      [...contractDocumentsKey('company-2', contract), 'customer-1'],
      contractDocumentsKey(company, 'contract-2'),
      ['contract-document', 'contract-2', company],
      ['legal-transfer-readiness', 'company-2', contract],
      ['manual-legal-delinquency-queue', 'company-2'],
      ['employee-signed-contract-documents', 'company-2', 'employee-2'],
    ];
    try {
      for (const key of [...dependentKeys, ...unrelated]) client.setQueryData(key, { matched: false });
      await invalidateContractDocumentDependents(client, company, contract);
      for (const key of dependentKeys) {
        expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true);
        expect(client.getQueryData(key)).toEqual({ matched: false });
      }
      for (const key of unrelated) expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(false);
    } finally { client.clear(); }
  });

  it.each([[undefined, contract], [company, undefined], ['', contract]])('does not broaden missing scope %j/%j', async (companyId, contractId) => {
    const client = new QueryClient();
    try {
      client.setQueryData(dependentKeys[0], []);
      await invalidateContractDocumentDependents(client, companyId, contractId);
      expect(client.getQueryState(dependentKeys[0])?.isInvalidated).toBe(false);
    } finally { client.clear(); }
  });

  it('refreshes an active observer from its query function instead of inventing readiness locally', async () => {
    const client = new QueryClient();
    const key = ['legal-transfer-readiness', company, contract];
    client.setQueryData(key, { ready: true });
    const observer = new QueryObserver(client, {
      queryKey: key, staleTime: Infinity,
      queryFn: async () => ({ ready: false }),
    });
    const unsubscribe = observer.subscribe(() => {});
    try {
      await invalidateContractDocumentDependents(client, company, contract);
      expect(client.getQueryData(key)).toEqual({ ready: false });
    } finally { unsubscribe(); client.clear(); }
  });
});
