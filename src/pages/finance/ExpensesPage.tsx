import { Link } from 'react-router-dom';
import { ArrowLeftRight, Info, Landmark, PlusCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { fleetBridgeErrorMessage } from '@/services/fleetBridge';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import './fleet-bridge.css';

const money = (value: number) =>
  new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(value);

interface ExpenseRow {
  id: string;
  entry_date: string;
  entry_number: string;
  description: string;
  amount: number;
  account_code: string;
  account_name: string | null;
  account_name_ar: string | null;
}

export default function ExpensesPage() {
  const { companyId } = useUnifiedCompanyAccess();

  const recentQuery = useQuery({
    queryKey: ['recent-expense-entries', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) throw new Error('No company access');
      // Two-step fetch avoids embedded chart filters (a known PostgREST
      // fragility): resolve expense account ids first, then their lines.
      const { data: accountRows, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_name_ar')
        .eq('company_id', companyId)
        .eq('account_type', 'expenses')
        .eq('is_header', false);
      if (accountsError) throw accountsError;
      const ids = (accountRows || []).map(row => row.id);
      if (!ids.length) return [] as ExpenseRow[];
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(
          'id, debit_amount, account_id, journal_entries!inner(id, entry_date, entry_number, description, company_id, status)'
        )
        .eq('journal_entries.company_id', companyId)
        .eq('journal_entries.status', 'posted')
        .in('account_id', ids)
        .gt('debit_amount', 0)
        .order('journal_entries.entry_date', { ascending: false, referencedTable: 'journal_entries' })
        .limit(30);
      if (error) throw error;
      const byId = new Map((accountRows || []).map(row => [row.id, row]));
      return (data || []).map((row: Record<string, unknown>) => {
        const entry = row.journal_entries as Record<string, string>;
        const account = byId.get(String(row.account_id));
        return {
          id: row.id as string,
          entry_date: entry.entry_date,
          entry_number: entry.entry_number,
          description: entry.description,
          amount: Number(row.debit_amount || 0),
          account_code: account?.account_code ?? '',
          account_name: account?.account_name ?? null,
          account_name_ar: account?.account_name_ar ?? null,
        };
      }) as ExpenseRow[];
    },
  });

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المالية <span>/</span> المحاسبة العامة
            </div>
            <h1>المصروفات</h1>
            <p>
              تُسجَّل المصروفات والمشتريات عبر قيود اليومية مباشرة: مدين حساب المصروف / دائن النقد أو ذمم الموردين (21111). لا موديول موردين مستقل بعد — وهذه الصفحة تجمع آخر قيود المصروفات المرحّلة للمراجعة.
            </p>
          </div>
          <div className="dw-header-tools">
            <Link to="/finance/journal-entries?action=new" className="dw-button dw-button-primary">
              <PlusCircle size={15} />
              قيد مصروف جديد
            </Link>
            <Link to="/finance/journal-entries" className="dw-button">سجل القيود</Link>
          </div>
        </header>

        <PagePanel
          number="01"
          title="كيف يُسجَّل المصروف"
          subtitle="دورة موحدة عبر الدفتر — بلا شاشات وسيطة"
          className="wk-panel-full"
        >
          <div className="fb-summary">
            <span className="wk-badge is-info"><Landmark size={12} /> قيد يدوي: مدين المصروف / دائن النقد</span>
            <span className="wk-badge is-info"><ArrowLeftRight size={12} /> بالأجل: دائن ذمم الموردين 21111</span>
            <span className="wk-badge is-neutral">الأقساط: قيدها آلي من وحدة أقساط المركبات</span>
          </div>
          <p className="fb-note">
            <Info size={13} />
            لربط حسابات المصروفات بأدوارها (رواتب، تأمين، صيانة…) استخدم «قائمة مراجعة خرائط الحسابات» في صفحة ترحيل الأسطول والتمويل.
          </p>
        </PagePanel>

        <PagePanel
          number="02"
          title="آخر قيود المصروفات المرحّلة"
          subtitle="أحدث 30 بنداً على حسابات المصروفات"
          className="wk-panel-full"
        >
          {recentQuery.isLoading ? (
            <p className="fb-note">جارٍ القراءة…</p>
          ) : recentQuery.error ? (
            <p role="alert" className="fb-alert is-error">{fleetBridgeErrorMessage(recentQuery.error)}</p>
          ) : (recentQuery.data || []).length === 0 ? (
            <p className="fb-note">لا قيود مصروفات مرحّلة بعد.</p>
          ) : (
            <div className="wk-table-wrap fb-table-wrap">
              <table className="fb-table">
                <caption className="sr-only">قيود المصروفات</caption>
                <thead>
                  <tr>
                    <th scope="col">التاريخ</th>
                    <th scope="col">القيد</th>
                    <th scope="col">البيان</th>
                    <th scope="col">الحساب</th>
                    <th scope="col">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentQuery.data || []).map(row => (
                    <tr key={row.id}>
                      <td><bdi>{row.entry_date}</bdi></td>
                      <td className="fb-sub"><bdi>{row.entry_number}</bdi></td>
                      <td>{row.description}</td>
                      <td className="fb-sub">{row.account_code} — {row.account_name_ar || row.account_name}</td>
                      <td className="fb-num"><bdi>{money(row.amount)}</bdi></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PagePanel>
      </div>
    </div>
  );
}
