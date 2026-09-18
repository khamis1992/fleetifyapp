export interface FinancialReportRequestPolicy {
  timeoutMs?: number;
  disableRetry: boolean;
}

/** Policy for the exact reporting RPC path; query-string text cannot select it. */
export function getFinancialReportRequestPolicy(requestUrl: string): FinancialReportRequestPolicy {
  let pathname: string;
  try {
    const url = new URL(requestUrl, 'https://financial-reports.invalid');
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { disableRetry: false };
    pathname = url.pathname;
  } catch {
    return { disableRetry: false };
  }
  const match = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(pathname);
  if (!match) return { disableRetry: false };
  const command = match[1];
  const longCalculation = /^(?:get|save|approve)_(?:professional_balance_sheet|financial_statement_package)_v1$/.test(command);
  const mutation = /^(?:(?:save|approve|void)_(?:professional_balance_sheet|financial_statement_package)_v1|(?:lock|unlock)_financial_reporting_period_v1)$/.test(command);
  return longCalculation ? { timeoutMs: 60000, disableRetry: mutation } : { disableRetry: mutation };
}
