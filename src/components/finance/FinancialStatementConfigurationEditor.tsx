import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BalanceSheetAccount, BalanceSheetLocale } from '@/types/balanceSheet';
import type { FinancialStatementConfiguration, ProfessionalFinancialStatementPackage, StatementAccountMapping, StatementJournalOverride } from '@/types/financialStatementPackage';
import { dateBefore, emptyAccountMapping, incomeLineOptions, noteDefinitions, positionLineOptions, previousYearDate } from '@/utils/financialStatementConfiguration';

const selectClass = 'h-10 w-full rounded-md border bg-background px-2 text-sm';
type Props = { configuration: FinancialStatementConfiguration; onChange: (value: FinancialStatementConfiguration) => void; locale: BalanceSheetLocale; disabled?: boolean };

export function FinancialStatementPeriodEditor({ configuration: config, onChange, locale, disabled }: Props) {
  const ar = locale === 'ar', tr = (a: string, e: string) => ar ? a : e;
  const update = (change: Partial<FinancialStatementConfiguration>) => onChange({ ...config, ...change });
  const period = (start: string, end: string) => {
    const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
    update({ periodStart: start, periodEnd: end, ...(valid(start) && valid(end) ? { positionComparisonDate: dateBefore(start),
      comparativePeriodStart: previousYearDate(start), comparativePeriodEnd: previousYearDate(end),
      thirdPositionDate: config.requiresThirdPosition ? dateBefore(previousYearDate(start)) : null } : {}) });
  };
  return <fieldset disabled={disabled} className="space-y-4">
    <legend className="mb-3 font-semibold">{tr('الفترة ونطاق الإعداد', 'Reporting period and scope')}</legend>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><Label htmlFor="package-kind">{tr('نوع التقرير', 'Report type')}</Label><select id="package-kind" className={selectClass} value={config.kind} onChange={event => update({ kind: event.target.value as typeof config.kind })}>
        <option value="annual">{tr('سنوي', 'Annual')}</option><option value="interim">{tr('مرحلي تراكمي منذ بداية السنة', 'Interim year to date')}</option>
      </select></div>
      <div><Label htmlFor="package-start">{tr('بداية السنة المالية', 'Financial year start')}</Label><Input id="package-start" type="date" value={config.periodStart} onChange={event => period(event.target.value, config.periodEnd)} /></div>
      <div><Label htmlFor="package-end">{tr('تاريخ القوائم', 'Reporting date')}</Label><Input id="package-end" type="date" value={config.periodEnd} onChange={event => period(config.periodStart, event.target.value)} /></div>
      <div><Label htmlFor="package-legal-form">{tr('الشكل القانوني', 'Legal form')}</Label><select id="package-legal-form" className={selectClass} value={config.legalForm} onChange={event => update({ legalForm: event.target.value as typeof config.legalForm })}>
        <option value="unspecified">{tr('يحدد لاحقًا', 'To be confirmed')}</option><option value="llc">{tr('شركة ذات مسؤولية محدودة', 'Limited liability company')}</option><option value="sole_establishment">{tr('مؤسسة فردية', 'Sole establishment')}</option><option value="other">{tr('شكل آخر — يوضح في الإيضاحات', 'Other — describe in the notes')}</option>
      </select></div>
    </div>
    <div className="rounded-md bg-muted p-3 text-sm">
      <p>{tr('نطاق هذه الحزمة: قوائم الكيان الفردي؛ إطار الإعداد المستهدف IFRS. لا تمثل قوائم مجموعة موحدة أو إقرارًا بالمطابقة.', 'Scope: individual entity statements targeting IFRS preparation. This is not a consolidated group package or a declaration of compliance.')}</p>
      <p className="mt-2">{tr('مقارنة المركز المالي:', 'Position comparison:')} <bdi>{config.positionComparisonDate}</bdi> · {tr('مقارنة النتائج والتدفقات:', 'Performance and cash-flow comparison:')} <bdi>{config.comparativePeriodStart} — {config.comparativePeriodEnd}</bdi></p>
      <p className="mt-1">{tr('تُعرض الأرقام بوحدات العملة المحددة للشركة وبمنزلتين عشريتين.', 'Amounts are presented in the company currency, to two decimal places.')}</p>
    </div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={config.requiresThirdPosition} onChange={event => update({ requiresThirdPosition: event.target.checked,
      thirdPositionDate: event.target.checked && /^\d{4}-\d{2}-\d{2}$/.test(config.comparativePeriodStart) ? dateBefore(config.comparativePeriodStart) : null })} />
      <span>{tr('تستلزم المعالجة بأثر رجعي أو إعادة التصنيف عرض مركز مالي ثالث في بداية الفترة المقارنة.', 'Retrospective treatment or reclassification requires an opening comparative statement of financial position.')}</span></label>
    {config.requiresThirdPosition && <p className="text-sm">{tr('تاريخ المركز الثالث:', 'Third position date:')} <bdi>{config.thirdPositionDate}</bdi></p>}
  </fieldset>;
}

function MappingRow({ account, mapping, onChange, ar, third, disabled }: { account: BalanceSheetAccount; mapping: StatementAccountMapping; onChange: (value: StatementAccountMapping) => void; ar: boolean; third: boolean; disabled?: boolean }) {
  const tr = (a: string, e: string) => ar ? a : e;
  const positions = positionLineOptions.filter(item => item.type === account.type);
  const selectPosition = (id: string, value: StatementAccountMapping['positionLine'], update: (value: StatementAccountMapping['positionLine']) => void, inherited = false) => <select aria-label={`${tr('بند العرض', 'Presentation line')} ${id} ${account.code}`} disabled={disabled} className={selectClass} value={value || ''} onChange={event => update((event.target.value || null) as StatementAccountMapping['positionLine'])}>
    <option value="">{inherited ? tr('نفس التصنيف بعد المراجعة', 'Same classification after review') : tr('غير مصنف', 'Unmapped')}</option>
    {positions.map(item => <option key={item.value} value={item.value}>{ar ? item.ar : item.en}</option>)}</select>;
  const splitEditor = (key: 'currentSplit' | 'comparisonSplit' | 'thirdSplit', label: string) => <div className="grid gap-2 sm:grid-cols-2">
    <select aria-label={`${label} ${account.code}`} disabled={disabled} className={selectClass} value={mapping[key]?.line || ''} onChange={event => onChange({ ...mapping, [key]: event.target.value ? { line: event.target.value, amount: mapping[key]?.amount || 0 } : null })}>
      <option value="">{tr('دون تقسيم', 'No split')}</option>{positions.map(item => <option key={item.value} value={item.value}>{ar ? item.ar : item.en}</option>)}</select>
    {mapping[key] && <Input disabled={disabled} aria-label={`${label} ${tr('المبلغ بإشارته', 'Signed amount')} ${account.code}`} type="number" step="0.01" value={mapping[key]?.amount} onChange={event => onChange({ ...mapping, [key]: { ...mapping[key], amount: Number(event.target.value) } })} />}
  </div>;
  return <div className="rounded-md border p-3 space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><b>{account.code} — {ar ? account.nameAr || account.name : account.name}</b><span className="text-sm tabular-nums">{account.balance.toFixed(2)} / {account.comparisonBalance.toFixed(2)}</span></div>
    {['asset', 'liability', 'equity'].includes(account.type) && <div className="grid gap-3 sm:grid-cols-2">
      <div><p className="text-sm mb-1">{tr('بند الفترة الحالية', 'Current position line')}</p>{selectPosition('current', mapping.positionLine, value => onChange({ ...mapping, positionLine: value }))}</div>
      <div><p className="text-sm mb-1">{tr('بند المقارنة', 'Comparative position line')}</p>{selectPosition('comparison', mapping.comparisonPositionLine, value => onChange({ ...mapping, comparisonPositionLine: value }), true)}</div>
      {third && <div><p className="text-sm mb-1">{tr('بند المركز الثالث', 'Opening comparative position line')}</p>{selectPosition('third', mapping.thirdPositionLine, value => onChange({ ...mapping, thirdPositionLine: value }), true)}</div>}
    </div>}
    {['revenue', 'expense'].includes(account.type) && <div><Label htmlFor={`income-${account.id}`}>{tr('بند الأرباح والخسائر', 'Profit or loss line')}</Label><select id={`income-${account.id}`} className={selectClass} disabled={disabled} value={mapping.incomeLine || ''} onChange={event => onChange({ ...mapping, incomeLine: (event.target.value || null) as StatementAccountMapping['incomeLine'] })}>
      <option value="">{tr('غير مصنف', 'Unmapped')}</option>{incomeLineOptions.map(item => <option key={item.value} value={item.value}>{ar ? item.ar : item.en}</option>)}</select></div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor={`cashflow-${account.id}`}>{tr('نشاط التدفق عند التسوية نقدًا', 'Cash-flow activity when settled in cash')}</Label><select id={`cashflow-${account.id}`} className={selectClass} disabled={disabled} value={mapping.cashFlowCategory || ''} onChange={event => onChange({ ...mapping, cashFlowCategory: (event.target.value || null) as StatementAccountMapping['cashFlowCategory'] })}>
        <option value="">{tr('يحدد لاحقًا', 'To be confirmed')}</option><option value="operating">{tr('تشغيلي', 'Operating')}</option><option value="investing">{tr('استثماري', 'Investing')}</option><option value="financing">{tr('تمويلي', 'Financing')}</option><option value="exchange">{tr('أثر تغير أسعار الصرف', 'Exchange-rate effect')}</option>
      </select></div>
      {account.type === 'asset' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={mapping.isCashEquivalent} onChange={event => onChange({ ...mapping, isCashEquivalent: event.target.checked })} />{tr('حساب نقد أو ما في حكمه وفق السياسة المعتمدة', 'Cash or cash equivalent under the reviewed policy')}</label>}
    </div>
    {['asset', 'liability'].includes(account.type) && <details><summary className="cursor-pointer text-sm">{tr('تقسيم جزء من الرصيد بين بنود العرض', 'Split part of the balance between presentation lines')}</summary>
      <p className="my-2 text-xs text-muted-foreground">{tr('المبلغ يحافظ على إشارة الرصيد ولا يغير إجمالي الحساب. راجع آجال كل عمود على حدة.', 'The split keeps the balance sign and does not change the account total. Review maturities for each column.')}</p>
      <p className="text-sm">{tr('الحالي', 'Current')}</p>{splitEditor('currentSplit', tr('تقسيم الحالي', 'Current split'))}
      <p className="text-sm mt-2">{tr('المقارنة', 'Comparison')}</p>{splitEditor('comparisonSplit', tr('تقسيم المقارنة', 'Comparison split'))}
      {third && <><p className="text-sm mt-2">{tr('المركز الثالث', 'Opening comparison')}</p>{splitEditor('thirdSplit', tr('تقسيم المركز الثالث', 'Opening comparison split'))}</>}
    </details>}
  </div>;
}

export function FinancialStatementMappingsEditor({ configuration, onChange, locale, disabled, accounts }: Props & { accounts: BalanceSheetAccount[] }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0);
  const ar = locale === 'ar', tr = (a: string, e: string) => ar ? a : e;
  const mappings = new Map(configuration.accountMappings.map(item => [item.accountId, item]));
  const filtered = accounts.filter(account => `${account.code} ${account.name} ${account.nameAr || ''}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 12)), active = Math.min(page, pages - 1);
  const change = (mapping: StatementAccountMapping) => onChange({ ...configuration, accountMappings: [...configuration.accountMappings.filter(item => item.accountId !== mapping.accountId), mapping].sort((a, b) => a.accountId.localeCompare(b.accountId)) });
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{tr('اربط الحسابات ببنود القوائم والسياسات الفعلية. لا يغيّر هذا الربط دليل الحسابات أو القيود. الإشارة السالبة لحساب مقابل مثل مجمع الإهلاك تبقى محفوظة.', 'Map accounts to statement lines and actual policies. These mappings do not change ledger accounts or journals. Contra-account signs remain intact.')}</p>
    <Input aria-label={tr('البحث في حسابات القوائم', 'Search statement accounts')} placeholder={tr('ابحث بالرمز أو الاسم', 'Search by code or name')} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} />
    {!accounts.length && <p>{tr('ستظهر الحسابات بعد قراءة دفتر الأستاذ. يمكن استكمال الإيضاحات والإعدادات أولًا.', 'Accounts appear after reading the ledger. You can prepare notes and settings first.')}</p>}
    {filtered.slice(active * 12, active * 12 + 12).map(account => <MappingRow key={account.id} account={account} mapping={mappings.get(account.id) || emptyAccountMapping(account.id)} onChange={change} ar={ar} third={configuration.requiresThirdPosition} disabled={disabled} />)}
    <div className="flex items-center gap-3"><Button variant="outline" disabled={active === 0} onClick={() => setPage(active - 1)}>{tr('السابق', 'Previous')}</Button><span>{active + 1} / {pages}</span><Button variant="outline" disabled={active >= pages - 1} onClick={() => setPage(active + 1)}>{tr('التالي', 'Next')}</Button></div>
  </div>;
}

export function FinancialStatementNotesEditor({ configuration, onChange, locale, disabled }: Props) {
  const ar = locale === 'ar', tr = (a: string, e: string) => ar ? a : e;
  return <fieldset disabled={disabled} className="space-y-3"><legend className="sr-only">{tr('الإيضاحات المتممة', 'Accompanying notes')}</legend>
    <p className="text-sm text-muted-foreground">{tr('هذه حقول إعداد تُستكمل من السياسات والمستندات الفعلية. تحديد «غير منطبق» يحتاج إلى بيان السبب. اكتمال الحقول لا يمثل تصديقًا خارجيًا.', 'Complete these fields from actual policies and evidence. Explain every not-applicable decision. Completing fields is not external certification.')}</p>
    {configuration.notes.map(note => {
      const definition = noteDefinitions.find(item => item.code === note.code);
      const update = (change: Partial<typeof note>) => onChange({ ...configuration, notes: configuration.notes.map(item => item.code === note.code ? { ...item, ...change } : item) });
      return <details key={note.code} className="rounded-md border p-3" open={note.code === 'basis' || undefined}>
        <summary className="cursor-pointer font-medium">{note.number}. {ar ? note.titleAr : note.titleEn} — {note.status === 'pending' ? tr('غير مستكمل', 'Pending') : note.status === 'complete' ? tr('مستكمل للإعداد', 'Prepared') : tr('غير منطبق', 'Not applicable')}</summary>
        <div className="mt-3 space-y-3"><p className="text-sm text-muted-foreground">{ar ? definition?.hintAr : definition?.hintEn}</p>
          <Label htmlFor={`note-status-${note.code}`}>{tr('حالة الإيضاح', 'Note status')}</Label><select id={`note-status-${note.code}`} className={selectClass} value={note.status} onChange={event => update({ status: event.target.value as typeof note.status })}><option value="pending">{tr('يستكمل لاحقًا', 'Pending')}</option><option value="complete">{tr('مستكمل للإعداد', 'Prepared')}</option><option value="not_applicable">{tr('غير منطبق مع بيان السبب', 'Not applicable with reason')}</option></select>
          <Label htmlFor={`note-text-${note.code}`}>{tr('نص الإيضاح أو سبب عدم الانطباق — 20 حرفًا على الأقل للاعتماد', 'Disclosure or reason — at least 20 characters for approval')}</Label><Textarea id={`note-text-${note.code}`} value={note.text} rows={5} maxLength={20000} onChange={event => update({ text: event.target.value })} />
          <Label htmlFor={`note-evidence-${note.code}`}>{tr('مراجع المستندات والمطابقات — 5 أحرف على الأقل للاعتماد', 'Evidence references — at least 5 characters for approval')}</Label><Textarea id={`note-evidence-${note.code}`} value={note.evidence} rows={2} maxLength={4000} onChange={event => update({ evidence: event.target.value })} />
        </div>
      </details>;
    })}
    <Label htmlFor="package-preparation-notes">{tr('ملاحظات المُعدّ', 'Preparation notes')}</Label><Textarea id="package-preparation-notes" value={configuration.preparationNotes} rows={3} maxLength={10000} onChange={event => onChange({ ...configuration, preparationNotes: event.target.value })} />
  </fieldset>;
}

export function FinancialStatementJournalEditor({ configuration, onChange, locale, disabled, journals }: Props & { journals: ProfessionalFinancialStatementPackage['journals'] }) {
  const ar = locale === 'ar', tr = (a: string, e: string) => ar ? a : e;
  const [search, setSearch] = useState(''), [page, setPage] = useState(0);
  const overrides = new Map(configuration.journalOverrides.map(item => [item.journalId, item]));
  const filtered = journals.filter(journal => `${journal.number} ${journal.date} ${journal.description}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10)), active = Math.min(page, pages - 1);
  const update = (item: StatementJournalOverride) => onChange({ ...configuration, journalOverrides: [...configuration.journalOverrides.filter(value => value.journalId !== item.journalId), item].sort((a, b) => a.journalId.localeCompare(b.journalId)) });
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{tr('تحتاج القيود التي تجمع حركة نقدية وغير نقدية أو معاملات ملاك إلى مراجعة مستقلة. التصنيف هنا للعرض فقط، ولا ينشئ قيودًا أو يغيّر أرصدتها.', 'Mixed cash/non-cash journals and owner transactions need individual review. These classifications affect presentation only; they do not create or change journals.')}</p>
    <Input aria-label={tr('البحث في قيود الحزمة', 'Search package journals')} value={search} placeholder={tr('ابحث برقم القيد أو وصفه', 'Search journal number or description')} onChange={event => { setSearch(event.target.value); setPage(0); }} />
    {filtered.length === 0 && <p>{tr('لا توجد قيود معروضة للمراجعة.', 'There are no journals displayed for review.')}</p>}
    {filtered.slice(active * 10, active * 10 + 10).map(journal => {
      const existing = overrides.get(journal.id);
      const item: StatementJournalOverride = existing || { journalId: journal.id, treatment: journal.effectiveTreatment, internalCashTransfer: 0, equityCategory: null, cashFlows: [], reason: '' };
      return <details className="rounded-md border p-3" key={journal.id}><summary className="cursor-pointer">{journal.date} · {journal.number} · {journal.description} {journal.requiresCashFlowReview || journal.requiresEquityReview ? tr('— يحتاج مراجعة', '— review required') : ''}</summary>
        <fieldset disabled={disabled} className="mt-3 space-y-3"><p className="text-sm">{tr('صافي حركة النقد', 'Net cash movement')}: <bdi>{journal.cashMovement.toFixed(2)}</bdi></p>
          <Label htmlFor={`treatment-${journal.id}`}>{tr('نوع المعالجة', 'Treatment')}</Label><select id={`treatment-${journal.id}`} value={item.treatment} disabled={journal.isCanonicalClosing} className={selectClass} onChange={event => update({ ...item, treatment: event.target.value as typeof item.treatment })}><option value="regular">{tr('حركة عادية', 'Regular movement')}</option><option value="closing">{tr('قيد إقفال — يلزم التحقق', 'Closing entry — verification required')}</option></select>
          {journal.isCanonicalClosing && <p className="text-xs text-muted-foreground">{tr('هذا القيد من سلسلة الإقفال المثبتة في دفتر الأستاذ. تصحيح نوعه يتطلب معالجة مصدره المحاسبي.', 'This journal belongs to the ledger closing chain. Changing its treatment requires correction at the accounting source.')}</p>}
          <Label htmlFor={`equity-${journal.id}`}>{tr('حركة حقوق الملكية', 'Equity movement')}</Label><select id={`equity-${journal.id}`} className={selectClass} value={item.equityCategory || ''} onChange={event => update({ ...item, equityCategory: (event.target.value || null) as typeof item.equityCategory })}>
            <option value="">{tr('غير محدد', 'Unspecified')}</option>{[
              ['contributions', 'مساهمات الملاك', 'Owner contributions'], ['distributions', 'توزيعات الملاك', 'Owner distributions'], ['transfers', 'تحويلات بين الاحتياطيات', 'Reserve transfers'],
              ['prior_adjustments', 'تسويات فترات سابقة', 'Prior-period adjustments'], ['oci_reclassifiable', 'دخل شامل قابل لإعادة التصنيف', 'Reclassifiable OCI'], ['oci_nonreclassifiable', 'دخل شامل غير قابل لإعادة التصنيف', 'Non-reclassifiable OCI'], ['other', 'حركات أخرى موضحة', 'Other explained movements'],
            ].map(([value, arabic, english]) => <option key={value} value={value}>{tr(arabic, english)}</option>)}</select>
          <div className="space-y-2"><p className="text-sm font-medium">{tr('توزيع التدفق النقدي للقيود المركبة', 'Cash-flow allocations for mixed journals')}</p>
            {item.cashFlows.map((flow, index) => <div key={index} className="flex flex-wrap gap-2"><select aria-label={`${tr('نشاط التدفق', 'Cash-flow activity')} ${journal.number} ${index + 1}`} className={`${selectClass} sm:w-48`} value={flow.category} onChange={event => update({ ...item, cashFlows: item.cashFlows.map((value, i) => i === index ? { ...value, category: event.target.value as typeof flow.category } : value) })}><option value="operating">{tr('تشغيلي', 'Operating')}</option><option value="investing">{tr('استثماري', 'Investing')}</option><option value="financing">{tr('تمويلي', 'Financing')}</option><option value="exchange">{tr('أثر الصرف', 'Exchange effect')}</option></select>
              <Input className="sm:w-40" aria-label={`${tr('مبلغ التدفق', 'Cash-flow amount')} ${journal.number} ${index + 1}`} type="number" step="0.01" value={flow.amount} onChange={event => update({ ...item, cashFlows: item.cashFlows.map((value, i) => i === index ? { ...value, amount: Number(event.target.value) } : value) })} />
              <Input className="sm:w-64" aria-label={`${tr('وصف بند التدفق', 'Cash-flow line description')} ${journal.number} ${index + 1}`} placeholder={tr('وصف التحصيل أو السداد', 'Receipt or payment description')} maxLength={200} value={flow.label} onChange={event => update({ ...item, cashFlows: item.cashFlows.map((value, i) => i === index ? { ...value, label: event.target.value } : value) })} />
              <Button variant="outline" onClick={() => update({ ...item, cashFlows: item.cashFlows.filter((_, i) => i !== index) })}>{tr('حذف التوزيع', 'Remove allocation')}</Button>
            </div>)}
            <Button variant="outline" disabled={item.cashFlows.length >= 20} onClick={() => update({ ...item, cashFlows: [...item.cashFlows, { category: 'operating', amount: 0, label: '' }] })}>{tr('إضافة توزيع نقدي', 'Add cash-flow allocation')}</Button>
          </div>
          <Label htmlFor={`journal-transfer-${journal.id}`}>{tr('جزء التحويل الداخلي بين حسابات النقد', 'Internal transfer portion between cash accounts')}</Label><Input id={`journal-transfer-${journal.id}`} type="number" min="0" step="0.01" value={item.internalCashTransfer} onChange={event => update({ ...item, internalCashTransfer: Number(event.target.value) })} />
          <p className="text-xs text-muted-foreground">{tr('يُستبعد التحويل الداخلي من إجمالي المقبوضات والمدفوعات الخارجية بعد التحقق من مستنداته.', 'Verified internal transfers are excluded from gross external receipts and payments.')}</p>
          <Label htmlFor={`journal-reason-${journal.id}`}>{tr('سبب المعالجة ومرجع المستند — 20 حرفًا على الأقل', 'Treatment reason and evidence — at least 20 characters')}</Label><Textarea id={`journal-reason-${journal.id}`} value={item.reason} maxLength={2000} onChange={event => update({ ...item, reason: event.target.value })} />
          {existing && <Button variant="outline" onClick={() => onChange({ ...configuration, journalOverrides: configuration.journalOverrides.filter(value => value.journalId !== journal.id) })}>{tr('إزالة المعالجة الخاصة', 'Remove specific treatment')}</Button>}
        </fieldset>
      </details>;
    })}
    <div className="flex items-center gap-3"><Button variant="outline" disabled={active === 0} onClick={() => setPage(active - 1)}>{tr('السابق', 'Previous')}</Button><span>{active + 1} / {pages}</span><Button variant="outline" disabled={active >= pages - 1} onClick={() => setPage(active + 1)}>{tr('التالي', 'Next')}</Button></div>
  </div>;
}
