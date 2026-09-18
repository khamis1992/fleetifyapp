import type { BalanceSheetExportOptions, BalanceSheetLocale, SavedBalanceSheet } from '@/types/balanceSheet';
import { sanitizeDocumentHtmlToFragment } from '@/utils/htmlSanitizer';
import { formatBalanceSheetMoney, getBalanceSheetCheckMessage, getBalanceSheetRows } from './balanceSheetPresentation';

const copy = {
  ar: {
    title: 'قائمة المركز المالي', subtitle: 'الميزانية العمومية', asOf: 'كما في', comparison: 'للمقارنة كما في',
    account: 'البيان', code: 'رمز الحساب', currency: 'عملة العرض', register: 'السجل التجاري',
    draft: 'مسودة للمراجعة — غير معتمدة', approved: 'معتمدة داخلياً', voided: 'نسخة ملغاة — غير صالحة للتقديم',
    approvalBasis: 'الاعتماد داخل الشركة لا يمثل رأي تدقيق أو تصديقاً من محاسب قانوني خارجي.',
    basis: 'أساس الإعداد', basisText: 'تعرض القائمة أرصدة القيود المرحلة تراكمياً حتى تاريخ كل عمود، دون الاقتصار على حركة السنة. تظهر الأرصدة العكسية بإشارتها الأصلية، وتدخل قيود العكس وفق تاريخها وحالتها المحاسبية.',
    resultText: 'نتيجة الأعمال المتراكمة غير المقفلة هي الرصيد المتبقي للإيرادات ناقص المصروفات بعد أثر قيود الإقفال. قد تشمل فترات سابقة، ولا تمثل بالضرورة صافي ربح السنة وحدها. لا يعاد احتساب المبالغ التي أقفلت بالفعل إلى حقوق الملكية.',
    reviewText: 'التوازن الحسابي لا يثبت اكتمال التسجيل. يلزم مطابقة الأصول والالتزامات ورأس المال والمصروفات مع المستندات والسجلات المساندة عند المراجعة.',
    checks: 'ملاحظات فحص البيانات', noChecks: 'لم يظهر الفحص الآلي ملاحظات؛ تبقى المراجعة المحاسبية مطلوبة.',
    prepared: 'أعد النسخة', reviewed: 'اعتمد داخلياً', generated: 'وقت استخراج الأرصدة', saved: 'وقت حفظ النسخة', approvedAt: 'وقت الاعتماد الداخلي',
    id: 'رقم النسخة', fingerprint: 'بصمة البيانات', preview: 'معاينة غير محفوظة', notes: 'ملاحظات الإعداد', reviewNotes: 'ملاحظات المراجع',
    page: 'صفحة', of: 'من', continuation: 'تابع', statementSheet: 'المركز المالي', metadataSheet: 'بيانات الإصدار', checksSheet: 'فحص البيانات',
    accountsSheet: 'تفاصيل الحسابات', status: 'الحالة', company: 'الشركة', companyId: 'معرف الشركة', address: 'العنوان',
    severity: 'المستوى', checkCode: 'رمز الفحص', count: 'العدد', date: 'التاريخ', message: 'البيان',
    type: 'نوع الحساب', classification: 'التصنيف', debit: 'مدين تراكمي', credit: 'دائن تراكمي', balance: 'الرصيد',
    voidReason: 'سبب الإلغاء', internal: 'المراجعة الداخلية', unknownCurrency: 'العملة غير محددة',
  },
  en: {
    title: 'Statement of financial position', subtitle: 'Balance sheet', asOf: 'As at', comparison: 'Comparative as at',
    account: 'Description', code: 'Account code', currency: 'Presentation currency', register: 'Commercial registration',
    draft: 'DRAFT — not approved', approved: 'Internally approved', voided: 'VOIDED — not valid for submission',
    approvalBasis: 'Company approval is not an audit opinion or certification by an external auditor.',
    basis: 'Basis of preparation', basisText: 'Balances include posted journal entries cumulatively up to the date of each column, rather than only annual movements. Contra balances retain their original sign. Reversal entries are included according to their accounting date and status.',
    resultText: 'Accumulated unclosed earnings are the remaining revenue less expense balances after closing entries. They may include earlier periods and are not necessarily the current year profit alone. Amounts already closed into equity are not counted again.',
    reviewText: 'Arithmetic balance does not establish completeness. Assets, liabilities, capital and expenses require reconciliation to supporting records during accounting review.',
    checks: 'Data checks', noChecks: 'Automated checks returned no observations; accounting review is still required.',
    prepared: 'Prepared by', reviewed: 'Internally approved by', generated: 'Ledger extracted at', saved: 'Snapshot saved at', approvedAt: 'Internal approval date',
    id: 'Snapshot ID', fingerprint: 'Source fingerprint', preview: 'Unsaved preview', notes: 'Preparation notes', reviewNotes: 'Reviewer notes',
    page: 'Page', of: 'of', continuation: 'continued', statementSheet: 'Financial position', metadataSheet: 'Issue metadata', checksSheet: 'Data checks',
    accountsSheet: 'Account details', status: 'Status', company: 'Company', companyId: 'Company ID', address: 'Address',
    severity: 'Severity', checkCode: 'Check code', count: 'Count', date: 'Date', message: 'Description',
    type: 'Account type', classification: 'Classification', debit: 'Cumulative debit', credit: 'Cumulative credit', balance: 'Balance',
    voidReason: 'Void reason', internal: 'Internal review', unknownCurrency: 'Currency unspecified',
  },
} as const;

const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] || character));

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** An export cannot promote live or mismatched data to the status of a saved snapshot. */
export function getMatchingBalanceSheetSnapshot(options: BalanceSheetExportOptions): SavedBalanceSheet | null {
  const { snapshot, report } = options;
  if (!snapshot || !snapshot.id?.trim() || !snapshot.created_by?.trim()
    || !Number.isFinite(Date.parse(snapshot.created_at))
    || snapshot.company_id !== report.company.id || snapshot.as_of_date !== report.asOfDate
    || snapshot.comparison_date !== report.comparisonDate || snapshot.source_fingerprint !== report.fingerprint
    || !snapshot.source_fingerprint?.trim()) return null;
  // Permissions describe the reader, not the financial content of a saved report.
  const { permissions: _livePermissions, ...liveContent } = report;
  const { permissions: _savedPermissions, ...savedContent } = snapshot.payload || {};
  return canonical(liveContent) === canonical(savedContent) ? snapshot : null;
}

export function getBalanceSheetExportStatus(options: BalanceSheetExportOptions): 'draft' | 'approved' | 'voided' {
  const snapshot = getMatchingBalanceSheetSnapshot(options);
  if (snapshot?.status === 'voided') return 'voided';
  if (snapshot?.status === 'approved' && snapshot.approved_by?.trim()
    && snapshot.approved_by !== snapshot.created_by
    && snapshot.approved_at && Number.isFinite(Date.parse(snapshot.approved_at))
    && Date.parse(snapshot.approved_at) >= Date.parse(snapshot.created_at)) return 'approved';
  return 'draft';
}

function exportContext(options: BalanceSheetExportOptions) {
  const { report, locale } = options;
  if (!report.company.id?.trim() || !(report.company.nameAr || report.company.name)?.trim()
    || !report.fingerprint?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(report.asOfDate)) throw new Error('Incomplete balance sheet identity or date');
  if (Boolean(report.comparisonDate) !== Boolean(report.comparison)) throw new Error('Incomplete balance sheet comparison');
  const rows = getBalanceSheetRows(report, locale);
  if (rows.some(row => [row.amount, row.comparisonAmount].some(value => value !== null && !Number.isFinite(value)))) {
    throw new Error('Invalid balance sheet amount');
  }
  const snapshot = getMatchingBalanceSheetSnapshot(options);
  const status = getBalanceSheetExportStatus(options);
  const text = copy[locale];
  const name = locale === 'ar' ? report.company.nameAr || report.company.name : report.company.name || report.company.nameAr;
  const metadata: [string, string][] = [
    [text.company, name || ''], [text.companyId, report.company.id],
    [text.register, report.company.commercialRegister || '—'], [text.address, report.company.address || '—'],
    [text.currency, report.company.currency || text.unknownCurrency], [text.asOf, report.asOfDate],
    ...(report.comparisonDate ? [[text.comparison, report.comparisonDate] as [string, string]] : []),
    [text.status, text[status]], [text.id, snapshot?.id || text.preview],
    [text.fingerprint, report.fingerprint], [text.generated, report.generatedAt],
    [text.prepared, snapshot ? snapshot.created_by_name || snapshot.created_by : '—'],
    [text.saved, snapshot?.created_at || '—'],
    [text.reviewed, status === 'approved' ? snapshot?.approved_by_name || snapshot?.approved_by || '—' : '—'],
    [text.approvedAt, status === 'approved' ? snapshot?.approved_at || '—' : '—'],
    [text.internal, text.approvalBasis],
  ];
  return { report, locale, rows, snapshot, status, text, name, metadata };
}

const styles = `
@page{size:A4 portrait;margin:0}
.balance-sheet-document{font-family:Arial,Tahoma,sans-serif;color:#182b3a;font-size:12px;line-height:1.6;background:#fff}
.balance-sheet-document[dir="ltr"]{direction:ltr;text-align:left}
.balance-sheet-document[dir="rtl"]{direction:rtl;text-align:right}
.balance-sheet-document *{box-sizing:border-box;direction:inherit;text-align:inherit}
.balance-sheet-document [dir="ltr"]{direction:ltr}
.balance-sheet-document [dir="rtl"]{direction:rtl}
.balance-sheet-document .bs-page{width:210mm;height:297mm;padding:36px 40px 28px;background:#fff;display:flex;flex-direction:column;gap:15px;break-after:page;page-break-after:always;overflow:visible}
.balance-sheet-document .bs-page:last-child{break-after:auto;page-break-after:auto}
.balance-sheet-document .bs-source{width:794px;padding:36px 40px;background:#fff}
.balance-sheet-document .bs-header{flex:none;border-bottom:2px solid #203d50;padding-bottom:12px;overflow-wrap:anywhere}
.balance-sheet-document .bs-company{font-size:20px;font-weight:700;color:#18384d;line-height:1.4;margin:0 0 5px}
.balance-sheet-document h1{font-size:22px;line-height:1.3;margin:12px 0 4px}
.balance-sheet-document .bs-subtitle{font-size:12px;color:#526473}
.balance-sheet-document .bs-identity{font-size:10px;color:#4b5d6b;white-space:pre-wrap;overflow-wrap:anywhere}
.balance-sheet-document .bs-dates{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:12px;margin-top:8px}
.balance-sheet-document .bs-status{display:inline-block;margin-top:8px;padding:3px 10px;font-weight:700;border:1px solid #7b5d29;color:#6b481c;background:#fff9ec}
.balance-sheet-document .bs-status-approved{border-color:#386b55;color:#23513f;background:#f0f7f3}
.balance-sheet-document .bs-status-voided{border-color:#a63333;color:#922929;background:#fff2f2}
.balance-sheet-document .bs-content{flex:1;min-height:0;overflow:visible}
.balance-sheet-document table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;line-height:1.55}
.balance-sheet-document thead{display:table-header-group}
.balance-sheet-document th{background:#203d50;color:#fff;padding:8px 7px;font-size:10px;text-align:start;border:1px solid #203d50}
.balance-sheet-document td{padding:6px 7px;border-bottom:1px solid #dce3e8;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}
.balance-sheet-document .bs-money{direction:ltr;text-align:end;font-variant-numeric:tabular-nums;white-space:normal}
.balance-sheet-document .bs-code{direction:ltr;font-size:10px;color:#526473}
.balance-sheet-document tr{break-inside:avoid;page-break-inside:avoid}
.balance-sheet-document .bs-row-section{background:#eaf0f4;font-weight:700;color:#203d50}
.balance-sheet-document .bs-row-subtotal{background:#f5f8fa;font-weight:700}
.balance-sheet-document .bs-row-total{background:#e3edf3;font-weight:700;border-top:2px solid #203d50}
.balance-sheet-document .bs-row-result{font-weight:700}
.balance-sheet-document .bs-notes{margin-top:18px}
.balance-sheet-document .bs-note{font-size:11px;line-height:1.75;margin:0 0 9px;white-space:pre-wrap;overflow-wrap:anywhere}
.balance-sheet-document h2.bs-note{font-size:14px;margin-top:14px;border-bottom:1px solid #dce3e8;padding-bottom:5px}
.balance-sheet-document .bs-check-error{color:#922929}
.balance-sheet-document .bs-meta-note{font-size:10px;line-height:1.6}
.balance-sheet-document .bs-footer{flex:none;border-top:1px solid #9caeba;padding-top:7px;font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.balance-sheet-document .bs-footer-top{display:flex;justify-content:space-between;gap:12px;font-weight:700}
.balance-sheet-document .bs-fingerprint{direction:ltr;unicode-bidi:embed;font-family:monospace;font-size:9px}
@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}.balance-sheet-document{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

/** Safe standalone HTML for preview and inspection; actual export measures it into A4 pages. */
export function buildBalanceSheetDocument(options: BalanceSheetExportOptions): string {
  const { report, rows, snapshot, status, text, name, metadata } = exportContext(options);
  const comparison = report.comparisonDate !== null;
  const money = (amount: number | null) => amount === null ? '' : escape(formatBalanceSheetMoney(amount, report.company.currency, options.locale));
  const header = `<header class="bs-header">
    <div class="bs-company">${escape(name)}</div>
    <div class="bs-identity">${escape(text.register)}: ${escape(report.company.commercialRegister || '—')}${report.company.address ? `<br>${escape(report.company.address)}` : ''}</div>
    <h1>${escape(text.title)}</h1><div class="bs-subtitle">${escape(text.subtitle)} · ${escape(text.currency)}: ${escape(report.company.currency || text.unknownCurrency)}</div>
    <div class="bs-dates"><span>${escape(text.asOf)} <b dir="ltr">${escape(report.asOfDate)}</b></span>${comparison ? `<span>${escape(text.comparison)} <b dir="ltr">${escape(report.comparisonDate)}</b></span>` : ''}</div>
    <div class="bs-status bs-status-${status}">${escape(text[status])}</div>
  </header>`;
  const table = `<table class="bs-table"><colgroup><col style="width:13%"><col style="width:${comparison ? 43 : 61}%"><col style="width:${comparison ? 22 : 26}%">${comparison ? '<col style="width:22%">' : ''}</colgroup>
    <thead><tr><th>${escape(text.code)}</th><th>${escape(text.account)}</th><th>${escape(text.asOf)}<br>${escape(report.asOfDate)}</th>${comparison ? `<th>${escape(text.comparison)}<br>${escape(report.comparisonDate)}</th>` : ''}</tr></thead>
    <tbody>${rows.map(row => `<tr class="bs-row-${row.kind}"><td class="bs-code">${escape(row.code || '')}</td><td class="bs-label">${escape(row.label)}</td><td class="bs-money">${money(row.amount)}</td>${comparison ? `<td class="bs-money">${money(row.comparisonAmount)}</td>` : ''}</tr>`).join('')}</tbody></table>`;
  const note = (value: string, className = '') => `<p class="bs-note ${className}">${escape(value)}</p>`;
  const notes = `<section class="bs-notes"><h2 class="bs-note">${escape(text.basis)}</h2>
    ${note(text.basisText)}${note(text.resultText)}${note(text.reviewText)}${note(text.approvalBasis)}
    <h2 class="bs-note">${escape(text.checks)}</h2>
    ${report.checks.length ? report.checks.map(check => note(getBalanceSheetCheckMessage(check, options.locale), `bs-check-${escape(check.severity)}`)).join('') : note(text.noChecks)}
    ${snapshot?.notes ? `<h2 class="bs-note">${escape(text.notes)}</h2>${note(snapshot.notes)}` : ''}
    ${snapshot?.review_notes ? `<h2 class="bs-note">${escape(text.reviewNotes)}</h2>${note(snapshot.review_notes)}` : ''}
    ${status === 'voided' && snapshot?.void_reason ? note(`${text.voidReason}: ${snapshot.void_reason}`) : ''}
    <h2 class="bs-note">${escape(text.metadataSheet)}</h2>
    ${metadata.filter(([label]) => !([text.company, text.address, text.register, text.internal] as readonly string[]).includes(label)).map(([label, value]) => note(`${label}: ${value}`, 'bs-meta-note')).join('')}
  </section>`;
  const footer = `<footer class="bs-footer"><div class="bs-footer-top"><span>${escape(text[status])}</span><span class="bs-page-number">${escape(text.page)} 1 ${escape(text.of)} 1</span></div>
    <div>${escape(text.id)}: ${escape(snapshot?.id || text.preview)}</div><div>${escape(text.fingerprint)}: <span class="bs-fingerprint">${escape(report.fingerprint)}</span></div>
    <div>${escape(text.approvalBasis)}</div></footer>`;
  return `<!doctype html><html lang="${options.locale}" dir="${options.locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escape(text.title)} — ${escape(report.asOfDate)}</title><style>${styles}</style></head>
    <body><div class="balance-sheet-document" dir="${options.locale === 'ar' ? 'rtl' : 'ltr'}"><div class="bs-source">${header}<main class="bs-content">${table}${notes}</main>${footer}</div></div></body></html>`;
}

export interface RenderedBalanceSheetPages {
  element: HTMLElement;
  pages: HTMLElement[];
  dispose: () => void;
}

/** Measured pagination keeps normal rows intact; an exceptional long label is continued, never clipped. */
export async function renderBalanceSheetPages(options: BalanceSheetExportOptions): Promise<RenderedBalanceSheetPages> {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:white;z-index:-1';
  // Document sanitization intentionally returns the body fragment and can discard
  // head styles. Install our static authored CSS separately before measuring pages;
  // company/account/note content still passes through the document sanitizer.
  const layoutStyles = document.createElement('style');
  layoutStyles.className = 'bs-layout-styles';
  layoutStyles.textContent = styles;
  host.replaceChildren(layoutStyles, sanitizeDocumentHtmlToFragment(buildBalanceSheetDocument(options)));
  document.body.appendChild(host);
  try {
    await document.fonts?.ready;
    const root = host.querySelector<HTMLElement>('.balance-sheet-document')!;
    const source = root.querySelector<HTMLElement>('.bs-source')!;
    const header = source.querySelector<HTMLElement>('.bs-header')!;
    const footer = source.querySelector<HTMLElement>('.bs-footer')!;
    const sourceTable = source.querySelector<HTMLTableElement>('.bs-table')!;
    const originalRows = Array.from(sourceTable.tBodies[0].rows);
    const notes = Array.from(source.querySelectorAll<HTMLElement>('.bs-note'));
    const pages: HTMLElement[] = [];
    let body = document.createElement('main');
    let table: HTMLTableElement | null = null;
    const newPage = () => {
      const page = document.createElement('section');
      page.className = 'bs-page';
      page.appendChild(header.cloneNode(true));
      body = document.createElement('main'); body.className = 'bs-content'; page.appendChild(body);
      page.appendChild(footer.cloneNode(true)); root.appendChild(page); pages.push(page); table = null;
      if (body.clientHeight < 120) throw new Error('Company identity is too long for an A4 report header');
    };
    const overflow = () => body.scrollHeight > body.clientHeight + 1;
    const ensureTable = () => {
      if (!table) {
        table = sourceTable.cloneNode(false) as HTMLTableElement;
        table.appendChild(sourceTable.querySelector('colgroup')!.cloneNode(true));
        table.appendChild(sourceTable.tHead!.cloneNode(true));
        table.appendChild(document.createElement('tbody')); body.appendChild(table);
      }
      return table.tBodies[0];
    };
    const hasRows = () => Boolean(table?.tBodies[0].rows.length);
    const continued = options.locale === 'ar' ? ' (تابع)' : ' (continued)';
    newPage();

    const addRow = (original: HTMLTableRowElement) => {
      let row = original.cloneNode(true) as HTMLTableRowElement;
      ensureTable().appendChild(row);
      if (!overflow()) return;
      row.remove();
      if (hasRows()) newPage();
      ensureTable().appendChild(row);
      if (!overflow()) return;
      row.remove();
      let remaining = Array.from(row.querySelector('.bs-label')?.textContent || '');
      let continuation = false;
      while (remaining.length) {
        row = original.cloneNode(true) as HTMLTableRowElement;
        const label = row.querySelector<HTMLElement>('.bs-label')!;
        if (continuation) row.querySelector('.bs-code')!.textContent = '';
        label.textContent = remaining.join('') + (continuation ? continued : '');
        ensureTable().appendChild(row);
        if (!overflow()) return;
        row.querySelectorAll('.bs-money').forEach(cell => { cell.textContent = ''; });
        let low = 0, high = remaining.length - 1;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          label.textContent = remaining.slice(0, middle).join('') + continued;
          if (overflow()) high = middle - 1; else low = middle;
        }
        if (low === 0) throw new Error('Unable to fit account details on an A4 page');
        // Keep whitespace boundaries where available without losing any text.
        const prefix = remaining.slice(0, low).join('');
        const boundary = prefix.lastIndexOf(' ');
        const take = boundary > low / 2 ? Array.from(prefix.slice(0, boundary + 1)).length : low;
        label.textContent = remaining.slice(0, take).join('') + continued;
        remaining = remaining.slice(take); continuation = true; newPage();
      }
    };

    // Keep a section heading with its first following row when they fit on a fresh page.
    for (let index = 0; index < originalRows.length; index++) {
      const row = originalRows[index];
      if (row.classList.contains('bs-row-section') && hasRows()) {
        const group: HTMLTableRowElement[] = [];
        let next = index;
        do { group.push(originalRows[next++].cloneNode(true) as HTMLTableRowElement); }
        while (next < originalRows.length && originalRows[next - 1].classList.contains('bs-row-section'));
        group.forEach(item => ensureTable().appendChild(item));
        const needsPage = overflow(); group.forEach(item => item.remove());
        if (needsPage) newPage();
      }
      addRow(row);
    }

    for (const original of notes) {
      let remaining = Array.from(original.textContent || '');
      if (!remaining.length) continue;
      let continuation = false;
      while (remaining.length) {
        const paragraph = original.cloneNode(false) as HTMLElement;
        paragraph.textContent = remaining.join('') + (continuation ? continued : ''); body.appendChild(paragraph);
        if (!overflow()) break;
        paragraph.remove();
        if (body.children.length) newPage();
        body.appendChild(paragraph);
        if (!overflow()) break;
        let low = 0, high = remaining.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          paragraph.textContent = remaining.slice(0, middle).join('') + continued;
          if (overflow()) high = middle - 1; else low = middle;
        }
        if (low === 0) throw new Error('Unable to fit report notes on an A4 page');
        const prefix = remaining.slice(0, low).join('');
        const boundary = prefix.lastIndexOf(' ');
        const take = boundary > low / 2 ? Array.from(prefix.slice(0, boundary + 1)).length : low;
        paragraph.textContent = remaining.slice(0, take).join('') + continued;
        remaining = remaining.slice(take); continuation = true; newPage();
      }
    }
    source.remove();
    pages.forEach((page, index) => {
      page.querySelector('.bs-page-number')!.textContent = `${copy[options.locale].page} ${index + 1} ${copy[options.locale].of} ${pages.length}`;
      const content = page.querySelector<HTMLElement>('.bs-content')!;
      if (content.scrollHeight > content.clientHeight + 1) throw new Error('Balance sheet page overflow');
    });
    return { element: host, pages, dispose: () => host.remove() };
  } catch (error) { host.remove(); throw error; }
}

function fileName(options: BalanceSheetExportOptions, extension: string) {
  const fingerprint = options.report.fingerprint.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12);
  return `balance-sheet_${options.report.asOfDate}_${getBalanceSheetExportStatus(options)}_${fingerprint}.${extension}`;
}

export async function exportBalanceSheetPDF(options: BalanceSheetExportOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const rendered = await renderBalanceSheetPages(options);
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.setProperties({ title: copy[options.locale].title, subject: options.report.asOfDate, author: options.report.company.nameAr || options.report.company.name });
    for (let index = 0; index < rendered.pages.length; index++) {
      const canvas = await html2canvas(rendered.pages[index], { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false });
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
    pdf.save(fileName(options, 'pdf'));
  } finally { rendered.dispose(); }
}

/** Native print uses the same measured pages, preserving selectable Arabic text. */
export async function printBalanceSheet(options: BalanceSheetExportOptions): Promise<void> {
  const rendered = await renderBalanceSheetPages(options);
  const frame = document.createElement('iframe');
  frame.title = copy[options.locale].title;
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
  document.body.appendChild(frame);
  try {
    const target = frame.contentDocument;
    if (!target || !frame.contentWindow) throw new Error('Unable to open the print document');
    target.documentElement.lang = options.locale;
    target.documentElement.dir = options.locale === 'ar' ? 'rtl' : 'ltr';
    target.title = fileName(options, 'pdf');
    const style = target.createElement('style'); style.textContent = styles; target.head.appendChild(style);
    const root = target.createElement('div'); root.className = 'balance-sheet-document'; root.dir = target.documentElement.dir;
    rendered.pages.forEach(page => root.appendChild(target.importNode(page, true))); target.body.replaceChildren(root);
    await target.fonts?.ready;
    // Keep the iframe alive until printing has finished; removing it early produces blank previews.
    const cleanup = () => frame.remove();
    frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
    frame.contentWindow.focus(); frame.contentWindow.print();
    // Browsers without afterprint still release the temporary document eventually.
    window.setTimeout(cleanup, 300_000);
  } catch (error) { frame.remove(); throw error; }
  finally { rendered.dispose(); }
}

/** ExcelJS stores these as strings; escaping also protects later CSV conversions. */
export function safeBalanceSheetSpreadsheetText(value: unknown): string {
  const text = String(value ?? '');
  return /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text;
}

export async function buildBalanceSheetWorkbook(options: BalanceSheetExportOptions) {
  const { default: ExcelJS } = await import('exceljs');
  const { report, rows, metadata, snapshot, status, text, name } = exportContext(options);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = name || ''; workbook.created = new Date(report.generatedAt);
  const comparison = report.comparisonDate !== null;
  const numberFormat = '#,##0.00;[Red](#,##0.00);0.00';
  const setText = (value: string) => safeBalanceSheetSpreadsheetText(value);
  const sheet = workbook.addWorksheet(text.statementSheet, {
    views: [{ rightToLeft: options.locale === 'ar', state: 'frozen', ySplit: 6 }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:6' },
  });
  const columnCount = comparison ? 4 : 3;
  [name || '', text.title, `${text.asOf}: ${report.asOfDate}${comparison ? ` | ${text.comparison}: ${report.comparisonDate}` : ''}`, `${text.status}: ${text[status]} | ${text.currency}: ${report.company.currency || text.unknownCurrency}`, text.approvalBasis].forEach((value, index) => {
    sheet.addRow([setText(value)]); sheet.mergeCells(index + 1, 1, index + 1, columnCount);
    sheet.getRow(index + 1).font = { name: 'Arial', bold: index !== 4, size: index === 0 ? 16 : 11 };
    sheet.getRow(index + 1).alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(index + 1).height = index === 4 ? 30 : 25;
  });
  sheet.addRow([text.code, text.account, `${text.asOf} ${report.asOfDate}`, ...(comparison ? [`${text.comparison} ${report.comparisonDate}`] : [])]);
  sheet.columns = [{ width: 19 }, { width: 65 }, { width: 26 }, ...(comparison ? [{ width: 26 }] : [])];
  rows.forEach(item => {
    const row = sheet.addRow([setText(item.code || ''), setText(item.label), item.amount, ...(comparison ? [item.comparisonAmount] : [])]);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.getCell(3).numFmt = numberFormat; if (comparison) row.getCell(4).numFmt = numberFormat;
    if (item.kind !== 'account') {
      row.font = { bold: true, name: 'Arial' };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.kind === 'total' ? 'FFE3EDF3' : 'FFF0F4F7' } };
    }
  });
  const createSheet = (name: string, headers: string[], values: (string | number | null)[][]) => {
    const target = workbook.addWorksheet(name, { views: [{ rightToLeft: options.locale === 'ar', state: 'frozen', ySplit: 1 }] });
    target.addRow(headers);
    values.forEach(valuesRow => target.addRow(valuesRow.map(value => typeof value === 'string' ? setText(value) : value)));
    target.columns = headers.map((_, index) => ({ width: index === 0 ? 28 : 38 }));
    target.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; });
    return target;
  };
  const issueMetadata: (string | number | null)[][] = [...metadata,
    [text.basis, text.basisText], [text.basis, text.resultText], [text.basis, text.reviewText],
    ...(snapshot?.notes ? [[text.notes, snapshot.notes]] : []),
    ...(snapshot?.review_notes ? [[text.reviewNotes, snapshot.review_notes]] : []),
    ...(status === 'voided' && snapshot?.void_reason ? [[text.voidReason, snapshot.void_reason]] : []),
  ];
  createSheet(text.metadataSheet, [text.account, text.message], issueMetadata).getColumn(2).width = 105;
  createSheet(text.checksSheet, [text.checkCode, text.severity, text.count, text.date, text.message], report.checks.length
    ? report.checks.map(check => [check.code, check.severity, check.count, check.asOfDate, getBalanceSheetCheckMessage(check, options.locale)])
    : [['', '', 0, report.asOfDate, text.noChecks]]).getColumn(5).width = 90;
  const accountDetails = createSheet(text.accountsSheet, [text.code, text.account, text.type, text.classification, text.debit, text.credit, `${text.balance} ${report.asOfDate}`, ...(comparison ? [`${text.balance} ${report.comparisonDate}`] : [])],
    report.accounts.filter(account => ['asset', 'liability', 'equity'].includes(account.type))
      .map(account => [account.code, options.locale === 'ar' ? account.nameAr || account.name : account.name, account.type, account.classification, account.debit, account.credit, account.balance, ...(comparison ? [account.comparisonBalance] : [])]));
  [5, 6, 7, ...(comparison ? [8] : [])].forEach(index => { accountDetails.getColumn(index).numFmt = numberFormat; });
  workbook.eachSheet(target => {
    const header = target.getRow(target === sheet ? 6 : 1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203D50' } };
    header.height = 32; header.alignment = { wrapText: true, vertical: 'middle' };
    target.headerFooter.oddFooter = `&L${text[status]}&C${report.asOfDate}&R&P / &N`;
  });
  return workbook;
}

export async function exportBalanceSheetExcel(options: BalanceSheetExportOptions): Promise<void> {
  const workbook = await buildBalanceSheetWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = fileName(options, 'xlsx');
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
}
