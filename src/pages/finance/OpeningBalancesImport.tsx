import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, FileSpreadsheet, Info, Landmark, RefreshCw, Upload,
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useChartOfAccounts, type ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useJournalEntries, useCreateJournalEntry } from '@/hooks/finance/useJournalEntries';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import {
  buildOpeningEntryDraft,
  parseOpeningBalancesWorkbook,
  type OpeningBalancesWorkbook,
  type OpeningEntryDraft,
  type OpeningLineDraft,
} from '@/components/finance/openingBalances/parseOpeningBalancesWorkbook';
import './opening-balances-import.css';

interface PostableAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string | null;
  account_type?: string | null;
}

type AccountRow = ChartOfAccount & Partial<PostableAccount>;

const normalizeAr = (value: string) =>
  value.toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g, '').replace(/[أإآ]/g, 'ا').trim();

/** Pre-select an account whose name matches any hint; the reviewer can override it. */
function suggestAccount(line: OpeningLineDraft, accounts: PostableAccount[]): PostableAccount | null {
  const hints = line.accountHints.map(normalizeAr);
  const score = (account: PostableAccount) => {
    const name = normalizeAr(`${account.account_name} ${account.account_name_ar || ''}`);
    const exact = hints.findIndex(hint => hint.length > 2 && name.includes(hint));
    return exact === -1 ? -1 : hints.length - exact;
  };
  let best: PostableAccount | null = null;
  let bestScore = -1;
  for (const account of accounts) {
    const value = score(account);
    if (value > bestScore) { best = account; bestScore = value; }
  }
  return best;
}

const money = (value: number) =>
  new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(value);

export default function OpeningBalancesImport() {
  const { companyId, user } = useUnifiedCompanyAccess();
  const [workbook, setWorkbook] = useState<OpeningBalancesWorkbook | null>(null);
  const [fileName, setFileName] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const accountsQuery = useChartOfAccounts(false);
  const journalQuery = useJournalEntries();
  const createEntry = useCreateJournalEntry();

  const accounts = useMemo<PostableAccount[]>(() => {
    const rows = (accountsQuery.data as AccountRow[] | undefined) || [];
    // Only accounts that accept postings per the chart rules (non-header, level ≥ 3).
    return rows
      .filter(row => row.is_header === false && (row.account_level ?? 0) >= 3)
      .map(row => ({
        id: row.id,
        account_code: row.account_code,
        account_name: row.account_name,
        account_name_ar: row.account_name_ar ?? null,
        account_type: row.account_type ?? null,
      }));
  }, [accountsQuery.data]);

  const earliestEntryDate = useMemo(() => {
    const rows = (journalQuery.data as unknown as Array<{ entry_date?: string }> | undefined) || [];
    const dates = rows.map(row => row.entry_date).filter((value): value is string => !!value).sort();
    return dates[0] ?? null;
  }, [journalQuery.data]);

  const suggestedDate = useMemo(() => {
    if (earliestEntryDate) {
      const day = new Date(`${earliestEntryDate}T00:00:00Z`);
      day.setUTCDate(day.getUTCDate() - 1);
      return day.toISOString().slice(0, 10);
    }
    return workbook?.company.cutoffDate ?? new Date().toISOString().slice(0, 10);
  }, [earliestEntryDate, workbook]);

  const [entryDate, setEntryDate] = useState('');
  const effectiveEntryDate = entryDate || suggestedDate;

  const draft: OpeningEntryDraft | null = useMemo(
    () => (workbook ? buildOpeningEntryDraft(workbook) : null),
    [workbook],
  );

  const suggested = useMemo(() => {
    const map: Record<string, PostableAccount | null> = {};
    draft?.lines.forEach(line => { map[line.key] = suggestAccount(line, accounts); });
    return map;
  }, [draft, accounts]);

  const unmappedLines = draft ? draft.lines.filter(line => !overrides[line.key] && !suggested[line.key]).length : 0;
  const canPost = Boolean(
    companyId && draft && draft.lines.length >= 2 && Math.abs(draft.balance) < 0.01 && unmappedLines === 0 && !createEntry.isPending,
  );

  const handleFile = async (file: File) => {
    setParseError('');
    setWorkbook(null);
    setOverrides({});
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseOpeningBalancesWorkbook(buffer);
      setWorkbook(parsed);
      setFileName(file.name);
      toast.success('تمت قراءة ملف أوراق العمل');
    } catch (error) {
      const message = error instanceof Error && error.message === 'OPENING_WORKBOOK_NOT_RECOGNIZED'
        ? 'لم يُعرف الملف: تأكد أنه ملف «أوراق عمل مالية للشركة» بأوراقه الأصلية.'
        : 'تعذر قراءة الملف. تأكد أنه ملف Excel صالح ثم أعد المحاولة.';
      setParseError(message);
    }
  };

  const post = async () => {
    if (!draft || !companyId || !user?.id || !canPost) return;
    try {
      await createEntry.mutateAsync({
        entry_number: `OPEN-${effectiveEntryDate}`,
        entry_date: effectiveEntryDate,
        description: 'قيد افتتاحي — أرصدة أول المدة من أوراق العمل المالية',
        reference_type: 'opening_balance',
        lines: draft.lines.map(line => ({
          account_id: overrides[line.key] || suggested[line.key]?.id || '',
          line_description: `${line.label} — ${line.detail}`,
          debit_amount: line.side === 'debit' ? line.amount : 0,
          credit_amount: line.side === 'credit' ? line.amount : 0,
        })),
      } as Parameters<typeof createEntry.mutateAsync>[0]);
      toast.success('رُحّل القيد الافتتاحي. افتح الميزانية العمومية لمراجعة الأثر.');
    } catch {
      // useCreateJournalEntry surfaces its own error toast.
    }
  };

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المالية <span>/</span> المحاسبة العامة
            </div>
            <h1>الأرصدة الافتتاحية</h1>
            <p>
              ارفع ملف «أوراق عمل مالية للشركة» بعد تعبئته، راجع القيد الافتتاحي المتوازن، ثم رحّله بتاريخ يسبق أقدم قيد في النظام — فلا يتكرر معه أي شيء مسجل سابقاً.
            </p>
          </div>
          <div className="dw-header-tools">
            <Link to="/finance/journal-entries" className="dw-button">سجل القيود</Link>
            <Link to="/finance/reports/balance-sheet" className="dw-button">الميزانية العمومية</Link>
          </div>
        </header>

        <PagePanel
          number="01"
          title="رفع ملف أوراق العمل"
          subtitle="ملف الإكسل نفسه المعد لأوراق العمل المالية: بيانات الشركة، الأصول، الخصوم، وسجل الإيصالات"
          className="wk-panel-full"
        >
          <div className="ob-toolbar">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="ob-file-input"
              aria-label="اختر ملف أوراق العمل"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <button type="button" className="dw-button" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
              {fileName || 'اختر ملف Excel…'}
            </button>
            {fileName && (
              <button type="button" className="dw-button" onClick={() => { setWorkbook(null); setFileName(''); setOverrides({}); if (fileRef.current) fileRef.current.value = ''; }}>
                <RefreshCw size={15} />
                ملف آخر
              </button>
            )}
          </div>
          {parseError && <p role="alert" className="ob-alert is-error">{parseError}</p>}
          {workbook?.warnings.map(warning => (
            <p key={warning} role="alert" className="ob-alert is-warn">
              <AlertTriangle size={13} style={{ marginInlineEnd: 6, verticalAlign: '-2px' }} />
              {warning}
            </p>
          ))}
          {workbook && (
            <div className="ob-summary">
              <span className="wk-badge is-ok"><CheckCircle2 size={12} /> {workbook.vehicles.length} مركبة</span>
              <span className="wk-badge is-warn"><AlertTriangle size={12} /> {workbook.vehiclesMissingCost} بلا تكلفة</span>
              <span className="wk-badge is-info">{workbook.liabilities.length} التزام</span>
              <span className="wk-badge is-info">{workbook.receipts.length} إيصال ({money(workbook.receiptTotal)})</span>
              {workbook.company.cutoffDate && (
                <span className="wk-badge is-neutral">تاريخ القطع بالملف: <bdi>{workbook.company.cutoffDate}</bdi></span>
              )}
            </div>
          )}
          {workbook && workbook.receipts.length > 0 && (
            <p className="ob-note">
              <Info size={13} />
              سجل الإيصالات لا يدخل القيد الافتتاحي (هو إيرادات وقد تكون محصلة ومسجلة). بعد ترحيل القيد، مرّر الإيصالات المرتبطة بعقود عبر
              <Link to="/finance/payments/import-excel" className="ob-inline-link"> استيراد الدفعات</Link>
              — وهو يتخطى المكرر تلقائياً.
            </p>
          )}
        </PagePanel>

        <PagePanel
          number="02"
          title="تاريخ القيد الافتتاحي"
          subtitle="يؤرَّخ قبل أقدم قيد موجود في النظام لاستحالة التداخل مع ما هو مسجل"
          className="wk-panel-full"
        >
          <div className="ob-toolbar">
            <div className="ob-date-field">
              <label htmlFor="ob-entry-date">تاريخ القيد</label>
              <input
                id="ob-entry-date"
                type="date"
                value={effectiveEntryDate}
                onChange={event => setEntryDate(event.target.value)}
              />
            </div>
            <p className="ob-note-inline">
              {earliestEntryDate
                ? <>أقدم قيد في النظام: <bdi>{earliestEntryDate}</bdi> — الاقتراح قبله بيوم.</>
                : 'لا توجد قيود في النظام بعد؛ استُخدم تاريخ القطع من الملف.'}
            </p>
          </div>
        </PagePanel>

        {draft && (
          <PagePanel
            number="03"
            title="مراجعة القيد الافتتاحي"
            subtitle="لكل بند حساب مقترح بالاسم المطابق — راجعه وغيّره قبل الترحيل"
            className="wk-panel-full"
            action={
              <div className="ob-totals">
                <span>مدين <bdi>{money(draft.debits)}</bdi></span>
                <span>دائن <bdi>{money(draft.credits)}</bdi></span>
                {Math.abs(draft.balance) < 0.01
                  ? <span className="wk-badge is-ok"><CheckCircle2 size={12} /> متوازن</span>
                  : <span className="wk-badge is-risk">فرق {money(draft.balance)}</span>}
              </div>
            }
          >
            <div className="wk-table-wrap ob-lines-table">
              <table>
                <caption className="sr-only">بنود القيد الافتتاحي</caption>
                <thead>
                  <tr>
                    <th scope="col">البند</th>
                    <th scope="col">التفصيل</th>
                    <th scope="col">الحساب المحاسبي</th>
                    <th scope="col">مدين</th>
                    <th scope="col">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map(line => {
                    const selected = overrides[line.key] || suggested[line.key]?.id || '';
                    return (
                      <tr key={line.key} className={line.key === 'opening-equity' ? 'ob-balance-row' : ''}>
                        <td><strong>{line.label}</strong></td>
                        <td className="ob-detail">{line.detail}</td>
                        <td>
                          <select
                            className="ob-account-select"
                            aria-label={`حساب بند ${line.label}`}
                            value={selected}
                            onChange={event => setOverrides(current => ({ ...current, [line.key]: event.target.value }))}
                          >
                            <option value="">— اختر الحساب —</option>
                            {accounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.account_code} — {account.account_name_ar || account.account_name}
                              </option>
                            ))}
                          </select>
                          {!selected && (
                            <span className="wk-badge is-warn"><AlertTriangle size={11} /> يحتاج حساباً</span>
                          )}
                        </td>
                        <td className="ob-num">{line.side === 'debit' ? <bdi>{money(line.amount)}</bdi> : ''}</td>
                        <td className="ob-num">{line.side === 'credit' ? <bdi>{money(line.amount)}</bdi> : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="ob-post-row">
              <button
                type="button"
                className="dw-button dw-button-primary"
                disabled={!canPost}
                onClick={() => void post()}
              >
                <Landmark size={16} />
                {createEntry.isPending ? 'جارٍ الترحيل…' : 'ترحيل القيد الافتتاحي'}
              </button>
              {unmappedLines > 0 && (
                <span className="ob-note-inline">
                  <AlertTriangle size={13} />
                  {unmappedLines} بند بلا حساب محاسبي — اربطه قبل الترحيل.
                </span>
              )}
            </div>
            <p className="ob-note">
              <FileSpreadsheet size={13} />
              تذكير: صنّف دليل الحسابات (متداول/غير متداول) بعد الترحيل إن لم يكن مصنفاً، لتظهر البنود في مواضعها الصحيحة بالميزانية.
            </p>
          </PagePanel>
        )}
      </div>
    </div>
  );
}
