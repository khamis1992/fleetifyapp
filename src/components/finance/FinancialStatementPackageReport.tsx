import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, FileText, LockKeyhole, Printer, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { FinancialReportLanguage, useFinancialReportLocale } from './FinancialReportLanguage';
import { useFinancialReportingPeriodLocks, useFinancialStatementPackage, useFinancialStatementPackageActions, useFinancialStatementPackageHistory } from '@/hooks/finance/useFinancialStatementPackage';
import { financialStatementPackageError, listFinancialStatementPackages, readFinancialStatementPackage } from '@/services/financialStatementPackage';
import { financeToday } from '@/services/financialReporting';
import { defaultStatementConfiguration } from '@/utils/financialStatementConfiguration';
import { canonicalFinancialStatementContent, validateFinancialStatementConfiguration } from '@/utils/financialStatementPackageValidation';
import { exportFinancialStatementPackageExcel, exportFinancialStatementPackagePDF, printFinancialStatementPackage } from '@/utils/financialStatementPackageExport';
import { FinancialStatementJournalEditor, FinancialStatementMappingsEditor, FinancialStatementNotesEditor, FinancialStatementPeriodEditor } from './FinancialStatementConfigurationEditor';
import type { BalanceSheetLocale } from '@/types/balanceSheet';
import type { FinancialStatementPackageExportOptions, FinancialStatementReview, FinancialStatementSection, SavedFinancialStatementPackage } from '@/types/financialStatementPackage';
import './FinancialStatementPackageReport.css';

const emptyReview: FinancialStatementReview = { classifications: false, policies: false, reconciliations: false, disclosures: false, periodCutoff: false };
const reviewLabels: Record<keyof FinancialStatementReview, [string, string]> = {
  classifications: ['راجعت بنود العرض وتصنيف الآجال لكل تاريخ مقارنة.', 'I reviewed presentation lines and maturities at each reporting date.'],
  policies: ['راجعت السياسات والإطار المنطبق والشكل القانوني.', 'I reviewed policies, the applicable framework and legal form.'],
  reconciliations: ['راجعت تسويات النقد وحقوق الملكية والأرصدة مع المستندات.', 'I reconciled cash, equity and account balances to supporting records.'],
  disclosures: ['راجعت اكتمال الإيضاحات ومراجعها والأحداث اللاحقة.', 'I reviewed disclosures, references and subsequent events.'],
  periodCutoff: ['راجعت اكتمال القيود والتسويات وحدود الفترات والمقارنات.', 'I reviewed journal completeness, adjustments, cutoff and comparative periods.'],
};

export function FinancialStatementPackageReport() {
  const { companyId, user, isInitializing, isAuthenticating } = useUnifiedCompanyAccess();
  const currentLanguage = useFinancialReportLocale();
  if (isInitializing || isAuthenticating) return <LoadingSpinner />;
  if (!companyId || !user?.id) return <p role="alert">{currentLanguage === 'ar' ? 'يلزم تسجيل الدخول واختيار الشركة.' : 'Sign in and select a company.'}</p>;
  return <FinancialStatementPackageWorkspace key={`${companyId}:${user.id}`} companyId={companyId} actorId={user.id} locale={currentLanguage === 'ar' ? 'ar' : 'en'} />;
}

function StatementTable({ statement, locale, currency }: { statement: FinancialStatementSection; locale: BalanceSheetLocale; currency: string }) {
  const ar = locale === 'ar';
  const money = (amount: number | null) => amount === null ? '' : new Intl.NumberFormat(ar ? 'ar-QA' : 'en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return <section className="space-y-2" aria-label={ar ? statement.titleAr : statement.titleEn}>
    <h3 className="font-semibold">{ar ? statement.titleAr : statement.titleEn}</h3>
    <p className="text-xs text-muted-foreground">{currency} · {ar ? 'بوحدات العملة ومنزلتين عشريتين' : 'Currency units, two decimal places'}</p>
    <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm">
      <thead><tr className="bg-muted"><th className="p-3 text-start">{ar ? 'البند / الإيضاح' : 'Line / note'}</th>{statement.columns.map(column => <th key={column.key} className="p-3 text-end min-w-28">
        <div>{ar ? column.labelAr : column.labelEn}</div>{(column.startDate || column.endDate) && <div className="mt-1 text-xs font-normal"><bdi>{column.startDate ? `${column.startDate} — ` : ''}{column.endDate}</bdi></div>}
      </th>)}</tr></thead>
      <tbody>{statement.rows.map(row => <tr key={row.key} className={row.kind === 'total' ? 'border-t-2 bg-muted font-bold' : row.kind === 'section' || row.kind === 'subtotal' ? 'border-t font-semibold' : 'border-t'}>
        <th scope="row" className="p-3 text-start font-inherit">{ar ? row.labelAr : row.labelEn}{row.noteNumbers.length > 0 && <span className="ms-2 text-xs text-muted-foreground">({row.noteNumbers.join(', ')})</span>}</th>
        {row.values.map((amount, index) => <td key={index} className={`p-3 text-end tabular-nums whitespace-nowrap ${row.kind === 'reconciliation' && amount ? 'text-destructive' : ''}`}><bdi>{money(amount)}</bdi></td>)}
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function FinancialStatementPackageWorkspace({ companyId, actorId, locale }: { companyId: string; actorId: string; locale: BalanceSheetLocale }) {
  const ar = locale === 'ar', tr = (a: string, e: string) => ar ? a : e;
  const [params, setParams] = useSearchParams();
  const initialDate = params.get('asOf');
  const [configuration, setConfiguration] = useState(() => defaultStatementConfiguration(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : '2026-08-31'));
  const [requested, setRequested] = useState(configuration);
  const [selected, setSelected] = useState<SavedFinancialStatementPackage | null>(null);
  const [review, setReview] = useState<FinancialStatementReview>({ ...emptyReview });
  const [reviewNotes, setReviewNotes] = useState(''), [voidReason, setVoidReason] = useState('');
  const [lockReason, setLockReason] = useState(''), [lockCutoff, setLockCutoff] = useState(configuration.periodEnd);
  const [exporting, setExporting] = useState(false);
  const live = useFinancialStatementPackage(requested), history = useFinancialStatementPackageHistory(), locks = useFinancialReportingPeriodLocks();
  const actions = useFinancialStatementPackageActions();
  const versions = history.data?.filter(item => item.company_id === companyId) || [];
  const snapshot = selected ? versions.find(item => item.id === selected.id) || selected : null;
  const candidate = snapshot?.payload || live.data;
  const dirty = canonicalFinancialStatementContent(configuration) !== canonicalFinancialStatementContent(requested);
  let valid = true;
  try { validateFinancialStatementConfiguration(configuration, financeToday()); } catch { valid = false; }
  const versionMissing = Boolean(selected && history.data && !versions.some(item => item.id === selected.id));
  const scoped = Boolean(candidate?.company.id === companyId && canonicalFinancialStatementContent(candidate.configuration) === canonicalFinancialStatementContent(requested));
  const report = scoped ? candidate : undefined;
  const busy = exporting || actions.save.isPending || actions.approve.isPending || actions.voidReport.isPending || actions.periodLock.isPending;
  const readBusy = live.isFetching || Boolean(snapshot && history.isFetching);
  const readFailed = Boolean(live.error || (snapshot && history.error) || versionMissing);
  const stale = Boolean(snapshot && live.data && snapshot.source_fingerprint !== live.data.fingerprint);
  const blocking = report?.findings.filter(item => item.severity === 'error' && item.count > 0) || [];
  const canIssue = scoped && !dirty && valid && !busy && !readBusy && !readFailed && snapshot?.status !== 'voided';
  const canApprove = Boolean(snapshot?.status === 'draft' && snapshot.created_by !== actorId && live.data?.permissions.canApprove && !stale && !blocking.length && canIssue);
  const reviewComplete = reviewNotes.trim().length >= 20 && Object.values(review).every(Boolean);
  const status = snapshot?.status === 'approved' ? tr('معتمد داخليًا', 'Internally approved') : snapshot?.status === 'voided' ? tr('ملغى', 'Voided') : tr('مسودة للإعداد والمراجعة', 'Draft for preparation and review');
  const editingDisabled = busy || Boolean(snapshot);

  const resetReview = () => { setReview({ ...emptyReview }); setReviewNotes(''); setVoidReason(''); };
  const applyConfiguration = () => {
    try {
      const clean = validateFinancialStatementConfiguration(configuration, financeToday());
      setConfiguration(clean); setRequested(clean); setSelected(null); resetReview();
      const next = new URLSearchParams(params); next.set('asOf', clean.periodEnd); setParams(next, { replace: true });
      if (canonicalFinancialStatementContent(clean) === canonicalFinancialStatementContent(requested)) void live.refetch();
    } catch { toast.error(tr('راجع تواريخ الفترات وحقول المعالجات. لا بد من سبب لكل معالجة خاصة.', 'Check reporting dates and treatment fields. Each specific treatment needs a reason.')); }
  };
  const choose = (saved: SavedFinancialStatementPackage) => {
    setConfiguration(saved.payload.configuration); setRequested(saved.payload.configuration); setSelected(saved); setLockCutoff(saved.payload.configuration.periodEnd); resetReview();
    const next = new URLSearchParams(params); next.set('asOf', saved.payload.configuration.periodEnd); setParams(next, { replace: true });
  };
  const perform = async (operation: () => Promise<void>) => { try { await operation(); } catch (error) { toast.error(financialStatementPackageError(error, locale)); } };
  const save = () => perform(async () => { const saved = await actions.save.mutateAsync(requested); choose(saved); toast.success(tr('حُفظت نسخة ثابتة من الحزمة.', 'A fixed package version was saved.')); });
  const approve = () => perform(async () => { if (!snapshot || !canApprove || !reviewComplete) return; choose(await actions.approve.mutateAsync({ id: snapshot.id, notes: reviewNotes, confirmations: review })); toast.success(tr('سُجل الاعتماد الداخلي للحزمة.', 'Internal package approval was recorded.')); });
  const voidReport = () => perform(async () => { if (!snapshot) return; choose(await actions.voidReport.mutateAsync({ id: snapshot.id, reason: voidReason })); toast.success(tr('أُلغيت صلاحية إصدار النسخة مع الاحتفاظ بها.', 'The version was voided and retained for the audit trail.')); });
  const exportReport = async (format: 'pdf' | 'excel' | 'print') => {
    if (!canIssue) return;
    setExporting(true);
    await perform(async () => {
      let options: FinancialStatementPackageExportOptions;
      if (snapshot) {
        const fresh = (await listFinancialStatementPackages(companyId)).find(item => item.id === snapshot.id);
        if (!fresh || fresh.status === 'voided') throw new Error('Package status cannot be verified');
        options = { report: fresh.payload, snapshot: fresh, locale };
      } else options = { report: await readFinancialStatementPackage(companyId, requested), locale };
      if (format === 'pdf') await exportFinancialStatementPackagePDF(options);
      else if (format === 'excel') await exportFinancialStatementPackageExcel(options);
      else await printFinancialStatementPackage(options);
    });
    setExporting(false);
  };
  const changeLock = (unlock: boolean) => perform(async () => {
    await actions.periodLock.mutateAsync({ cutoff: unlock ? null : lockCutoff, reason: lockReason }); setLockReason('');
    toast.success(unlock ? tr('سُجلت إعادة فتح القفل المُدار. تظل الفترات المقفلة الأخرى محمية.', 'Managed lock reopening was recorded. Other closed periods remain protected.') : tr('قُفلت الحركات المحاسبية حتى التاريخ المحدد.', 'Accounting movements were locked through the selected date.'));
  });

  return <div className="financial-statement-workspace space-y-5 min-w-0" dir={ar ? 'rtl' : 'ltr'}>
    <FinancialReportLanguage />
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{tr('حزمة القوائم المالية', 'Financial statement package')}</CardTitle><CardDescription className="mt-2">{tr('قوائم مترابطة وإيضاحات وتصنيفات محفوظة مع كل نسخة. تُستكمل بيانات الشركة والسياسات قبل الاعتماد.', 'Linked statements, disclosures and classifications stored with each version. Complete company data and policies before approval.')}</CardDescription></div><Badge variant={snapshot?.status === 'approved' ? 'default' : 'secondary'}>{status}</Badge></div></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { const value = { ...configuration, ...defaultStatementConfiguration('2025-12-31'), accountMappings: configuration.accountMappings, notes: configuration.notes, legalForm: configuration.legalForm }; setSelected(null); setConfiguration(value); resetReview(); }}>{tr('إعداد 2025', 'Prepare 2025')}</Button><Button variant="outline" disabled={busy} onClick={() => { const value = { ...configuration, ...defaultStatementConfiguration('2026-08-31'), accountMappings: configuration.accountMappings, notes: configuration.notes, legalForm: configuration.legalForm }; setSelected(null); setConfiguration(value); resetReview(); }}>{tr('إعداد أغسطس 2026', 'Prepare August 2026')}</Button><Button variant="link" asChild><Link to={`/finance/reports/balance-sheet?asOf=${configuration.periodEnd}&compare=${configuration.positionComparisonDate}`}>{tr('الميزانية العمومية التفصيلية', 'Detailed balance sheet')}</Link></Button></div>
        <FinancialStatementPeriodEditor configuration={configuration} onChange={setConfiguration} locale={locale} disabled={editingDisabled} />
        {dirty && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-950">{tr('توجد تغييرات في الإعدادات. احسب الحزمة مجددًا قبل الحفظ أو التصدير.', 'Settings have changed. Recalculate the package before saving or exporting.')}</p>}
        {!valid && <p role="alert" className="text-sm text-destructive">{tr('تواريخ الفترات أو بعض إعدادات الحزمة غير صالحة. راجعها قبل الحساب.', 'Reporting dates or package settings are invalid. Review them before calculating.')}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !valid || Boolean(snapshot)} onClick={applyConfiguration}><RefreshCw className="me-2 h-4 w-4" />{tr('حساب الحزمة', 'Calculate package')}</Button>
          <Button variant="outline" disabled={!canIssue || !live.data?.permissions.canSave || Boolean(snapshot)} onClick={save}><Save className="me-2 h-4 w-4" />{tr('حفظ نسخة للمراجعة', 'Save review version')}</Button>
          {snapshot && <Button variant="outline" disabled={busy} onClick={() => { setSelected(null); resetReview(); }}>{tr('إعداد نسخة جديدة من هذه الإعدادات', 'Prepare a new version from these settings')}</Button>}
          <Button variant="outline" disabled={!canIssue} onClick={() => void exportReport('pdf')}><FileText className="me-2 h-4 w-4" />PDF</Button>
          <Button variant="outline" disabled={!canIssue} onClick={() => void exportReport('excel')}><FileSpreadsheet className="me-2 h-4 w-4" />Excel</Button>
          <Button variant="outline" disabled={!canIssue} onClick={() => void exportReport('print')}><Printer className="me-2 h-4 w-4" />{tr('طباعة', 'Print')}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{tr('التقرير السنوي يستهدف عرض IAS 1، والمرحلي يستهدف متطلبات IAS 34 المنطبقة. لا يولّد النظام إقرارًا بالمطابقة أو شهادة تدقيق خارجي.', 'Annual presentation targets IAS 1 and interim presentation targets applicable IAS 34 requirements. The system does not generate a compliance declaration or an external audit opinion.')}</p>
      </CardContent>
    </Card>

    {(live.error || (snapshot && history.error) || versionMissing) && <Card><CardContent className="pt-6"><p role="alert" className="text-destructive">{versionMissing ? tr('تعذر التحقق من حالة النسخة المحفوظة.', 'The saved version status could not be verified.') : financialStatementPackageError(live.error || history.error, locale)}</p></CardContent></Card>}
    {readBusy && <p role="status">{tr('جارٍ قراءة القيود وإعادة التحقق من الحزمة…', 'Reading journals and rechecking the package…')}</p>}
    {stale && <p role="alert" className="rounded-md bg-amber-50 p-3 text-amber-950">{tr('تغير المصدر بعد حفظ هذه النسخة. يلزم إعداد نسخة جديدة قبل اعتمادها.', 'The source changed after this version was saved. Prepare a new version before approval.')}</p>}

    <Tabs defaultValue="statements" className="min-w-0">
      <TabsList className="h-auto w-full flex flex-wrap justify-start gap-1">
        <TabsTrigger value="statements">{tr('القوائم والفحوص', 'Statements and checks')}</TabsTrigger><TabsTrigger value="mappings">{tr('تصنيف الحسابات', 'Account mappings')}</TabsTrigger><TabsTrigger value="notes">{tr('الإيضاحات', 'Disclosures')}</TabsTrigger><TabsTrigger value="journals">{tr('معالجات القيود', 'Journal treatments')}</TabsTrigger><TabsTrigger value="review">{tr('النسخ والاعتماد', 'Versions and review')}</TabsTrigger><TabsTrigger value="locks">{tr('قفل الفترات', 'Period locks')}</TabsTrigger>
      </TabsList>
      <TabsContent value="statements" className="space-y-5">
        {scoped && report && !readFailed && !readBusy && !dirty && <>
          <Card><CardHeader><CardTitle>{tr('نتائج الفحص', 'Readiness findings')}</CardTitle><CardDescription>{tr('هذه الفحوص تكشف النواقص الفنية والمحاسبية القابلة للفحص؛ توازن الأرقام وحده لا يثبت اكتمال البيانات.', 'These checks identify detectable technical and accounting gaps. Arithmetic balance alone does not establish data completeness.')}</CardDescription></CardHeader><CardContent>
            {report.findings.length ? <ul className="space-y-2">{report.findings.map((finding, index) => <li key={`${finding.code}-${index}`} className={`rounded-md border p-3 text-sm ${finding.severity === 'error' ? 'border-destructive/40' : ''}`}><Badge variant={finding.severity === 'error' ? 'destructive' : 'secondary'} className="me-2">{finding.severity === 'error' ? tr('يمنع الاعتماد', 'Blocks approval') : tr('للمراجعة', 'Review')}</Badge>{ar ? finding.messageAr : finding.messageEn} ({finding.count})</li>)}</ul> : <p>{tr('لا توجد ملاحظات آلية مانعة. تظل المراجعة المحاسبية مطلوبة.', 'No automated blocking findings. Accounting review remains necessary.')}</p>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>{ar ? report.company.nameAr || report.company.name : report.company.name}</CardTitle><CardDescription>{tr('السجل التجاري', 'Commercial register')}: {report.company.commercialRegister || '—'} · {report.configuration.periodStart} — {report.configuration.periodEnd}</CardDescription></CardHeader><CardContent className="space-y-8">{report.statements.map(statement => <StatementTable key={statement.key} statement={statement} locale={locale} currency={report.company.currency} />)}</CardContent></Card>
        </>}
      </TabsContent>
      <TabsContent value="mappings"><Card><CardContent className="pt-6"><FinancialStatementMappingsEditor configuration={configuration} onChange={setConfiguration} locale={locale} disabled={editingDisabled} accounts={report?.position.accounts || []} /></CardContent></Card></TabsContent>
      <TabsContent value="notes"><Card><CardContent className="pt-6"><FinancialStatementNotesEditor configuration={configuration} onChange={setConfiguration} locale={locale} disabled={editingDisabled} /></CardContent></Card></TabsContent>
      <TabsContent value="journals"><Card><CardContent className="pt-6"><FinancialStatementJournalEditor configuration={configuration} onChange={setConfiguration} locale={locale} disabled={editingDisabled} journals={report?.journals || []} /></CardContent></Card></TabsContent>
      <TabsContent value="review" className="space-y-4">
        <Card><CardHeader><CardTitle>{tr('النسخ المحفوظة', 'Saved versions')}</CardTitle><CardDescription>{tr('تحتفظ كل نسخة بالقوائم والتصنيفات والإيضاحات ومصدر الأرقام. الاعتماد يخص الحزمة كاملة.', 'Each version retains statements, classifications, disclosures and the source of amounts. Approval covers the complete package.')}</CardDescription></CardHeader><CardContent className="space-y-3">
          {history.error && <p role="alert">{financialStatementPackageError(history.error, locale)}</p>}
          {!versions.length && !history.error && <p>{tr('لا توجد نسخ محفوظة بعد.', 'No versions have been saved yet.')}</p>}
          {versions.map(saved => <div key={saved.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><bdi>{saved.payload.configuration.periodEnd}</bdi> · {saved.status === 'approved' ? tr('معتمد داخليًا', 'Internally approved') : saved.status === 'voided' ? tr('ملغى', 'Voided') : tr('مسودة', 'Draft')}<p className="text-xs text-muted-foreground">{saved.created_by_name} · <bdi>{saved.created_at}</bdi></p></div><Button variant="outline" disabled={busy} onClick={() => choose(saved)}>{tr('فتح النسخة', 'Open version')}</Button></div>)}
        </CardContent></Card>
        {snapshot && <Card><CardHeader><CardTitle>{tr('مراجعة النسخة', 'Review this version')}</CardTitle><CardDescription>{tr('مراجع مستقل عن مُعدّ الحزمة، مع تأكيدات وخلاصة مراجعة. لا يستبدل هذا اعتماد مدقق الحسابات الخارجي.', 'A reviewer other than the preparer supplies confirmations and a conclusion. This does not replace external auditor approval.')}</CardDescription></CardHeader><CardContent className="space-y-4">
          <p className="break-all text-xs" dir="ltr">{snapshot.id}<br />{snapshot.source_fingerprint}</p>
          {snapshot.status === 'approved' && <p>{tr('المراجع', 'Reviewer')}: {snapshot.approved_by_name} · <bdi>{snapshot.approved_at}</bdi><br />{snapshot.review_notes}</p>}
          {snapshot.status === 'draft' && <>
            {snapshot.created_by === actorId && <p role="status">{tr('أنت مُعدّ النسخة؛ يلزم أن يراجعها مستخدم مخول آخر.', 'You prepared this version; a different authorized user must review it.')}</p>}
            {(Object.keys(reviewLabels) as (keyof FinancialStatementReview)[]).map(key => <label key={key} className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={review[key]} disabled={!canApprove || busy} onChange={event => setReview({ ...review, [key]: event.target.checked })} />{tr(...reviewLabels[key])}</label>)}
            <Label htmlFor="package-review-notes">{tr('خلاصة المراجعة — 20 حرفًا على الأقل', 'Review conclusion — at least 20 characters')}</Label><Textarea id="package-review-notes" value={reviewNotes} disabled={!canApprove || busy} onChange={event => setReviewNotes(event.target.value)} />
            <Button disabled={!canApprove || !reviewComplete || busy} onClick={approve}><ShieldCheck className="me-2 h-4 w-4" />{tr('اعتماد الحزمة داخليًا', 'Approve package internally')}</Button>
          </>}
          {snapshot.status !== 'voided' && (live.data?.permissions.canApprove || (snapshot.created_by === actorId && live.data?.permissions.canSave)) && <div className="space-y-2 border-t pt-4"><Label htmlFor="package-void-reason">{tr('سبب إلغاء النسخة — 10 أحرف على الأقل', 'Reason to void — at least 10 characters')}</Label><Textarea id="package-void-reason" value={voidReason} disabled={busy} onChange={event => setVoidReason(event.target.value)} /><Button variant="destructive" disabled={busy || voidReason.trim().length < 10 || readBusy || readFailed} onClick={voidReport}>{tr('إلغاء صلاحية إصدار النسخة', 'Void this version')}</Button></div>}
          {snapshot.status === 'voided' && <p>{snapshot.void_reason}</p>}
        </CardContent></Card>}
      </TabsContent>
      <TabsContent value="locks"><Card><CardHeader><CardTitle>{tr('قفل الحركات المحاسبية', 'Lock accounting movements')}</CardTitle><CardDescription>{tr('بعد استكمال البيانات والمراجعة، يمكن منع تعديل الحركات حتى تاريخ محدد. إعادة الفتح تتطلب صلاحية وسببًا محفوظًا؛ لا يغير القفل أي مبلغ.', 'After completing data and review, prevent accounting changes through a chosen date. Reopening requires authorization and a recorded reason. Locking changes no amounts.')}</CardDescription></CardHeader><CardContent className="space-y-4">
        {locks.error && <p role="alert">{financialStatementPackageError(locks.error, locale)}</p>}
        {locks.data && <>
          <p>{locks.data.managed_lock?.status === 'locked' ? `${tr('الحركات مقفلة حتى', 'Movements locked through')} ${locks.data.managed_lock.locked_through}` : tr('القفل المُدار غير مفعل.', 'The managed lock is not active.')}</p>
          {locks.data.other_closed_periods.length > 0 && <div className="text-sm"><p>{tr('فترات أخرى مقفلة وتظل محمية:', 'Other closed periods remain protected:')}</p><ul>{locks.data.other_closed_periods.map(period => <li key={period.id}>{period.period_name}: {period.start_date} — {period.end_date}</li>)}</ul></div>}
          {locks.data.can_manage && <fieldset disabled={busy || locks.isFetching} className="space-y-3"><Label htmlFor="package-lock-cutoff">{tr('قفل الحركات حتى', 'Lock movements through')}</Label><Input id="package-lock-cutoff" type="date" max={financeToday()} value={lockCutoff} onChange={event => setLockCutoff(event.target.value)} />
            <Label htmlFor="package-lock-reason">{tr('سبب القفل أو إعادة الفتح — 20 حرفًا على الأقل', 'Reason for locking or reopening — at least 20 characters')}</Label><Textarea id="package-lock-reason" value={lockReason} onChange={event => setLockReason(event.target.value)} />
            <div className="flex flex-wrap gap-2"><Button disabled={lockReason.trim().length < 20 || !lockCutoff || lockCutoff > financeToday()} onClick={() => void changeLock(false)}><LockKeyhole className="me-2 h-4 w-4" />{tr('قفل الفترة بالتاريخ المحدد', 'Lock through selected date')}</Button><Button variant="outline" disabled={lockReason.trim().length < 20 || locks.data.managed_lock?.status !== 'locked'} onClick={() => void changeLock(true)}>{tr('إعادة فتح القفل المُدار مع تسجيل السبب', 'Reopen managed lock and record reason')}</Button></div>
          </fieldset>}
          {locks.data.history.length > 0 && <details><summary className="cursor-pointer">{tr('سجل القفل وإعادة الفتح', 'Lock and reopening history')}</summary><ul className="mt-3 space-y-2">{locks.data.history.map(event => <li key={event.id} className="rounded-md border p-3 text-sm">{event.action === 'locked' ? tr('قفل', 'Locked') : tr('إعادة فتح', 'Reopened')} · {event.locked_through} · {event.actor_name}<p>{event.reason}</p><bdi className="text-xs">{event.created_at}</bdi></li>)}</ul></details>}
        </>}
      </CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
