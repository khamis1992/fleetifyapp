import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeftRight, CheckCircle2, Coins, Info, Landmark, RefreshCw, Wallet,
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useChartOfAccounts, type ChartOfAccount } from '@/hooks/useChartOfAccounts';
import {
  useBankReconciliation,
  usePostBankTransaction,
  useSyncLedgerToBank,
} from '@/hooks/finance/useBankReconciliation';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import './fleet-bridge.css';

interface PostableAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string | null;
  account_type?: string | null;
}

type AccountRow = ChartOfAccount & Partial<PostableAccount>;

const money = (value: number) =>
  new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(value);

export default function BankReconciliation() {
  const { companyId } = useUnifiedCompanyAccess();
  const reconQuery = useBankReconciliation();
  const accountsQuery = useChartOfAccounts(false);
  const sync = useSyncLedgerToBank();
  const postTxn = usePostBankTransaction();
  const [counterparts, setCounterparts] = useState<Record<string, string>>({});

  const recon = reconQuery.data;

  const accounts = useMemo<PostableAccount[]>(() => {
    const rows = (accountsQuery.data as AccountRow[] | undefined) || [];
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

  const totalDifference = (recon?.banks || []).reduce(
    (sum, bank) => sum + (bank.moduleBalance - bank.ledgerBalance), 0);

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المالية <span>/</span> المطابقة
            </div>
            <h1>مطابقة البنك مع الدفتر</h1>
            <p>
              يقارن رصيد وحدة البنوك مع حساب البنك في دفتر الأستاذ، ويزامن حركات الدفتر إلى الوحدة، ويُرحّل الحركات المكتملة التي بلا قيد بعد اختيار طرفها المقابل — مع صورة النقد غير المطبق.
            </p>
          </div>
          <div className="dw-header-tools">
            <Link to="/finance/treasury" className="dw-button">الخزينة</Link>
            <Link to="/finance/journal-entries?referenceType=bank_transaction" className="dw-button">قيود البنك</Link>
          </div>
        </header>

        <PagePanel
          number="01"
          title="أرصدة المطابقة"
          subtitle="فرق الرصيد = وحدة البنوك − حساب البنك بالدفتر؛ يُفسَّر بالافتتاحي غير المرحّل والحركات بلا قيد"
          className="wk-panel-full"
          action={
            <button
              type="button"
              className="dw-button dw-button-primary"
              disabled={sync.isPending || !companyId}
              onClick={() => sync.mutate()}
            >
              <ArrowLeftRight size={15} />
              {sync.isPending ? 'جارٍ التزامن…' : 'زامن الدفتر إلى البنك'}
            </button>
          }
        >
          {recon ? (
            <div className="fb-summary">
              {(recon.banks.length ? recon.banks : []).map(bank => (
                <span key={bank.id} className="wk-badge is-neutral">
                  {bank.nameAr}: وحدة <bdi>{money(bank.moduleBalance)}</bdi> / دفتر <bdi>{money(bank.ledgerBalance)}</bdi>
                </span>
              ))}
              {recon.banks.length === 0 && (
                <span className="wk-badge is-warn"><AlertTriangle size={12} /> لا بنوك مسجلة — اربط البنك بحساب الدفتر أولاً</span>
              )}
              <span className={Math.abs(totalDifference) < 0.01 ? 'wk-badge is-ok' : 'wk-badge is-warn'}>
                فرق إجمالي: <bdi>{money(totalDifference)}</bdi>
              </span>
              <span className="wk-badge is-info">
                <Coins size={12} /> نقد غير مطبق: {recon.unappliedCash.count} دفعة (<bdi>{money(recon.unappliedCash.amount)}</bdi>)
              </span>
              <span className="wk-badge is-neutral">
                رصيد دفعات مقدمة: <bdi>{money(recon.unappliedAdvancesBalance)}</bdi>
              </span>
            </div>
          ) : reconQuery.isLoading ? (
            <p className="fb-note">جارٍ قراءة أرصدة المطابقة…</p>
          ) : (
            <p role="alert" className="fb-alert is-error">تعذر تحميل بيانات المطابقة — أعد المحاولة.</p>
          )}
          <p className="fb-note">
            <Info size={13} />
            «زامن الدفتر إلى البنك» ينشئ حركة بنك لكل قيد مرحّل على حساب البنك ليس له حركة مقابلة، ثم يعيد حساب رصيد الوحدة من الافتتاحي وصافي الحركات.
          </p>
        </PagePanel>

        <PagePanel
          number="02"
          title="حركات مكتملة بلا قيد"
          subtitle="اختر الحساب المقابل لكل حركة ثم رحّلها — الحركات المستقبلية تبقى مسودة مجدولة"
          className="wk-panel-full"
        >
          {recon && recon.unpostedTransactions.length > 0 ? (
            <div className="wk-table-wrap fb-table-wrap">
              <table className="fb-table">
                <caption className="sr-only">حركات بنكية بلا قيد</caption>
                <thead>
                  <tr>
                    <th scope="col">التاريخ</th>
                    <th scope="col">الرقم</th>
                    <th scope="col">النوع</th>
                    <th scope="col">البيان</th>
                    <th scope="col">المبلغ</th>
                    <th scope="col">الحساب المقابل</th>
                    <th scope="col">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {recon.unpostedTransactions.map(txn => {
                    const chosen = counterparts[txn.id] || '';
                    return (
                      <tr key={txn.id}>
                        <td><bdi>{txn.date}</bdi></td>
                        <td className="fb-sub"><bdi>{txn.number || '—'}</bdi></td>
                        <td>{txn.type === 'deposit' ? 'إيداع' : txn.type === 'withdrawal' ? 'سحب' : txn.type}</td>
                        <td>{txn.description || '—'}</td>
                        <td className="fb-num"><bdi>{money(txn.amount)}</bdi></td>
                        <td>
                          <select
                            className="ob-account-select"
                            aria-label={`الحساب المقابل لحركة ${txn.number || txn.date}`}
                            value={chosen}
                            onChange={event => setCounterparts(current => ({ ...current, [txn.id]: event.target.value }))}
                          >
                            <option value="">— اختر الحساب المقابل —</option>
                            {accounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.account_code} — {account.account_name_ar || account.account_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dw-button"
                            disabled={!chosen || postTxn.isPending}
                            onClick={() => postTxn.mutate({ transactionId: txn.id, counterpartAccountId: chosen })}
                          >
                            <Landmark size={14} />
                            {postTxn.isPending ? '…' : 'ولّد القيد'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="fb-note">
              <CheckCircle2 size={13} />
              كل الحركات البنكية المكتملة لها قيود — لا شيء بانتظار الترحيل.
            </p>
          )}
        </PagePanel>

        <PagePanel
          number="03"
          title="النقد غير المطبق"
          subtitle="مقبوضات مكتملة غير مرتبطة بفاتورة — تُقيَّد كدفعات عملاء مقدمة حتى تخصيصها"
          className="wk-panel-full"
        >
          {recon ? (
            <div className="fb-summary">
              <span className="wk-badge is-warn"><Wallet size={12} /> {recon.unappliedCash.count} دفعة غير مطبقة</span>
              <span className="wk-badge is-neutral">إجماليها: <bdi>{money(recon.unappliedCash.amount)}</bdi></span>
              <span className="wk-badge is-info">رصيد الدفعات المقدمة بالدفتر: <bdi>{money(recon.unappliedAdvancesBalance)}</bdi></span>
            </div>
          ) : null}
          <p className="fb-note">
            <Info size={13} />
            الدفعات الجديدة غير المرتبطة بفاتورة تُقيَّد تلقائياً على «دفعات العملاء المقدمة» (20201) بدل الإيراد، ويُعترف بالإيراد عند ترحيل فاتورة استحقاقها؛ خصّصها من صفحة الدفعات أو فاتورة العقد.
          </p>
        </PagePanel>

        <button
          type="button"
          className="dw-button"
          style={{ margin: '0 24px 18px' }}
          disabled={reconQuery.isFetching}
          onClick={() => void reconQuery.refetch()}
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>
    </div>
  );
}
