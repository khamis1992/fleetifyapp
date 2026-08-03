/**
 * A customer-level payment action may be scoped only when every displayed
 * outstanding item belongs to the same contract. Multiple contracts must stay
 * unscoped so the dialog does not hide the customer's other invoices.
 */
export const resolveQuickPaymentContractScope = (
  contractIds: Iterable<string | null | undefined>,
): string | undefined => {
  const values = Array.from(contractIds);
  if (values.length === 0 || values.some((id) => !id)) return undefined;

  const uniqueContractIds = new Set(
    values.filter((id): id is string => Boolean(id)),
  );

  return uniqueContractIds.size === 1 ? uniqueContractIds.values().next().value : undefined;
};
