/** Quote a PostgREST filter value so punctuation stays part of the search text. */
export const contractSearchPattern = (text: string) =>
  `"%${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;

export function contractRegisterSearchFilter(text: string, customerIds: string[], vehicleIds: string[]) {
  const pattern = contractSearchPattern(text);
  return [
    ...['contract_number', 'description', 'terms', 'license_plate'].map(column => `${column}.ilike.${pattern}`),
    ...(customerIds.length ? [`customer_id.in.(${customerIds.join(',')})`] : []),
    ...(vehicleIds.length ? [`vehicle_id.in.(${vehicleIds.join(',')})`] : []),
  ].join(',');
}
