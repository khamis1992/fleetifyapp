import type { InsolvencyPortfolio, PortfolioDocument, PortfolioRow } from '@/types/insolvencyPortfolio';

export function portfolioNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))) throw new Error('قيمة مالية غير صالحة في سجل الحافظة');
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error('قيمة مالية غير صالحة في سجل الحافظة');
  return number;
}

export function validatePortfolioRows(rows: PortfolioRow[], companyId: string, scopeKey = 'company_id') {
  const ids = new Set<string>();
  for (const row of rows) {
    const owner = scopeKey.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as PortfolioRow)[key] : undefined, row);
    if (owner !== companyId) throw new Error('تعذر إثبات نطاق الشركة لسجل في الحافظة');
    if (typeof row.id !== 'string' || ids.has(row.id)) throw new Error('سجل مكرر أو بلا معرف؛ أعد تحميل الحافظة');
    ids.add(row.id);
    if (scopeKey === 'journal_entries.company_id' && (row.chart_of_accounts as PortfolioRow | null)?.company_id !== companyId) {
      throw new Error('حساب القيد لا يخص الشركة المحددة');
    }
  }
}

export function portfolioCsv(rows: PortfolioRow[]): string {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  if (!columns.length) return '\uFEFFid\r\n';
  const cell = (value: unknown) => {
    let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    // Spreadsheet formula injection is possible in names, descriptions and notes.
    if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [columns.map(cell).join(','), ...rows.map(row => columns.map(key => cell(row[key])).join(','))].join('\r\n');
}

export function storageDocumentLocation(reference: string, allowedBuckets: string[], storageUrl: string, companyId?: string, verifiedOwnerIds: string[] = []): { bucket: string; path: string }[] {
  let path = reference.trim();
  if (!path) throw new Error('المستند بلا مرجع ملف');
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    if (url.origin !== new URL(storageUrl).origin) throw new Error('مرجع المستند خارج مخزن النظام؛ يحتاج إرفاق نسخة');
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match || !allowedBuckets.includes(match[1])) throw new Error('مخزن المستند غير معتمد لهذا السجل');
    path = decodeURIComponent(match[2]);
    validateStoragePath(path); validateDocumentOwner(path, companyId, verifiedOwnerIds);
    return [{ bucket: match[1], path }];
  }
  validateStoragePath(path); validateDocumentOwner(path, companyId, verifiedOwnerIds);
  return allowedBuckets.map(bucket => ({ bucket, path }));
}

function validateDocumentOwner(path: string, companyId?: string, verifiedOwnerIds: string[] = []) {
  if (!companyId) return;
  const segments = path.split('/');
  const first = segments[0];
  const known = first === companyId || verifiedOwnerIds.includes(first)
    || (first === 'legal-packages' && segments[1] === companyId && verifiedOwnerIds.includes(segments[2]))
    || (first === 'signed-agreements' && segments[1] === companyId)
    || (['vehicle-documents', 'customer-documents', 'customer_documents'].includes(first) && verifiedOwnerIds.includes(segments[1]));
  if (!known) throw new Error('مسار الملف لا يثبت ملكية الشركة أو المالك المرتبط؛ يحتاج إعادة إرفاق نسخة');
}

function validateStoragePath(path: string) {
  if (/^[a-z]+:/i.test(path) || path.startsWith('/') || path.includes('\\') || /%2e|%2f|%5c|%00/i.test(path) || path.split('/').some(part => part === '..' || part === '.' || !part) || [...path].some(character => character.charCodeAt(0) < 32)) {
    throw new Error('مسار المستند غير صالح');
  }
}

export function portfolioDocumentPath(doc: PortfolioDocument, extension?: string): string {
  const safe = (value: string) => value.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^\.+/, '').slice(0, 100) || 'document';
  const nameExtension = doc.name.match(/\.(?:[a-z][a-z0-9]{0,9}|7z)$/i)?.[0] || '';
  let referenceExtension = '';
  if (!extension && !nameExtension && doc.reference) {
    try {
      // Signed URL tokens and query values never determine the downloaded file type.
      const path = /^https?:\/\//i.test(doc.reference) ? new URL(doc.reference).pathname : doc.reference.split(/[?#]/, 1)[0];
      referenceExtension = decodeURIComponent(path).match(/\.(pdf|png|jpe?g|gif|webp|bmp|tiff?|heic|svg|xlsx?|docx?|pptx?|csv|txt|json|html?|zip|rar|7z)$/i)?.[0].toLowerCase() || '';
    } catch { /* A malformed reference cannot contribute an archive extension. */ }
  }
  const suffix = extension || nameExtension || referenceExtension;
  // Preserve an existing extension even when a long descriptive name is truncated.
  const name = !extension && nameExtension ? doc.name.slice(0, -nameExtension.length) : doc.name;
  return `documents/${safe(doc.source)}/${safe(doc.id)}-${safe(name)}${suffix}`;
}

export function portfolioSummary(portfolio: InsolvencyPortfolio) {
  const rows = (key: string) => portfolio.registers.find(register => register.key === key)?.rows || [];
  const profile = rows('companies')[0];
  const currency = String(profile?.currency || 'QAR');
  let receivableCents = 0, creditCents = 0, missingInvoiceBalances = 0;
  const debtors = new Set<string>();
  for (const invoice of rows('invoices')) {
    if (!['sales', 'service'].includes(String(invoice.invoice_type)) || invoice.status === 'cancelled' || invoice.payment_status === 'cancelled') continue;
    const amount = portfolioNumber(invoice.balance_due);
    if (amount == null) { missingInvoiceBalances++; continue; }
    const cents = Math.round(amount * 100);
    if (cents > 0) { receivableCents += cents; if (typeof invoice.customer_id === 'string') debtors.add(invoice.customer_id); }
    if (cents < 0) creditCents += cents;
  }
  const lines = rows('journal_entry_lines');
  const debitCents = lines.reduce((total, line) => total + Math.round((portfolioNumber(line.debit_amount) ?? 0) * 100), 0);
  const creditLedgerCents = lines.reduce((total, line) => total + Math.round((portfolioNumber(line.credit_amount) ?? 0) * 100), 0);
  return {
    companyName: String(profile?.name_ar || profile?.name || portfolio.companyId),
    currency,
    vehicles: rows('vehicles').length,
    stolen: rows('vehicles').filter(vehicle => vehicle.status === 'stolen').length,
    vehiclesWithoutBookValue: rows('vehicles').filter(vehicle => portfolioNumber(vehicle.book_value) == null).length,
    debtors: debtors.size,
    receivables: receivableCents / 100,
    customerCredits: creditCents / 100,
    missingInvoiceBalances,
    casesAgainstCompany: rows('legal_cases').filter(row => row.case_direction === 'filed_against_us').length,
    ledgerDebits: debitCents / 100,
    ledgerCredits: creditLedgerCents / 100,
    ledgerBalanced: debitCents === creditLedgerCents,
    approvedStatementCount: portfolio.savedStatements.filter(row => row.status === 'approved').length,
  };
}

export function portfolioLedgerRows(portfolio: InsolvencyPortfolio): PortfolioRow[] {
  const balances = new Map<string, PortfolioRow>();
  for (const line of portfolio.registers.find(register => register.key === 'journal_entry_lines')?.rows || []) {
    const account = line.chart_of_accounts as PortfolioRow;
    const key = String(line.account_id);
    const row = balances.get(key) || { account_id: key, account_code: account.account_code, account_name: account.account_name, account_name_ar: account.account_name_ar, account_type: account.account_type, debit_cents: 0, credit_cents: 0 };
    row.debit_cents = Number(row.debit_cents) + Math.round((portfolioNumber(line.debit_amount) ?? 0) * 100);
    row.credit_cents = Number(row.credit_cents) + Math.round((portfolioNumber(line.credit_amount) ?? 0) * 100);
    balances.set(key, row);
  }
  return [...balances.values()].map(({ debit_cents, credit_cents, ...row }) => ({ ...row, debits: Number(debit_cents) / 100, credits: Number(credit_cents) / 100, debit_net: (Number(debit_cents) - Number(credit_cents)) / 100 }));
}
