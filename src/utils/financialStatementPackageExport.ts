import type { FinancialStatementPackageExportOptions, FinancialStatementSection, SavedFinancialStatementPackage } from '@/types/financialStatementPackage';
import { parseFinancialStatementPackage, parseSavedFinancialStatementPackage } from './financialStatementPackageValidation';
import { sanitizeDocumentHtmlToFragment } from './htmlSanitizer';
import { formatBalanceSheetMoney } from './balanceSheetPresentation';
import { safeBalanceSheetSpreadsheetText } from './balanceSheetExport';

const text = {
  ar: {
    annual: 'القوائم المالية السنوية للمنشأة المنفردة', interim: 'القوائم المالية المرحلية للمنشأة المنفردة',
    draft: 'مسودة للمراجعة — غير معتمدة', approved: 'معتمدة داخلياً', voided: 'نسخة ملغاة — غير صالحة للتقديم',
    audit: 'الاعتماد داخل الشركة لا يمثل رأي تدقيق أو تصديقاً من مدقق مستقل.',
    framework: 'إطار الإعداد المختار: IFRS. لا يعد إنشاء هذه الحزمة وحده إقراراً باستيفاء متطلبات هذا الإطار.',
    register: 'السجل التجاري', currency: 'عملة العرض', unknownCurrency: 'العملة غير محددة',
    period: 'الفترة', comparative: 'الفترة المقارنة', from: 'من', to: 'إلى', asOf: 'كما في',
    item: 'البيان', note: 'إيضاح', notes: 'الإيضاحات المتممة للقوائم المالية',
    pending: 'قيد الاستكمال', complete: 'مكتمل', not_applicable: 'غير منطبق', evidence: 'مرجع المستندات المؤيدة',
    findings: 'فحوص الجاهزية والملاحظات', noFindings: 'لم تظهر الفحوص الآلية ملاحظات. تبقى المراجعة المحاسبية مطلوبة.',
    error: 'مانع للاعتماد', warning: 'يتطلب مراجعة', accounts: 'ملحق حسابات المصدر',
    code: 'رمز الحساب', type: 'النوع', classification: 'التصنيف', debit: 'مدين تراكمي', credit: 'دائن تراكمي',
    metadata: 'بيانات الإصدار والمراجعة', company: 'الشركة', companyId: 'معرف الشركة', address: 'العنوان',
    id: 'مرجع النسخة', version: 'إصدار نموذج التقرير', fingerprint: 'بصمة الحزمة', generated: 'وقت استخراج البيانات',
    prepared: 'أعد النسخة', createdAt: 'وقت الحفظ', reviewed: 'اعتمد داخلياً', approvedAt: 'وقت الاعتماد',
    preview: 'معاينة غير محفوظة', preparationNotes: 'ملاحظات الإعداد', reviewNotes: 'ملاحظات المراجع', voidReason: 'سبب الإلغاء',
    page: 'صفحة', of: 'من', continued: 'تابع', count: 'العدد', referenceAccounts: 'حسابات مرجعية', referenceJournals: 'قيود مرجعية',
    sourceJournals: 'قيود المصدر', date: 'التاريخ', cashMovement: 'حركة النقد', noteStatus: 'حالة الإيضاح',
  },
  en: {
    annual: 'Annual individual entity financial statements', interim: 'Interim individual entity financial statements',
    draft: 'DRAFT — not approved', approved: 'Internally approved', voided: 'VOIDED — not valid for submission',
    audit: 'Company approval is not an audit opinion or certification by an independent auditor.',
    framework: 'Selected preparation framework: IFRS. Generating this package does not by itself establish compliance with that framework.',
    register: 'Commercial registration', currency: 'Presentation currency', unknownCurrency: 'Currency unspecified',
    period: 'Reporting period', comparative: 'Comparative period', from: 'from', to: 'to', asOf: 'As at',
    item: 'Description', note: 'Note', notes: 'Notes to the financial statements',
    pending: 'Pending completion', complete: 'Complete', not_applicable: 'Not applicable', evidence: 'Supporting document reference',
    findings: 'Readiness checks and findings', noFindings: 'Automated checks returned no findings. Accounting review remains required.',
    error: 'Blocks approval', warning: 'Review required', accounts: 'Source account appendix',
    code: 'Account code', type: 'Type', classification: 'Classification', debit: 'Cumulative debit', credit: 'Cumulative credit',
    metadata: 'Issue and review metadata', company: 'Company', companyId: 'Company ID', address: 'Address',
    id: 'Version reference', version: 'Report schema version', fingerprint: 'Package fingerprint', generated: 'Data extracted at',
    prepared: 'Prepared by', createdAt: 'Saved at', reviewed: 'Internally approved by', approvedAt: 'Approved at',
    preview: 'Unsaved preview', preparationNotes: 'Preparation notes', reviewNotes: 'Reviewer notes', voidReason: 'Void reason',
    page: 'Page', of: 'of', continued: 'continued', count: 'Count', referenceAccounts: 'Referenced accounts', referenceJournals: 'Referenced journals',
    sourceJournals: 'Source journals', date: 'Date', cashMovement: 'Cash movement', noteStatus: 'Note status',
  },
} as const;

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).filter(key => key !== 'permissions').sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  : JSON.stringify(value);

export function getMatchingFinancialStatementPackageSnapshot(options: FinancialStatementPackageExportOptions): SavedFinancialStatementPackage | null {
  if (!options.snapshot) return null;
  try {
    const report = parseFinancialStatementPackage(options.report, options.report.company.id);
    const snapshot = parseSavedFinancialStatementPackage(options.snapshot, report.company.id);
    if (!snapshot.id.trim() || !snapshot.created_by.trim() || !Number.isFinite(Date.parse(snapshot.created_at))
      || snapshot.source_fingerprint !== report.fingerprint
      || canonical(snapshot.payload) !== canonical(report)) return null;
    return snapshot;
  } catch { return null; }
}

export function getFinancialStatementPackageExportStatus(options: FinancialStatementPackageExportOptions): 'draft' | 'approved' | 'voided' {
  const saved = getMatchingFinancialStatementPackageSnapshot(options);
  if (saved?.status === 'voided') return 'voided';
  // Self approval is a documented sole-admin exception validated server-side;
  // the remaining markers must still be present and dated after preparation.
  if (saved?.status === 'approved' && saved.approved_by && saved.approved_at
    && Number.isFinite(Date.parse(saved.approved_at)) && Date.parse(saved.approved_at) >= Date.parse(saved.created_at)) return 'approved';
  return 'draft';
}

type Cell = string | number | null;
interface DocumentRow { key: string; label: string; refs: string; kind: string; values: Cell[] }
interface DocumentTable { columns: { label: string; numeric: boolean }[]; rows: DocumentRow[] }
interface DocumentSection { key: string; title: string; subtitle: string; table?: DocumentTable; paragraphs?: { text: string; heading?: boolean }[] }

function context(options: FinancialStatementPackageExportOptions) {
  const report = parseFinancialStatementPackage(options.report, options.report.company.id);
  const ar = options.locale === 'ar', copy = text[options.locale], config = report.configuration;
  const snapshot = getMatchingFinancialStatementPackageSnapshot({ ...options, report });
  const status = getFinancialStatementPackageExportStatus({ ...options, report });
  const name = ar ? report.company.nameAr || report.company.name : report.company.name || report.company.nameAr || '';
  const label = (value: { labelAr: string; labelEn: string }) => ar ? value.labelAr || value.labelEn : value.labelEn || value.labelAr;
  const title = (value: { titleAr: string; titleEn: string }) => ar ? value.titleAr || value.titleEn : value.titleEn || value.titleAr;
  const range = (start: string, end: string) => `${copy.from} ${start} ${copy.to} ${end}`;
  const period = range(config.periodStart, config.periodEnd), comparative = range(config.comparativePeriodStart, config.comparativePeriodEnd);
  const sections: DocumentSection[] = report.statements.map(statement => ({
    key: statement.key, title: title(statement),
    subtitle: statement.key === 'position' ? `${copy.asOf} ${config.periodEnd} · ${copy.asOf} ${config.positionComparisonDate}${config.thirdPositionDate ? ` · ${copy.asOf} ${config.thirdPositionDate}` : ''}`
      : statement.key === 'equity_current' ? `${copy.period}: ${period}` : statement.key === 'equity_comparative' ? `${copy.comparative}: ${comparative}`
        : `${copy.period}: ${period} · ${copy.comparative}: ${comparative}`,
    table: {
      columns: statement.columns.map(column => ({ label: `${label(column)}${column.startDate && column.endDate ? `\n${range(column.startDate, column.endDate)}` : column.endDate ? `\n${copy.asOf} ${column.endDate}` : ''}`, numeric: true })),
      rows: statement.rows.map(row => ({ key: row.key, label: label(row), refs: row.noteNumbers.join(', '), kind: row.kind, values: row.values })),
    },
  }));
  const notes = [...config.notes].sort((a, b) => a.number - b.number);
  sections.push({ key: 'notes', title: copy.notes, subtitle: `${copy.period}: ${period}`, paragraphs: [
    { text: copy.framework }, { text: copy.audit },
    ...notes.flatMap(note => [
      { text: `${note.number}. ${title(note)}`, heading: true },
      { text: `${copy.noteStatus}: ${copy[note.status]}` },
      { text: note.text || (note.status === 'pending' ? copy.pending : '—') },
      ...(note.evidence ? [{ text: `${copy.evidence}: ${note.evidence}` }] : []),
    ]),
    ...(config.preparationNotes ? [{ text: copy.preparationNotes, heading: true }, { text: config.preparationNotes }] : []),
    ...(snapshot?.review_notes ? [{ text: copy.reviewNotes, heading: true }, { text: snapshot.review_notes }] : []),
  ] });
  sections.push({ key: 'findings', title: copy.findings, subtitle: `${copy.period}: ${period}`, paragraphs: report.findings.length
    ? report.findings.flatMap(finding => [
      { text: `${copy[finding.severity]} · ${finding.count} · ${ar ? finding.messageAr || finding.messageEn : finding.messageEn || finding.messageAr}` },
      ...(finding.accountIds.length ? [{ text: `${copy.referenceAccounts}: ${finding.accountIds.join(', ')}` }] : []),
      ...(finding.journalIds.length ? [{ text: `${copy.referenceJournals}: ${finding.journalIds.join(', ')}` }] : []),
    ]) : [{ text: copy.noFindings }] });
  sections.push({ key: 'accounts', title: copy.accounts, subtitle: `${copy.asOf} ${config.periodEnd} · ${copy.asOf} ${config.positionComparisonDate}`, table: {
    columns: [{ label: copy.code, numeric: false }, { label: copy.type, numeric: false }, { label: config.periodEnd, numeric: true }, { label: config.positionComparisonDate, numeric: true }],
    rows: report.position.accounts.map(account => ({ key: account.id, label: ar ? account.nameAr || account.name : account.name, refs: '', kind: 'line', values: [account.code, account.type, account.balance, account.comparisonBalance] })),
  } });
  const metadata: [string, string][] = [
    [copy.company, name], [copy.companyId, report.company.id], [copy.register, report.company.commercialRegister || '—'],
    [copy.address, report.company.address || '—'], [copy.currency, report.company.currency || copy.unknownCurrency],
    [copy.period, period], [copy.comparative, comparative], [copy.version, String(report.version)],
    [copy.id, snapshot?.id || copy.preview], [copy.fingerprint, report.fingerprint], [copy.generated, report.generatedAt],
    [copy.prepared, snapshot ? `${snapshot.created_by_name || '—'} (${snapshot.created_by})` : '—'], [copy.createdAt, snapshot?.created_at || '—'],
    [copy.reviewed, status === 'approved' ? `${snapshot?.approved_by_name || '—'} (${snapshot?.approved_by})` : '—'], [copy.approvedAt, status === 'approved' ? snapshot?.approved_at || '—' : '—'],
    ...(status === 'voided' && snapshot?.void_reason ? [[copy.voidReason, snapshot.void_reason] as [string, string]] : []),
  ];
  sections.push({ key: 'metadata', title: copy.metadata, subtitle: copy[status], paragraphs: metadata.map(([key, value]) => ({ text: `${key}: ${value}` })) });
  return { report, snapshot, status, copy, name, sections, metadata, title: copy[config.kind], notes };
}

const css = `
@page fspPortrait{size:A4 portrait;margin:0}@page fspLandscape{size:A4 landscape;margin:0}
.fsp-document{font-family:Arial,Tahoma,sans-serif;font-size:11px;line-height:1.55;color:#173247;background:#fff}
.fsp-document[dir=ltr]{direction:ltr;text-align:left}.fsp-document[dir=rtl]{direction:rtl;text-align:right}
.fsp-document *{box-sizing:border-box;direction:inherit;text-align:inherit}
.fsp-document [dir=ltr]{direction:ltr}.fsp-document [dir=rtl]{direction:rtl}
.fsp-document .fsp-page{page:fspPortrait;width:210mm;height:297mm;padding:32px 36px 25px;display:flex;flex-direction:column;gap:12px;background:#fff;break-after:page;page-break-after:always}
.fsp-document .fsp-page.fsp-landscape{page:fspLandscape;width:297mm;height:210mm}
.fsp-document .fsp-page:last-child{break-after:auto;page-break-after:auto}
.fsp-document .fsp-source{padding:28px;width:794px}.fsp-document .fsp-header{flex:none;border-bottom:2px solid #294b62;padding-bottom:10px;overflow-wrap:anywhere}
.fsp-document .fsp-company{font-weight:700;font-size:19px;line-height:1.4;margin-bottom:3px}
.fsp-document .fsp-package-title{font-size:15px;font-weight:700;margin-top:8px}
.fsp-document .fsp-identity{font-size:10px;overflow-wrap:anywhere}.fsp-document .fsp-status{font-weight:700;margin-top:5px}
.fsp-document .fsp-section-title{font-size:16px;font-weight:700;margin:9px 0 3px}
.fsp-document .fsp-period{font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere}
.fsp-document .fsp-content{flex:1;min-height:0;overflow:visible}
.fsp-document table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:10px;line-height:1.6}
.fsp-document thead{display:table-header-group}.fsp-document th{background:#294b62;color:#fff;padding:7px 6px;white-space:pre-wrap;font-weight:700;overflow-wrap:anywhere}
.fsp-document td{padding:6px;border-bottom:1px solid #d7e1e8;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}
.fsp-document tr{break-inside:avoid;page-break-inside:avoid}.fsp-document .fsp-number{direction:ltr;text-align:end;font-variant-numeric:tabular-nums}
.fsp-document .fsp-ref{width:6%;font-size:9px}.fsp-document .fsp-row-section{background:#eaf0f4;font-weight:700}
.fsp-document .fsp-row-subtotal,.fsp-document .fsp-row-reconciliation{background:#f1f5f7;font-weight:700}
.fsp-document .fsp-row-total{background:#e1ecf2;font-weight:700;border-top:2px solid #294b62}
.fsp-document .fsp-paragraph{margin:0 0 9px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8}
.fsp-document h3.fsp-paragraph{font-size:13px;margin-top:12px;font-weight:700;border-bottom:1px solid #d7e1e8;padding-bottom:4px}
.fsp-document .fsp-footer{flex:none;border-top:1px solid #9db0bd;padding-top:6px;font-size:8px;line-height:1.5;overflow-wrap:anywhere}
.fsp-document .fsp-footer-top{display:flex;justify-content:space-between;gap:12px;font-weight:700}
.fsp-document .fsp-hash{direction:ltr;font-family:monospace}
@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}.fsp-document{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

export function buildFinancialStatementPackageDocument(options: FinancialStatementPackageExportOptions): string {
  const data = context(options), { report, copy } = data;
  const number = (value: Cell) => value === null ? '' : typeof value === 'number'
    ? escape(formatBalanceSheetMoney(value, report.company.currency, options.locale)) : escape(value);
  const header = `<header class="fsp-header"><div class="fsp-company">${escape(data.name)}</div><div class="fsp-identity">${escape(copy.register)}: ${escape(report.company.commercialRegister || '—')}${report.company.address ? `<br>${escape(report.company.address)}` : ''}</div><div class="fsp-package-title">${escape(data.title)}</div><div class="fsp-identity">${escape(copy.currency)}: ${escape(report.company.currency || copy.unknownCurrency)}</div><div class="fsp-status">${escape(copy[data.status])}</div></header>`;
  const footer = `<footer class="fsp-footer"><div class="fsp-footer-top"><span>${escape(copy[data.status])} · ${escape(copy.version)} ${report.version}</span><span class="fsp-page-count"></span></div><div>${escape(copy.id)}: ${escape(data.snapshot?.id || copy.preview)}</div><div>${escape(copy.fingerprint)}: <span class="fsp-hash">${escape(report.fingerprint)}</span></div><div>${escape(copy.audit)}</div></footer>`;
  const sections = data.sections.map(section => {
    const table = section.table;
    const columns = table?.columns.length || 0;
    const body = table ? `<table class="fsp-table"><colgroup><col style="width:${columns > 3 ? 28 : 44}%"><col style="width:6%">${table.columns.map(() => `<col style="width:${(columns > 3 ? 66 : 50) / columns}%">`).join('')}</colgroup><thead><tr><th>${escape(copy.item)}</th><th>${escape(copy.note)}</th>${table.columns.map(column => `<th>${escape(column.label)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr class="fsp-row-${escape(row.kind)}"><td class="fsp-label">${escape(row.label)}</td><td class="fsp-ref">${escape(row.refs)}</td>${row.values.map((value, index) => `<td class="${table.columns[index].numeric ? 'fsp-number' : 'fsp-text-cell'}">${number(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : (section.paragraphs || []).filter(paragraph => paragraph.text).map(paragraph => `<${paragraph.heading ? 'h3' : 'p'} class="fsp-paragraph">${escape(paragraph.text)}</${paragraph.heading ? 'h3' : 'p'}>`).join('');
    return `<section class="fsp-source-section${columns > 3 ? ' fsp-wide-section' : ''}"><div class="fsp-section-heading"><h2 class="fsp-section-title">${escape(section.title)}</h2><div class="fsp-period">${escape(section.subtitle)}</div></div>${body}</section>`;
  }).join('');
  return `<!doctype html><html lang="${options.locale}" dir="${options.locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escape(data.title)}</title><style>${css}</style></head><body><div class="fsp-document" dir="${options.locale === 'ar' ? 'rtl' : 'ltr'}"><div class="fsp-source">${header}${sections}${footer}</div></div></body></html>`;
}

export interface RenderedFinancialStatementPackagePages { element: HTMLElement; pages: HTMLElement[]; dispose: () => void }

export async function renderFinancialStatementPackagePages(options: FinancialStatementPackageExportOptions): Promise<RenderedFinancialStatementPackagePages> {
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-15000px;top:0;width:1123px;z-index:-1;background:white';
  const styles = document.createElement('style'); styles.className = 'fsp-layout-styles'; styles.textContent = css;
  host.replaceChildren(styles, sanitizeDocumentHtmlToFragment(buildFinancialStatementPackageDocument(options))); document.body.appendChild(host);
  try {
    await document.fonts?.ready;
    const root = host.querySelector<HTMLElement>('.fsp-document')!, source = root.querySelector<HTMLElement>('.fsp-source')!;
    const header = source.querySelector<HTMLElement>('.fsp-header')!, footer = source.querySelector<HTMLElement>('.fsp-footer')!;
    const pages: HTMLElement[] = [];
    const continued = ` (${text[options.locale].continued})`;
    for (const section of Array.from(source.querySelectorAll<HTMLElement>('.fsp-source-section'))) {
      const heading = section.querySelector<HTMLElement>('.fsp-section-heading')!;
      const template = section.querySelector<HTMLTableElement>('.fsp-table');
      let body = document.createElement('main'), activeTable: HTMLTableElement | null = null;
      const newPage = () => {
        const page = document.createElement('section'); page.className = `fsp-page${section.classList.contains('fsp-wide-section') ? ' fsp-landscape' : ''}`;
        const pageHeader = header.cloneNode(true) as HTMLElement; pageHeader.appendChild(heading.cloneNode(true)); page.appendChild(pageHeader);
        body = document.createElement('main'); body.className = 'fsp-content'; page.appendChild(body); page.appendChild(footer.cloneNode(true)); root.appendChild(page); pages.push(page); activeTable = null;
        if (body.clientHeight < 100) throw new Error('Statement header leaves insufficient A4 content space');
      };
      const overflow = () => body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
      const tableBody = () => {
        if (!activeTable) {
          activeTable = template!.cloneNode(false) as HTMLTableElement;
          activeTable.appendChild(template!.querySelector('colgroup')!.cloneNode(true)); activeTable.appendChild(template!.tHead!.cloneNode(true)); activeTable.appendChild(document.createElement('tbody')); body.appendChild(activeTable);
        }
        return activeTable.tBodies[0];
      };
      newPage();
      if (template) {
        const rows = Array.from(template.tBodies[0].rows);
        for (let index = 0; index < rows.length; index++) {
          const original = rows[index];
          if (original.classList.contains('fsp-row-section') && body.querySelector('tbody tr')) {
            const group = [original.cloneNode(true), ...(rows[index + 1] ? [rows[index + 1].cloneNode(true)] : [])];
            group.forEach(row => tableBody().appendChild(row)); const move = overflow(); group.forEach(row => row.parentNode?.removeChild(row)); if (move) newPage();
          }
          let row = original.cloneNode(true) as HTMLTableRowElement; tableBody().appendChild(row);
          if (!overflow()) continue;
          row.remove(); if (body.querySelector('tbody tr')) newPage(); tableBody().appendChild(row);
          if (!overflow()) continue;
          row.remove(); let remaining = Array.from(original.querySelector('.fsp-label')!.textContent || ''), continuation = false;
          if (!remaining.length) throw new Error('Unable to fit statement row on an A4 page');
          while (remaining.length) {
            row = original.cloneNode(true) as HTMLTableRowElement; const label = row.querySelector<HTMLElement>('.fsp-label')!;
            label.textContent = remaining.join('') + (continuation ? continued : ''); tableBody().appendChild(row);
            if (!overflow()) break;
            row.querySelectorAll('td:not(.fsp-label)').forEach(cell => { cell.textContent = ''; });
            let low = 0, high = remaining.length - 1;
            while (low < high) { const middle = Math.ceil((low + high) / 2); label.textContent = remaining.slice(0, middle).join('') + continued; if (overflow()) high = middle - 1; else low = middle; }
            if (!low) throw new Error('Unable to fit statement row on an A4 page');
            label.textContent = remaining.slice(0, low).join('') + continued; remaining = remaining.slice(low); continuation = true; newPage();
          }
        }
      } else {
        for (const paragraph of Array.from(section.querySelectorAll<HTMLElement>('.fsp-paragraph'))) {
          let remaining = Array.from(paragraph.textContent || ''), continuation = false;
          while (remaining.length) {
            const block = paragraph.cloneNode(false) as HTMLElement; block.textContent = remaining.join('') + (continuation ? continued : ''); body.appendChild(block);
            if (!overflow()) break;
            block.remove(); if (body.children.length) newPage(); body.appendChild(block); if (!overflow()) break;
            let low = 0, high = remaining.length - 1;
            while (low < high) { const middle = Math.ceil((low + high) / 2); block.textContent = remaining.slice(0, middle).join('') + continued; if (overflow()) high = middle - 1; else low = middle; }
            if (!low) throw new Error('Unable to fit financial statement note on an A4 page');
            block.textContent = remaining.slice(0, low).join('') + continued; remaining = remaining.slice(low); continuation = true; newPage();
          }
        }
      }
    }
    source.remove();
    pages.forEach((page, index) => {
      page.querySelector('.fsp-page-count')!.textContent = `${text[options.locale].page} ${index + 1} ${text[options.locale].of} ${pages.length}`;
      const body = page.querySelector<HTMLElement>('.fsp-content')!;
      if (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1) throw new Error('Financial statement page overflow');
    });
    return { element: host, pages, dispose: () => host.remove() };
  } catch (error) { host.remove(); throw error; }
}

const fileName = (options: FinancialStatementPackageExportOptions, extension: string) => `financial-statements_${options.report.configuration.periodEnd}_${getFinancialStatementPackageExportStatus(options)}_${options.report.fingerprint.slice(0, 12)}.${extension}`;

export async function exportFinancialStatementPackagePDF(options: FinancialStatementPackageExportOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const rendered = await renderFinancialStatementPackagePages(options);
  try {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: rendered.pages[0].classList.contains('fsp-landscape') ? 'landscape' : 'portrait', compress: true });
    pdf.setProperties({ title: text[options.locale][options.report.configuration.kind], author: options.report.company.nameAr || options.report.company.name });
    for (let index = 0; index < rendered.pages.length; index++) {
      const page = rendered.pages[index], landscape = page.classList.contains('fsp-landscape');
      if (index) pdf.addPage('a4', landscape ? 'landscape' : 'portrait');
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, landscape ? 297 : 210, landscape ? 210 : 297, undefined, 'FAST');
    }
    pdf.save(fileName(options, 'pdf'));
  } finally { rendered.dispose(); }
}

export async function printFinancialStatementPackage(options: FinancialStatementPackageExportOptions): Promise<void> {
  const rendered = await renderFinancialStatementPackagePages(options);
  const frame = document.createElement('iframe'); frame.title = text[options.locale][options.report.configuration.kind]; frame.style.cssText = 'position:fixed;left:-15000px;width:1123px;height:1123px;border:0'; document.body.appendChild(frame);
  try {
    const target = frame.contentDocument!, window = frame.contentWindow!;
    target.documentElement.lang = options.locale; target.documentElement.dir = options.locale === 'ar' ? 'rtl' : 'ltr'; target.title = fileName(options, 'pdf');
    const styles = target.createElement('style'); styles.textContent = css; target.head.appendChild(styles);
    const root = target.createElement('div'); root.className = 'fsp-document'; root.dir = target.documentElement.dir;
    rendered.pages.forEach(page => root.appendChild(target.importNode(page, true))); target.body.replaceChildren(root); await target.fonts?.ready;
    const cleanup = () => frame.remove(); window.addEventListener('afterprint', cleanup, { once: true }); window.focus(); window.print(); globalThis.setTimeout(cleanup, 300_000);
  } catch (error) { frame.remove(); throw error; } finally { rendered.dispose(); }
}

export async function buildFinancialStatementPackageWorkbook(options: FinancialStatementPackageExportOptions) {
  const { default: ExcelJS } = await import('exceljs');
  const data = context(options), { report, copy } = data;
  const workbook = new ExcelJS.Workbook(); workbook.creator = data.name; workbook.created = new Date(report.generatedAt);
  const safe = safeBalanceSheetSpreadsheetText, format = '#,##0.00;[Red](#,##0.00);0.00';
  const names: Record<FinancialStatementSection['key'], [string, string]> = {
    position: ['الميزانية العمومية', 'Balance sheet'], profit_loss_oci: ['الربح والدخل الشامل', 'Profit loss and OCI'], equity_current: ['حقوق الملكية الحالية', 'Equity current'], equity_comparative: ['حقوق الملكية المقارنة', 'Equity comparative'], cash_flow: ['التدفقات النقدية', 'Cash flows'],
  };
  for (const statement of report.statements) {
    const section = data.sections.find(section => section.key === statement.key)!;
    const sheet = workbook.addWorksheet(names[statement.key][options.locale === 'ar' ? 0 : 1], { views: [{ rightToLeft: options.locale === 'ar', state: 'frozen', ySplit: 5 }], pageSetup: { paperSize: 9, orientation: statement.columns.length > 3 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5' } });
    const columns = statement.columns.length + 2;
    [data.name, section.title, section.subtitle, `${copy[data.status]} · ${copy.currency}: ${report.company.currency || copy.unknownCurrency}`].forEach((value, index) => { sheet.addRow([safe(value)]); sheet.mergeCells(index + 1, 1, index + 1, columns); sheet.getRow(index + 1).height = 27; sheet.getRow(index + 1).font = { name: 'Arial', bold: true, size: index === 0 ? 15 : 11 }; });
    sheet.addRow([copy.item, copy.note, ...section.table!.columns.map(column => safe(column.label))]);
    sheet.columns = [{ width: 60 }, { width: 10 }, ...statement.columns.map(() => ({ width: 24 }))];
    section.table!.rows.forEach(row => {
      const cells = sheet.addRow([safe(row.label), safe(row.refs), ...row.values]);
      cells.alignment = { wrapText: true, vertical: 'top' };
      for (let column = 3; column <= columns; column++) cells.getCell(column).numFmt = format;
      if (row.kind !== 'line') { cells.font = { bold: true, name: 'Arial' }; cells.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.kind === 'total' ? 'FFE1ECF2' : 'FFF0F5F8' } }; }
    });
    const header = sheet.getRow(5); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF294B62' } }; header.height = 48; header.alignment = { wrapText: true, vertical: 'middle' };
  }
  const auxiliary = (name: string, headers: string[], rows: Cell[][]) => {
    const sheet = workbook.addWorksheet(name.slice(0, 31), { views: [{ rightToLeft: options.locale === 'ar', state: 'frozen', ySplit: 1 }] }); sheet.addRow(headers);
    rows.forEach(row => sheet.addRow(row.map(cell => typeof cell === 'string' ? safe(cell) : cell)));
    sheet.columns = headers.map((_, index) => ({ width: index === 0 ? 24 : 48 })); sheet.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF294B62' } }; return sheet;
  };
  auxiliary(copy.notes, [copy.note, copy.item, copy.noteStatus, copy.item, copy.evidence], data.notes.map(note => [note.number, options.locale === 'ar' ? note.titleAr : note.titleEn, copy[note.status], note.text, note.evidence]));
  auxiliary(copy.findings, [copy.code, copy.type, copy.count, copy.item, copy.referenceAccounts, copy.referenceJournals], report.findings.map(finding => [finding.code, copy[finding.severity], finding.count, options.locale === 'ar' ? finding.messageAr : finding.messageEn, finding.accountIds.join(', '), finding.journalIds.join(', ')]));
  const accounts = auxiliary(copy.accounts, [copy.code, copy.item, copy.type, copy.classification, copy.debit, copy.credit, report.configuration.periodEnd, report.configuration.positionComparisonDate], report.position.accounts.map(account => [account.code, options.locale === 'ar' ? account.nameAr || account.name : account.name, account.type, account.classification, account.debit, account.credit, account.balance, account.comparisonBalance]));
  [5, 6, 7, 8].forEach(index => { accounts.getColumn(index).numFmt = format; });
  const journals = auxiliary(copy.sourceJournals, [copy.code, copy.date, copy.item, copy.cashMovement, copy.referenceJournals], report.journals.map(journal => [journal.number, journal.date, journal.description, journal.cashMovement, journal.id])); journals.getColumn(4).numFmt = format;
  auxiliary(copy.metadata, [copy.item, copy.item], [...data.metadata, [copy.item, copy.framework], [copy.item, copy.audit], [copy.preparationNotes, report.configuration.preparationNotes], [copy.reviewNotes, data.snapshot?.review_notes || '']]);
  workbook.eachSheet(sheet => { sheet.headerFooter.oddFooter = `&L${copy[data.status]}&C${report.configuration.periodEnd}&R&P / &N`; });
  return workbook;
}

export async function exportFinancialStatementPackageExcel(options: FinancialStatementPackageExportOptions): Promise<void> {
  const workbook = await buildFinancialStatementPackageWorkbook(options), bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = fileName(options, 'xlsx'); document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
}
