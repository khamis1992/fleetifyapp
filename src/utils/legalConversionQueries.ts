import type { QueryClient } from '@tanstack/react-query';

/** Refresh even after uncertain outcomes; never replay a legal mutation. */
export async function refreshLegalConversionQueries(client: QueryClient): Promise<boolean> {
  const results=await Promise.allSettled([
    'contract-details','contracts','legal-cases','legal-case-stats','existing-legal-case',
    'vehicles','signed-lease-validation','late-payment-customers','delinquent-customers',
    'manual-legal-delinquency-queue','opened-legal-cases-count',
    'legal-delinquency-rent-candidates','legal-delinquency-traffic-candidates',
  ].map(async key=>{await client.invalidateQueries({queryKey:[key]},{throwOnError:true});}));
  return results.every(result=>result.status==='fulfilled');
}
