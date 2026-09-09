import type { Query, QueryClient } from '@tanstack/react-query';

export type RecordChange = {
  entity: 'customer' | 'contract' | 'vehicle' | 'legal' | 'documents';
  companyId: string;
  recordId: string;
};

const customerReaders = new Set([
  'customers', 'customer', 'customer-details', 'customer-details-new', 'customer-details-split',
  'customer-count', 'crm-customers-optimized', 'express-customers', 'customers-for-matching',
  'customer-contracts', 'customer-contracts-new', 'customer-contracts-split',
]);
const contractReaders = new Set([
  'contracts', 'contract', 'contract-details', 'active-contracts', 'contracts-export',
  'customer-contracts', 'customer-contracts-new', 'customer-contracts-split',
  'lawsuit-contract-details',
]);
const legalReaders = new Set([
  'legal-cases', 'legal-case', 'legal-case-workflow', 'lawsuit-legal-case',
  'legal-case-litigation-profile', 'legal-case-formal-notices', 'legal-case-damage-costs',
  'legal-case-memo-snapshots', 'legal-case-evidence-proposals', 'legal-claim-projection',
  'legal-transfer-readiness', 'manual-legal-delinquency-queue', 'delinquent-customers',
  'legal-delinquency-manual-candidates', 'batch-filing-candidates',
  'contract-reminder-history', 'contract-traffic-violations',
]);
const documentReaders = new Set([
  'contract-documents', 'contract-document', 'contract-violation-evidence-documents',
  'legal-transfer-signed-contract-document', 'employee-signed-contract-documents',
  'pending-id-scan-count', 'customer-documents',
]);
const vehicleReaders = new Set(['vehicles', 'vehicle', 'vehicle-details', 'vehicle-plate-history']);

const companyAtTwo = new Set([
  'customer-details-new', 'customer-contracts-new', 'customer-contracts-split', 'contract-details',
  'lawsuit-contract-details', 'contract-document', 'contract-violation-evidence-documents',
  'legal-case-litigation-profile', 'legal-case-formal-notices', 'legal-case-damage-costs',
  'legal-case-memo-snapshots', 'legal-case-evidence-proposals', 'legal-claim-projection',
  'contract-reminder-history', 'contract-traffic-violations',
]);
const companyAtOne = new Set([
  'crm-customers-optimized', 'express-customers', 'customers-for-matching', 'contracts-export',
  'contract-documents', 'legal-transfer-readiness', 'legal-transfer-signed-contract-document',
  'employee-signed-contract-documents', 'manual-legal-delinquency-queue',
  'legal-delinquency-manual-candidates', 'batch-filing-candidates',
  'lawsuit-legal-case', 'legal-case-workflow', 'vehicle-plate-history',
]);
const customerDetails = new Set([
  'customer', 'customer-details', 'customer-details-new', 'customer-details-split',
  'customer-contracts', 'customer-contracts-new', 'customer-contracts-split',
]);

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

/** Support both legacy [[root], companyId, ...] keys and the newer flat keys. */
export function recordQueryMatches(query: Query, change: RecordChange): boolean {
  const key = query.queryKey;
  const first = key[0];
  const nested = Array.isArray(first);
  const root = String(Array.isArray(first) ? first[0] : first);
  const eligible = contractReaders.has(root) || legalReaders.has(root)
    || ((change.entity === 'customer' || change.entity === 'contract') && customerReaders.has(root))
    || ((change.entity === 'vehicle' || change.entity === 'contract') && vehicleReaders.has(root))
    || (change.entity === 'documents' && documentReaders.has(root));
  if (!eligible) return false;

  const data = object(query.state.data);
  const contract = object(data?.contract) || data;
  let scope: unknown = nested ? key[1]
    : companyAtTwo.has(root) ? key[2]
      : companyAtOne.has(root) ? key[1] : undefined;
  if (!scope) {
    const filter = key.map(object).find((entry) => entry?.companyId || entry?.company_id);
    scope = filter?.companyId || filter?.company_id || contract?.company_id;
  }
  // Flat list factories also use [root, companyId, ...], alongside [root, 'list', filters].
  if (!scope && ['customers', 'contracts', 'vehicles'].includes(root)
    && typeof key[1] === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key[1])) scope = key[1];
  if (typeof scope === 'string' && scope !== change.companyId) return false;

  if (change.entity === 'customer') {
    const detailId = customerDetails.has(root) ? key[nested ? 2 : 1]
      : root === 'customers' && key[1] === 'detail' ? key[2] : undefined;
    if (detailId && detailId !== change.recordId) return false;
    const customerId = contract?.customer_id || object(contract?.customer)?.id;
    if (typeof customerId === 'string' && customerId !== change.recordId) return false;
  }
  if (change.entity === 'vehicle') {
    const detailId = root === 'vehicle' || root === 'vehicle-details' ? key[nested ? 2 : 1]
      : root === 'vehicles' && key[1] === 'detail' ? key[2] : undefined;
    if (detailId && detailId !== change.recordId) return false;
    const vehicleId = contract?.vehicle_id || object(contract?.vehicle)?.id;
    if (typeof vehicleId === 'string' && vehicleId !== change.recordId) return false;
  }
  if (['contract', 'legal', 'documents'].includes(change.entity)) {
    if (root === 'pending-id-scan-count' && key[1] !== change.recordId) return false;
    const contractId = data?.contract_id || object(data?.contract)?.id
      || (root === 'contract-details' || root === 'contract' ? data?.id : undefined);
    if (typeof contractId === 'string' && contractId !== change.recordId) return false;
    if (companyAtTwo.has(root) && !root.startsWith('customer-') && root !== 'contract-details'
      && key[1] !== change.recordId) return false;
    if (['contract-documents', 'legal-transfer-readiness', 'legal-transfer-signed-contract-document', 'lawsuit-legal-case'].includes(root)
      && key[2] !== change.recordId) return false;
  }
  return true;
}

export async function refreshRecordReaders(client: QueryClient, change: RecordChange): Promise<void> {
  if (!change.companyId || !change.recordId) return;
  const predicate = (query: Query) => recordQueryMatches(query, change);
  // An older in-flight read must not overwrite data fetched after the save.
  await client.cancelQueries({ predicate });
  // Keep each reader's own shape and joins. Inactive pages refetch on their next mount.
  await client.invalidateQueries({ predicate });
}

type ChangeChannel = Pick<BroadcastChannel, 'postMessage' | 'close'> & {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};
const publishers = new WeakMap<QueryClient, (change: RecordChange) => void>();

export async function notifyRecordChange(client: QueryClient, change: RecordChange): Promise<void> {
  if (!change.companyId || !change.recordId) return;
  publishers.get(client)?.(change);
  await refreshRecordReaders(client, change);
}

function isRecordChange(value: unknown): value is RecordChange {
  const change = object(value);
  return Boolean(change && ['customer', 'contract', 'vehicle', 'legal', 'documents'].includes(String(change.entity))
    && typeof change.companyId === 'string' && change.companyId.length > 0
    && typeof change.recordId === 'string' && change.recordId.length > 0);
}

/** Send identifiers only; each tab re-reads through its own authenticated queries. */
export function subscribeToRecordChanges(
  client: QueryClient,
  companyId: string,
  createChannel: (name: string) => ChangeChannel | null = (name) => (
    typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
      ? new BroadcastChannel(name) : null
  ),
): () => void {
  let channel: ChangeChannel | null = null;
  try { channel = createChannel(`fleetify-record-changes-v1:${companyId}`); } catch { /* Local refresh still works. */ }
  const publish = (change: RecordChange) => {
    if (change.companyId !== companyId) return;
    try { channel?.postMessage({ entity: change.entity, companyId, recordId: change.recordId }); } catch { /* A closed tab must not fail a completed save. */ }
  };
  publishers.set(client, publish);
  if (channel) channel.onmessage = (event) => {
    if (!isRecordChange(event.data) || event.data.companyId !== companyId) return;
    // Do not re-broadcast received events: one save causes one refresh per tab.
    void refreshRecordReaders(client, event.data);
  };
  return () => {
    if (publishers.get(client) === publish) publishers.delete(client);
    if (channel) { channel.onmessage = null; channel.close(); }
  };
}
