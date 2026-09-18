export const customerSections = [
  'overview', 'info', 'contracts', 'vehicles', 'invoices', 'payments', 'violations', 'documents', 'activity',
] as const;

export type CustomerSection = typeof customerSections[number];

/** Keep bookmarks from both previous customer layouts working. */
export function resolveCustomerSection(value: string | null): CustomerSection {
  if (customerSections.includes(value as CustomerSection)) return value as CustomerSection;
  const aliases: Record<string, CustomerSection> = {
    financial: 'invoices', records: 'info', personal: 'info', phones: 'info', notes: 'activity',
  };
  return aliases[value || ''] || 'overview';
}
