import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, FileArchive, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FinancePageHeader } from '@/components/ui/FinancePageHeader';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useFleetifyTranslation } from '@/hooks/useTranslation';
import { financeToday } from '@/services/financialReporting';
import { downloadPortfolioDocument, readInsolvencyPortfolio } from '@/services/insolvencyPortfolio';
import { portfolioCsv, portfolioSummary } from '@/utils/insolvencyPortfolioRules';
import { buildInsolvencyPortfolioZip, portfolioReportHtml } from '@/utils/insolvencyPortfolioExport';
import { PORTFOLIO_EVIDENCE_CATEGORIES, type PortfolioDocument, type PortfolioEvidenceCategory } from '@/types/insolvencyPortfolio';

interface LocalEvidence { companyId: string; doc: PortfolioDocument; file: File; notes: string }
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function InsolvencyPortfolio() {
  const { companyId, isAuthenticating, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { currentLanguage } = useFleetifyTranslation('financial');
  const ar = currentLanguage === 'ar';
  const text = (arabic: string, english: string) => ar ? arabic : english;
  const [cutoff, setCutoff] = useState(financeToday);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [readProgress, setReadProgress] = useState<{ done: number; total: number } | null>(null);
  const [lastResult, setLastResult] = useState<{ scope: string; included: number; failed: number; parts: number } | null>(null);
  const [evidence, setEvidence] = useState<LocalEvidence[]>([]);
  const [category, setCategory] = useState<PortfolioEvidenceCategory>('insolvency_al_mana_case');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const scope = `${companyId || ''}:${cutoff}`;
  const activeScope = useRef(scope);
  activeScope.current = isAuthenticating ? '' : scope;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setFile(null); setNotes(''); if (fileRef.current) fileRef.current.value = ''; }, [companyId]);
  const query = useQuery({
    queryKey: ['insolvency-portfolio', companyId, cutoff],
    enabled: !!companyId && !isAuthenticating,
    queryFn: () => {
      if (!companyId) throw new Error('Company required');
      validateCompanyAccess(companyId);
      return readInsolvencyPortfolio(companyId, cutoff, (done, total) => {
        if (mounted.current && activeScope.current === scope) setReadProgress({ done, total });
      });
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const portfolio = !query.isError && !query.isFetching && !isAuthenticating && query.data?.companyId === companyId && query.data?.cutoff === cutoff ? query.data : undefined;
  const summary = portfolio ? portfolioSummary(portfolio) : null;
  const localEvidence = evidence.filter(item => item.companyId === companyId);
  const addEvidence = () => {
    if (!companyId || isAuthenticating) return;
    try {
      validateCompanyAccess(companyId);
      if (!file?.size || file.size > 25 * 1024 * 1024 || !/\.(pdf|png|jpg|jpeg|xlsx|xls|docx)$/i.test(file.name)) throw new Error(text('اختر PDF أو صورة أو Excel أو Word حتى 25 ميغابايت', 'Choose a PDF, image, Excel or Word file up to 25 MB'));
      if (notes.trim().length < 5) throw new Error(text('اكتب جهة المستند وتاريخه ورقم المركبة أو المطالبة المرتبطة', 'Enter the issuer, date and related vehicle or claim number'));
      setEvidence(items => [...items, { companyId, file, notes: notes.trim(), doc: { id: crypto.randomUUID(), source: 'local_supporting_evidence', name: file.name, category, ownerId: companyId, reference: 'local', buckets: [], active: true } }]);
      setFile(null); setNotes(''); if (fileRef.current) fileRef.current.value = '';
    } catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
  };
  const exportZip = async () => {
    if (!portfolio || !companyId) return;
    validateCompanyAccess(companyId);
    const selectedScope = scope;
    const assertCurrent = () => { if (!mounted.current || activeScope.current !== selectedScope) throw new Error(text('تغيرت الشركة أو الفترة؛ أُلغي التصدير، أعد تحميل الحافظة', 'Company or date changed; export cancelled. Reload the portfolio')); };
    setExporting(true); setLastResult(null); setProgress(null);
    try {
      const result = await buildInsolvencyPortfolioZip(portfolio, doc => {
        const local = localEvidence.find(item => item.doc.id === doc.id && doc.source === 'local_supporting_evidence');
        return local ? Promise.resolve(local.file) : downloadPortfolioDocument(doc, portfolio.companyId);
      }, {
        documents: [...portfolio.documents, ...localEvidence.map(item => item.doc)],
        evidenceNotes: localEvidence.map(item => ({ document_id: item.doc.id, document_name: item.doc.name, category: item.doc.category, notes: item.notes, company_id: item.companyId })),
        assertCurrent,
        maxAttachmentBytes: 75 * 1024 * 1024,
        onPartReady: (blob, name) => { assertCurrent(); saveBlob(blob, name); },
        onProgress: (done, total) => { if (mounted.current) setProgress({ done, total }); },
      });
      assertCurrent();
      saveBlob(result.blob, `company-portfolio-${portfolio.companyId}-${cutoff}.zip`);
      setLastResult({ scope: selectedScope, included: result.manifest.filter(entry => entry.status === 'included').length, failed: result.failed, parts: result.archives.length });
      if (result.failed) toast.warning(text(`صدرت الحافظة مع ${result.failed} مرفقًا ناقصًا أو تعذر تنزيله؛ راجع الفهرس`, `Portfolio exported with ${result.failed} missing or failed attachments; review the manifest`));
      else toast.success(text('تم تنزيل الحافظة؛ يلزم مراجعة المحاسب والمحامي وإكمال قائمة المستندات', 'Portfolio downloaded; accountant and lawyer review and supporting evidence are required'));
    } catch (error) { if (mounted.current) toast.error(error instanceof Error ? error.message : String(error)); }
    finally { if (mounted.current) { setExporting(false); setProgress(null); } }
  };

  return <section dir={ar ? 'rtl' : 'ltr'} className="space-y-6">
    <FinancePageHeader title={text('حافظة الوضع المالي ومستندات المحامي', 'Financial position and lawyer portfolio')} description={text('السجلات الكاملة والمرفقات المتاحة وقائمة المستندات المطلوب استكمالها.', 'Complete registers, available attachments and supporting evidence checklist.')} icon={FileArchive} />
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <div className="space-y-2"><Label htmlFor="portfolio-cutoff">{text('تاريخ قطع القيود والفواتير', 'Ledger and invoice cutoff')}</Label><Input id="portfolio-cutoff" type="date" value={cutoff} max={financeToday()} disabled={exporting} onChange={event => setCutoff(event.target.value)} /></div>
      <Button variant="outline" disabled={!companyId || query.isFetching || exporting} onClick={() => void query.refetch()}><RefreshCw className="me-2 h-4 w-4" />{text('تحديث السجلات', 'Reload records')}</Button>
      <Button disabled={!portfolio || exporting} onClick={() => void exportZip()}>{exporting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Download className="me-2 h-4 w-4" />}{text('تنزيل الحافظة وأجزاء المرفقات ZIP', 'Download portfolio and attachment ZIP parts')}</Button>
      <Button variant="outline" className="bg-background text-foreground hover:bg-muted hover:text-foreground" disabled={!portfolio || exporting} onClick={() => portfolio && saveBlob(new Blob([portfolioReportHtml(portfolio)], { type: 'text/html;charset=utf-8' }), `lawyer-review-${cutoff}.html`)}>{text('تنزيل تقرير قابل للطباعة', 'Download printable review report')}</Button>
    </div>
    <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{text('حافظة للمراجعة والاستكمال. أرصدة الفواتير وحالة الأسطول والالتزامات تعكس السجل الحالي وقت القراءة؛ قطع التاريخ لا يعيد تكوين أرصدة تاريخية. لا تُجمع المخالفات والغرامات والأقساط ومطالبات القضايا باعتبارها مديونية واحدة، لاحتمال التداخل. القيم الدفترية تحتاج تقييمًا ومطابقة. وجود ملف لا يعني اعتماد محتواه.', 'A review portfolio. Invoice balances, fleet status and obligations reflect current records at extraction, not reconstructed historical balances. Traffic fines, penalties, installments and court claims may overlap and are not added into one debt total. Book values need valuation and reconciliation. A file is not approval of its contents.')}</p>
    <p className="text-sm text-muted-foreground">{text('سجلات المطالبات لا تثبت قيد دعاوى في المحكمة. والقيود وسجلات السداد لا تثبت النقد الموجود فعليًا بالصندوق؛ يلزم الجرد والمطابقة مع إيصالات القبض والصرف.', 'Claim records do not prove a court filing. Ledger entries and payment records do not establish physical cash on hand; cash counting and receipt/payment voucher reconciliation are required.')}</p>
    {(query.isFetching || isAuthenticating) && <p role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />{text('جاري قراءة جميع صفحات السجلات…', 'Reading every register page…')}{readProgress && `${readProgress.done} / ${readProgress.total}`}</p>}
    {query.isError && <p role="alert" className="rounded-xl border border-destructive p-4 text-destructive">{text('تعذر استخراج الحافظة كاملة. لم تُستخدم نتائج جزئية. ', 'Full extraction failed; partial results have not been used. ')}{query.error instanceof Error ? query.error.message : String(query.error)}</p>}
    {!companyId && !isAuthenticating && <p role="alert">{text('اختر الشركة وسجل الدخول لاستخراج الحافظة.', 'Sign in and select a company to extract the portfolio.')}</p>}
    {progress && <p role="status">{text('جاري تجميع المرفقات', 'Collecting attachments')}: {progress.done} / {progress.total}</p>}
    {lastResult?.scope === scope && <p role="status" className="rounded-xl border p-4">{text('نسخ ملفات ضمن ZIP', 'Files included in ZIP')}: {lastResult.included} — {text('مراجع ناقصة أو فشل تنزيل', 'Missing references or failed downloads')}: {lastResult.failed} — {text('أجزاء المرفقات', 'Attachment parts')}: {lastResult.parts}. {text('تأكد من استلام حافظة السجلات وجميع الأجزاء. راجع lawyer-review.html والفهرس لتحديد النواقص.', 'Confirm receipt of the register portfolio and every attachment part. Review lawyer-review.html and the manifest for outstanding evidence.')}</p>}
    {summary && portfolio && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        [text('المركبات / المسروقة المسجلة', 'Vehicles / recorded stolen'), `${summary.vehicles} / ${summary.stolen}`],
        [text('أرصدة العملاء الموجبة الحالية', 'Current positive customer balances'), `${summary.receivables.toLocaleString(ar ? 'ar-QA' : 'en-QA', { minimumFractionDigits: 2 })} ${summary.currency}`],
        [text('مطالبات ضد الشركة مسجلة', 'Recorded claims against company'), summary.casesAgainstCompany],
        [text('قوائم معتمدة داخل النظام، جميع الفترات', 'Internally approved statements, all periods'), summary.approvedStatementCount],
      ].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
      <p className="text-sm text-muted-foreground">{text('وقت اكتمال قراءة السجلات', 'Register extraction completed')}: {new Date(portfolio.completedAt).toLocaleString(ar ? 'ar-QA' : 'en-QA')} — {text('مركبات بلا قيمة دفترية', 'Vehicles without book value')}: {summary.vehiclesWithoutBookValue} — {text('فواتير بلا رصيد معلوم', 'Invoices without a known balance')}: {summary.missingInvoiceBalances}</p>
      <div className="overflow-auto rounded-xl border"><table className="w-full text-start text-sm"><thead><tr className="border-b bg-muted"><th className="p-3 text-start">{text('السجل', 'Register')}</th><th className="p-3 text-start">{text('كل الصفوف', 'All rows')}</th><th className="p-3 text-start">{text('أساس البيانات', 'Basis')}</th><th className="p-3 text-start">CSV</th></tr></thead><tbody>{portfolio.registers.map(register => <tr key={register.key} className="border-b"><td className="p-3">{ar ? register.label : register.key.replaceAll('_', ' ')}</td><td className="p-3">{register.rows.length}</td><td className="p-3">{register.basis === 'current_records' ? text('السجل الحالي', 'Current records') : text('مؤرخ حتى القطع', 'Dated through cutoff')}</td><td className="p-3"><Button variant="ghost" size="sm" disabled={exporting} aria-label={`${text('تنزيل', 'Download')} ${register.label}`} onClick={() => saveBlob(new Blob([portfolioCsv(register.rows)], { type: 'text/csv;charset=utf-8' }), `${register.key}-${cutoff}.csv`)}><Download className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>
    </>}
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">{text('إرفاق المستندات الناقصة للحافظة الحالية', 'Attach missing evidence to this portfolio')}</h2>
      <p className="text-sm text-muted-foreground">{text('تضاف الملفات إلى ZIP عند التنزيل. احفظ الحافظة قبل إغلاق الصفحة؛ هذه الإرفاقات لا تُرفع إلى مخزن الملفات العام. وجود النسخة يحتاج مراجعة المحاسب والمحامي.', 'Files are included in the downloaded ZIP. Save the portfolio before leaving; these attachments are not uploaded to public file storage. Accountant and lawyer review is still required.')}</p>
      <p className="text-sm text-muted-foreground">{text('لتجميع المرفقات الكبيرة، تُنزّل على أجزاء مع فهرس موحد. قد يطلب المتصفح السماح بتنزيل ملفات متعددة؛ احتفظ بجميع الأجزاء مع حافظة السجلات.', 'Large attachments download in parts with one manifest. Your browser may ask to allow multiple downloads; keep all parts with the register portfolio.')}</p>
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="evidence-category">{text('نوع المستند', 'Evidence category')}</Label><select id="evidence-category" className="h-10 w-full rounded-md border bg-background px-3" value={category} disabled={exporting} onChange={event => setCategory(event.target.value as PortfolioEvidenceCategory)}>{PORTFOLIO_EVIDENCE_CATEGORIES.map(item => <option key={item.key} value={item.key}>{item[ar ? 'ar' : 'en']}</option>)}</select></div><div className="space-y-2"><Label htmlFor="portfolio-evidence-file">{text('نسخة المستند', 'Document copy')}</Label><Input ref={fileRef} id="portfolio-evidence-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx" disabled={!companyId || exporting} onChange={event => setFile(event.target.files?.[0] || null)} /></div></div>
      <Label htmlFor="portfolio-evidence-notes">{text('الجهة والتاريخ والمركبة أو القضية المرتبطة', 'Issuer, date and related vehicle or case')}</Label><Textarea id="portfolio-evidence-notes" value={notes} disabled={exporting} onChange={event => setNotes(event.target.value)} />
      <Button variant="outline" disabled={!companyId || !file || exporting} onClick={addEvidence}>{text('إضافة نسخة إلى الحافظة', 'Add copy to portfolio')}</Button>
      {localEvidence.map(item => <div key={item.doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p>{item.doc.name}</p><p className="text-sm text-muted-foreground">{item.notes}</p></div><Button variant="ghost" size="sm" disabled={exporting} aria-label={`${text('إزالة', 'Remove')} ${item.doc.name}`} onClick={() => setEvidence(items => items.filter(current => current.doc.id !== item.doc.id))}><Trash2 className="h-4 w-4" /></Button></div>)}
      <ul className="grid gap-2 text-sm md:grid-cols-2">{PORTFOLIO_EVIDENCE_CATEGORIES.map(item => <li key={item.key} className="rounded-lg border p-3">{item[ar ? 'ar' : 'en']} — {text('يتطلب نسخة ومراجعة المحتوى', 'Copy and contents review required')}</li>)}</ul>
    </div>
    <div className="flex flex-wrap gap-4 text-sm"><Link className="underline" to="/finance/reports/financial-statements">{text('القوائم المالية ومراجعة المحاسب', 'Financial statements and accountant review')}</Link><Link className="underline" to="/finance/treasury/reconciliation">{text('مطابقة البنك', 'Bank reconciliation')}</Link><Link className="underline" to="/finance/reports">{text('مكتبة التقارير', 'Report library')}</Link></div>
  </section>;
}
