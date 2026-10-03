import { PORTFOLIO_EVIDENCE_CATEGORIES, type InsolvencyPortfolio, type PortfolioDocument, type PortfolioManifestEntry, type PortfolioRow } from '@/types/insolvencyPortfolio';
import { portfolioCsv, portfolioDocumentPath, portfolioLedgerRows, portfolioSummary } from '@/utils/insolvencyPortfolioRules';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
const statusLabels = { included: 'نسخة ضمن الحافظة؛ تحتاج مراجعة', generated: 'نص مولد؛ يحتاج مراجعة', failed: 'تعذر تنزيل النسخة', missing_reference: 'لا يوجد مرجع ملف', inactive: 'نسخة غير نشطة؛ فهرس فقط' };

export function portfolioReportHtml(portfolio: InsolvencyPortfolio, manifest?: PortfolioManifestEntry[]) {
  const summary = portfolioSummary(portfolio);
  const categories = PORTFOLIO_EVIDENCE_CATEGORIES.map(category => {
    const count = manifest?.filter(entry => entry.category === category.key && entry.status === 'included').length;
    return `<tr><td>${escape(category.ar)}</td><td>${count ? `${count} نسخة ضمن الحافظة؛ مراجعة المحتوى مطلوبة` : 'يلزم إرفاق المستند أو التحقق من وجوده في فهارس المرفقات'}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>حافظة الوضع المالي ومستندات المحامي</title><style>body{font-family:Tahoma,Arial,sans-serif;line-height:1.8;margin:35px;color:#17251e}h1{font-size:25px}table{border-collapse:collapse;width:100%;margin:18px 0;font-size:12px}td,th{border:1px solid #b6c2bb;padding:7px;text-align:right;overflow-wrap:anywhere}.notice{padding:14px;background:#fff5dc;border:1px solid #e4cc83}@media print{body{margin:12mm}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body>
  <h1>حافظة الوضع المالي ومستندات المحامي</h1><p>الشركة: ${escape(summary.companyName)} (${escape(portfolio.companyId)}) — تاريخ قطع القيود والفواتير: ${escape(portfolio.cutoff)} — العملة: ${escape(summary.currency)}</p><p>القراءة من ${escape(portfolio.startedAt)} إلى ${escape(portfolio.completedAt)}.</p>
  <p class="notice">حافظة للمراجعة وإكمال المستندات. حالة تشغيل المركبات وأرصدة الفواتير والعقود والالتزامات تعكس السجل الحالي وقت القراءة. قطع التاريخ يطبق على الحركات المؤرخة والقيود المرحلة؛ لا يعيد تكوين الأرصدة التشغيلية التاريخية. القراءة على صفحات وليست لقطة قاعدة بيانات مقفلة. وجود نسخة لا يثبت صحة محتواها أو اعتمادها من المحاسب أو المحامي.</p>
  <table><thead><tr><th>البيان</th><th>المسجل</th></tr></thead><tbody><tr><td>المركبات / المسروقة وفق الحالة المسجلة</td><td>${summary.vehicles} / ${summary.stolen}</td></tr><tr><td>مركبات بلا قيمة دفترية مسجلة</td><td>${summary.vehiclesWithoutBookValue}</td></tr><tr><td>أرصدة العملاء الموجبة الحالية لفواتير البيع والخدمة حتى القطع</td><td>${summary.receivables.toFixed(2)} QAR — ${summary.debtors} عميل</td></tr><tr><td>الأرصدة الدائنة للعملاء / فواتير بلا رصيد معلوم</td><td>${summary.customerCredits.toFixed(2)} / ${summary.missingInvoiceBalances}</td></tr><tr><td>مدين / دائن القيود المرحلة حتى القطع</td><td>${summary.ledgerDebits.toFixed(2)} / ${summary.ledgerCredits.toFixed(2)} QAR</td></tr><tr><td>مطالبات ضد الشركة مسجلة بالنظام</td><td>${summary.casesAgainstCompany}</td></tr><tr><td>حزم قوائم مالية معتمدة داخل النظام (جميع فتراتها)</td><td>${summary.approvedStatementCount}</td></tr></tbody></table>
  <p>مجاميع القيود تمثل الحركة المحاسبية، وليست إجمالي أصول أو مديونية. المخالفات والغرامات ومطالبات القضايا والأقساط قد تتداخل مع الفواتير والقيود؛ لم تُجمع باعتبارها مديونية واحدة. القيم الدفترية لا تمثل أسعار بيع أو تقييم سوقي. سجلات المطالبات لا تثبت رفع دعاوى قضائية. يلزم جرد النقد ومطابقة الصندوق وإيصالات القبض والصرف، ومطابقة البنوك إن وجدت والدائنين وتحديد مستحقات الموظفين والضرائب ومراجعة القوائم المالية.</p>
  <h2>السجلات</h2><table><thead><tr><th>السجل</th><th>العدد</th><th>أساس البيانات</th><th>وقت القراءة</th></tr></thead><tbody>${portfolio.registers.map(register => `<tr><td>${escape(register.label)}</td><td>${register.rows.length}</td><td>${register.basis === 'current_records' ? 'السجل الحالي' : register.basis === 'posted_ledger' ? 'مرحلة حتى القطع' : 'حركات مؤرخة حتى القطع'}</td><td>${escape(register.readAt)}</td></tr>`).join('')}</tbody></table>
  <h2>مستندات تحتاج الاستكمال والمراجعة</h2><table><thead><tr><th>المستند</th><th>الحالة</th></tr></thead><tbody>${categories}</tbody></table>
  ${manifest ? `<h2>فهرس المرفقات الفعلية</h2><table><thead><tr><th>الاسم / المصدر / المالك</th><th>الحالة</th><th>الملف داخل الحافظة</th></tr></thead><tbody>${manifest.map(entry => `<tr><td>${escape(entry.name)}<br>${escape(entry.source)} / ${escape(entry.ownerId)}</td><td>${escape(statusLabels[entry.status])}${entry.recordState ? `<br>حالة سجل المصدر: ${escape(entry.recordState)}` : ''}${entry.reason ? `<br>${escape(entry.reason)}` : ''}</td><td>${escape(entry.archiveName)}<br>${escape(entry.archivePath)}</td></tr>`).join('')}</tbody></table>` : '<p>يضاف فهرس المرفقات وحالات التنزيل عند تصدير ZIP.</p>'}
  <p>يلزم أن يحدد مكتب المحامي المستندات المطلوبة للإجراء والقضية، وأن يعتمد المحاسب المركز المالي والمطابقات. القوائم المحفوظة إن وجدت مرفقة بحالتها وفترتها الأصلية؛ الاعتماد داخل النظام لا يعادل تدقيقًا خارجيًا.</p></body></html>`;
}

interface PortfolioExportOptions {
  documents?: PortfolioDocument[];
  evidenceNotes?: PortfolioRow[];
  assertCurrent?: () => void;
  onProgress?: (done: number, total: number) => void;
  maxAttachmentBytes?: number;
  onPartReady?: (blob: Blob, name: string) => Promise<void> | void;
}

class PortfolioArchiveError extends Error {}

export async function buildInsolvencyPortfolioZip(portfolio: InsolvencyPortfolio, download: (doc: PortfolioDocument) => Promise<Blob>, options: PortfolioExportOptions = {}) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  let attachments = options.onPartReady ? new JSZip() : zip;
  let partBytes = 0;
  const archives: Array<{ name: string; bytes: number }> = [];
  const partName = () => `company-attachments-${portfolio.companyId}-${portfolio.cutoff}-part-${String(archives.length + 1).padStart(3, '0')}.zip`;
  const flushAttachments = async () => {
    if (!options.onPartReady || !partBytes) return;
    try {
      assertCurrent();
      const blob = await attachments.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } });
      assertCurrent();
      const name = partName();
      await options.onPartReady(blob, name);
      archives.push({ name, bytes: blob.size });
      attachments = new JSZip(); partBytes = 0;
    } catch (error) { throw new PortfolioArchiveError(error instanceof Error ? error.message : 'تعذر إنشاء جزء المرفقات'); }
  };
  const assertCurrent = options.assertCurrent || (() => undefined);
  assertCurrent();
  const manifest: PortfolioManifestEntry[] = [];
  const documents = options.documents || portfolio.documents;
  for (let index = 0; index < documents.length; index++) {
    assertCurrent();
    const doc = documents[index];
    const entry: PortfolioManifestEntry = { documentId: doc.id, source: doc.source, name: doc.name, category: doc.category, ownerId: doc.ownerId, referenceOwnerId: doc.referenceOwnerId || null, status: 'missing_reference', archivePath: null, archiveName: null, recordState: doc.recordState || null, bytes: null, sha256: null, reason: null };
    if (!doc.active) entry.recordState = [entry.recordState, 'سجل مصدر غير نشط أو محذوف؛ نسخة تاريخية تحتاج مراجعة'].filter(Boolean).join(' / ');
    try {
      let blob: Blob;
      if (doc.reference) {
        blob = await download(doc);
        entry.status = 'included';
      } else if (doc.generatedHtml) {
        // Keep stored generated HTML inert, not an executable original attachment.
        blob = new Blob([doc.generatedHtml], { type: 'text/plain;charset=utf-8' });
        entry.status = 'generated';
      } else throw new Error('لا يوجد مرجع لنسخة محفوظة');
      if (!blob.size) throw new Error('نسخة الملف فارغة');
      assertCurrent();
      if (options.onPartReady && partBytes > 0 && partBytes + blob.size > (options.maxAttachmentBytes || 75 * 1024 * 1024)) await flushAttachments();
      const bytes = await blob.arrayBuffer();
      entry.sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      entry.bytes = bytes.byteLength;
      entry.archivePath = portfolioDocumentPath(doc, entry.status === 'generated' ? '.generated.html.txt' : '');
      entry.archiveName = options.onPartReady ? partName() : null;
      attachments.file(entry.archivePath, new Uint8Array(bytes));
      partBytes += bytes.byteLength;
    } catch (error) {
      // Scope cancellation must never become an apparently successful attachment failure.
      assertCurrent();
      if (error instanceof PortfolioArchiveError) throw error;
      entry.status = doc.reference ? 'failed' : 'missing_reference';
      entry.reason = error instanceof Error ? error.message : 'تعذر تنزيل النسخة';
      entry.archivePath = null; entry.bytes = null; entry.sha256 = null;
    }
    manifest.push(entry);
    options.onProgress?.(index + 1, documents.length);
  }
  await flushAttachments();
  for (const register of portfolio.registers) zip.file(`registers/${register.key}.csv`, portfolioCsv(register.rows));
  zip.file('registers/posted-account-balances.csv', portfolioCsv(portfolioLedgerRows(portfolio)));
  zip.file('source-data.json', JSON.stringify(portfolio, null, 2));
  zip.file('saved-financial-statements.json', JSON.stringify(portfolio.savedStatements, null, 2));
  zip.file('attachment-manifest.json', JSON.stringify({ companyId: portfolio.companyId, cutoff: portfolio.cutoff, generatedAt: new Date().toISOString(), status: 'requires_accountant_and_lawyer_review', archives, entries: manifest }, null, 2));
  zip.file('supporting-evidence-notes.json', JSON.stringify(options.evidenceNotes || [], null, 2));
  zip.file('lawyer-review.html', portfolioReportHtml(portfolio, manifest));
  zip.file('README.txt', `حافظة مراجعة الوضع المالي ومستندات المحامي\r\nالشركة: ${portfolio.companyId}\r\nالقطع: ${portfolio.cutoff}\r\nافتح lawyer-review.html للفهرس والطباعة إلى PDF، وattachment-manifest.json لحالة كل مرفق وSHA256.\r\nالسجلات CSV تحفظ الحالات الأصلية بما فيها الملغاة؛ قراءة المجاميع تراعي أساس التقرير.\r\nsource-data.json يحتوي القراءة الكاملة وأوقات المصادر، وليس لقطة تاريخية مقفلة.\r\nتحتاج الحافظة مراجعة المحاسب والمحامي وإكمال النواقص المبينة.\r\nتحوي بيانات مالية وشخصية؛ سلّمها للمكتب المخول فقط.\r\n`);
  if (archives.length) zip.file('attachment-parts.txt', `تجمع أجزاء المرفقات التالية مع حافظة السجلات، ويحدد الفهرس الجزء الذي يحتوي كل ملف. تأكد من استلام كل الأجزاء من المتصفح قبل التسليم.\r\n${archives.map(archive => `${archive.name} (${archive.bytes} bytes)`).join('\r\n')}`);
  assertCurrent();
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } });
  assertCurrent();
  return { blob, manifest, archives, failed: manifest.filter(entry => ['failed', 'missing_reference'].includes(entry.status)).length };
}
