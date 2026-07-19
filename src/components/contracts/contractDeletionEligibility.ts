const permanentlyDeletableContractStatuses = new Set([
  'draft',
  'cancelled',
  'expired',
  'completed',
  'closed',
  'terminated',
]);

export const canPermanentlyDeleteContract = (status?: string | null) =>
  permanentlyDeletableContractStatuses.has(String(status || '').toLowerCase());
