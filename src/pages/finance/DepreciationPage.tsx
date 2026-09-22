import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, Info, PlayCircle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useFinanceAccessGuard } from '@/hooks/finance/useFinanceAccessGuard';
import { fleetBridgeErrorMessage } from '@/services/fleetBridge';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import './fleet-bridge.css';

const money = (value: number) =>
  new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(value);

interface DepreciationRow {
  id: string;
  depreciation_date: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  period_type: string;
  asset_name: string | null;
  asset_code: string | null;
  plate_number: string | null;
}

const looseRpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>)(name, args);

export default function DepreciationPage() {
  const { companyId } = useUnifiedCompanyAccess();
  const access = useFinanceAccessGuard();
  const today = new Date();
  const [month, setMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [runDate, setRunDate] = useState(`${month}-28`);
  const [running, setRunning] = useState(false);

  const historyQuery = useQuery({
    queryKey: ['depreciation-history', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) throw new Error('No company access');
      const { data, error } = await supabase
        .from('depreciation_records')
        .select(
          `id, depreciation_date, depreciation_amount, accumulated_depreciation, book_value, period_type,
           fixed_assets!inner(id, asset_name, asset_code, company_id),
           vehicles(fixed_asset_id, plate_number)`
        )
        .eq('fixed_assets.company_id', companyId)
        .order('depreciation_date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data || []).map((row: Record<string, unknown>) => {
        const asset = row.fixed_assets as Record<string, unknown> | null;
        const vehicle = (row.vehicles as Array<Record<string, unknown>> | null)?.[0];
        return {
          ...(row as unknown as Omit<DepreciationRow, 'asset_name' | 'asset_code' | 'plate_number'>),
          asset_name: (asset?.asset_name as string) ?? null,
          asset_code: (asset?.asset_code as string) ?? null,
          plate_number: (vehicle?.plate_number as string) ?? null,
        };
      }) as DepreciationRow[];
    },
  });

  const totals = useMemo(() => {
    const rows = historyQuery.data || [];
    return {
      count: rows.length,
      amount: rows.reduce((sum, row) => sum + (Number(row.depreciation_amount) || 0), 0),
    };
  }, [historyQuery.data]);

  const runDepreciation = async () => {
    if (!companyId || !runDate) return;
    setRunning(true);
    try {
      const { data, error } = await looseRpc('process_vehicle_depreciation_monthly', {
        company_id_param: companyId,
        depreciation_date_param: runDate,
      });
      if (error) throw error;
      const created = Array.isArray(data) ? data.length : 0;
      toast.success(
        created > 0
          ? `رُحّل إهلاك ${created} مركبة لشهر ${month} — راجع القيود الناتجة.`
          : `لا قيود إهلاك جديدة لشهر ${month} (سبق ترحيله أو لا معدلات إهلاك مضبوطة).`
      );
      void historyQuery.refetch();
    } catch (error) {
      toast.error(fleetBridgeErrorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const canRun = access.can('finance.journal.post');

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المالية <span>/</span> الأصول
            </div>
            <h1>الإهلاك الشهري</h1>
            <p>
              تشغيل إهلاك المركبات شهرياً بقيد مدين مصروف إهلاك / دائن مجمع الإهلاك لكل مركبة لها تكلفة ومعدل — مع سجل الإهلاكات المرحّلة. تعمل الجدولة اليومية تلقائياً، وهذه الصفحة للتشغيل اليدوي والمراجعة.
            </p>
          </div>
          <div className="dw-header-tools">
            <Link to="/finance/assets" className="dw-button">الأصول الثابتة</Link>
            <Link to="/finance/journal-entries?referenceType=vehicle_depreciation" className="dw-button">قيود الإهلاك</Link>
          </div>
        </header>

        <PagePanel
          number="01"
          title="تشغيل إهلاك شهر"
          subtitle="اختر الشهر ويوم الترحيل ثم شغّل — التكرار آمن: كل مركبة/شهر يُرحّل مرة واحدة"
          className="wk-panel-full"
          action={
            <button
              type="button"
              className="dw-button dw-button-primary"
              disabled={!canRun || running || !companyId || !runDate}
              onClick={() => void runDepreciation()}
            >
              <PlayCircle size={15} />
              {running ? 'جارٍ التشغيل…' : `شغّل إهلاك ${month}`}
            </button>
          }
        >
          <div className="fb-toolbar">
            <div className="fb-date-field">
              <label htmlFor="dep-month">الشهر</label>
              <input
                id="dep-month"
                type="month"
                value={month}
                max={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`}
                onChange={event => {
                  setMonth(event.target.value);
                  setRunDate(event.target.value ? `${event.target.value}-28` : '');
                }}
              />
            </div>
            <div className="fb-date-field">
              <label htmlFor="dep-date">تاريخ القيد</label>
              <input id="dep-date" type="date" value={runDate} onChange={event => setRunDate(event.target.value)} />
            </div>
            <button type="button" className="dw-button" disabled={historyQuery.isFetching} onClick={() => void historyQuery.refetch()}>
              <RefreshCw size={14} />
              تحديث السجل
            </button>
          </div>
          {!canRun && (
            <p className="fb-alert is-warn">تشغيل الإهلاك يتطلب صلاحية ترحيل القيود.</p>
          )}
          <p className="fb-note">
            <Info size={13} />
            تتطلب كل مركبة تكلفة شراء ومعدل إهلاك مضبوطين؛ والجدولة اليومية (00:30 UTC) ترحّل المستحق تلقائياً.
          </p>
        </PagePanel>

        <PagePanel
          number="02"
          title="سجل الإهلاكات المرحّلة"
          subtitle="آخر 60 سجلاً بقيمة الإهلاك والمجمع والقيمة الدفترية"
          className="wk-panel-full"
          action={
            <div className="fb-summary" style={{ padding: 0 }}>
              <span className="wk-badge is-info">{totals.count} سجلاً</span>
              <span className="wk-badge is-neutral">إجمالي معروض: <bdi>{money(totals.amount)}</bdi></span>
            </div>
          }
        >
          {historyQuery.isLoading ? (
            <p className="fb-note">جارٍ قراءة السجل…</p>
          ) : historyQuery.error ? (
            <p role="alert" className="fb-alert is-error">{fleetBridgeErrorMessage(historyQuery.error)}</p>
          ) : (historyQuery.data || []).length === 0 ? (
            <p className="fb-note">
              <CheckCircle2 size={13} />
              لا سجلات إهلاك بعد — اضبط معدلات الإهلاك على المركبات ثم شغّل الشهر.
            </p>
          ) : (
            <div className="wk-table-wrap fb-table-wrap">
              <table className="fb-table">
                <caption className="sr-only">سجل الإهلاك</caption>
                <thead>
                  <tr>
                    <th scope="col">التاريخ</th>
                    <th scope="col">الأصل</th>
                    <th scope="col">اللوحة</th>
                    <th scope="col">إهلاك الفترة</th>
                    <th scope="col">المجمع</th>
                    <th scope="col">القيمة الدفترية</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyQuery.data || []).map(row => (
                    <tr key={row.id}>
                      <td><bdi>{row.depreciation_date}</bdi></td>
                      <td>{row.asset_name || row.asset_code || '—'}</td>
                      <td className="fb-sub"><bdi>{row.plate_number || '—'}</bdi></td>
                      <td className="fb-num"><bdi>{money(Number(row.depreciation_amount))}</bdi></td>
                      <td className="fb-num"><bdi>{money(Number(row.accumulated_depreciation))}</bdi></td>
                      <td className="fb-num"><bdi>{money(Number(row.book_value))}</bdi></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="fb-note">
            <CalendarClock size={13} />
            الاستبعاد والنقل بين مراكز التكلفة وإطفاء الأصول غير المركبة تُدار من صفحة الأصول الثابتة.
          </p>
        </PagePanel>
      </div>
    </div>
  );
}
