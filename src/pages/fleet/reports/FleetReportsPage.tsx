import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Car, CalendarDays, FileSpreadsheet, Printer, RefreshCw, Wallet, Wrench } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import './fleet-reports-workspace.css';
import { useFleetReportDataset } from './hooks/useFleetReports';
import { FLEET_REPORT_SCOPE, type DocumentStatus } from './data/fleetReportModel';
import { exportFleetReport, fleetStatusLabel } from './data/fleetReportExports';
import type { DateFilterPeriod, ExportFormat, ReportFilters } from './types/reports.types';

const periods: Array<{ label: string; value: DateFilterPeriod }> = [{ label: 'اليوم', value: 'today' }, { label: 'آخر 7 أيام', value: 'week' }, { label: 'الشهر', value: 'month' }, { label: 'الربع', value: 'quarter' }, { label: 'السنة', value: 'year' }];
const currency = (value: number | null | undefined) => value == null ? 'غير متاح' : new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(value);
const docStatus = (value: DocumentStatus) => ({ valid: 'ساري بحسب التاريخ المسجل', expiring_soon: 'ينتهي خلال 30 يومًا', expired: 'منتهي', none: 'تاريخ انتهاء غير مسجل' }[value]);

function Panel({ number, title, subtitle, children, wide = false }: { number: string; title: string; subtitle: string; children: ReactNode; wide?: boolean }) {
  return <section className={`dw-panel ${wide ? 'fr-panel-main' : 'fr-panel-side'}`}>
    <header className="dw-panel-heading"><div className="dw-panel-title"><span className="dw-section-number">{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div></header>{children}
  </section>;
}
function Table({ headers, rows, caption }: { headers: string[]; rows: ReactNode[][]; caption: string }) {
  return <div className="dw-contract-table"><table><caption className="sr-only">{caption}</caption><thead><tr>{headers.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, col) => <td key={col}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export default function FleetReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({ period: 'month', compareWithPrevious: false });
  const [exporting, setExporting] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const query = useFleetReportDataset(filters);
  const data = query.data;
  const blocked = !data || query.isFetching || query.isError || exporting;
  const handleExport = async (format: ExportFormat) => {
    if (blocked || !data) return;
    setExporting(true);
    try { await exportFleetReport(data, format); if (format !== 'pdf') toast.success('تم تصدير البيانات المحمّلة بالكامل'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'فشل التصدير'); }
    finally { setExporting(false); }
  };
  const knownValues = data?.vehicles.filter(v => v.book_value != null) ?? [];
  const valueSum = knownValues.length ? knownValues.reduce((sum, v) => sum + (v.book_value ?? 0), 0) : null;
  const revenue = data?.monthly.reduce((sum, m) => sum + m.revenue, 0);
  const expenses = data?.monthly.reduce((sum, m) => sum + m.expenses, 0);
  const statusCounts = new Map<string, number>();
  data?.vehicles.forEach(v => statusCounts.set(fleetStatusLabel(v.status), (statusCounts.get(fleetStatusLabel(v.status)) ?? 0) + 1));
  const plate = new Map(data?.vehicles.map(v => [v.id, v.plate_number]));
  const metrics = [
    { label: 'المركبات المسجلة', value: data?.vehicles.length ?? '—', hint: data ? `${data.vehicles.filter(v => v.is_active === true).length} نشطة في النظام؛ يشمل الحصر غير النشطة` : 'جميع مركبات الشركة', icon: Car },
    { label: 'القيم الدفترية المعروفة', value: currency(valueSum), hint: data ? `${data.vehicles.length - knownValues.length} مركبة دون قيمة؛ ليس تقييم بيع` : 'تُحفظ القيمة الصفرية المسجلة', icon: Wallet },
    { label: 'إيرادات الشركة المقيدة', value: currency(revenue), hint: 'قيود مرحّلة ضمن الفترة؛ غير منسوبة لكل مركبة', icon: Wallet },
    { label: 'أوامر الصيانة المسجلة', value: data?.maintenance.length ?? '—', hint: 'الحصر الحالي الكامل؛ التكلفة في الطلب منفصلة عن القيد', icon: Wrench },
  ];
  return <div className="dashboard-workspace" dir="rtl"><div className="dw-container">
    <header className="dw-header"><div><div className="dw-eyebrow">Fleetify / الأسطول / التقارير</div><h1>حصر الأسطول والتقارير المالية المسجلة</h1><p>الحالات المسجلة وقيم السجل، مع حركات الشركة المرحّلة خلال الفترة.</p></div><button className="dw-icon-button" disabled={query.isFetching} onClick={() => void query.refetch()} aria-label="تحديث التقرير"><RefreshCw size={18} className={query.isFetching ? 'animate-spin' : ''} /></button></header>
    <div className="dw-daybar"><div className="dw-date"><CalendarDays size={17} /><span>الفترة المالية: <bdi>{query.period.start} — {query.period.end}</bdi></span></div><div className="dw-primary-actions">
      <button className="dw-button" disabled={blocked} onClick={() => void handleExport('csv')}>تصدير CSV</button>
      <button className="dw-button" disabled={blocked} onClick={() => void handleExport('excel')}><FileSpreadsheet size={16} />Excel</button>
      <button className="dw-button" disabled={blocked} onClick={() => void handleExport('html')}>HTML كامل</button>
      <button className="dw-button dw-button-primary" disabled={blocked} onClick={() => void handleExport('pdf')}><Printer size={16} />طباعة / حفظ PDF</button>
    </div></div>
    <div className="dw-filters" role="group" aria-label="فترة الحركات المالية">{periods.map(p => <button key={p.value} aria-pressed={filters.period === p.value} onClick={() => setFilters(current => ({ ...current, period: p.value }))}>{p.label}</button>)}</div>
    <div className="dw-filters"><label>من <input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} /></label><label>إلى <input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></label><button className="dw-button" disabled={!customStart || !customEnd || customStart > customEnd} onClick={() => setFilters({ period: 'custom', compareWithPrevious: false, startDate: new Date(`${customStart}T00:00:00Z`), endDate: new Date(`${customEnd}T00:00:00Z`) })}>تطبيق الفترة المحددة</button></div>
    <p className="fr-more-note">{FLEET_REPORT_SCOPE}</p>
    {!query.companyId && <p role="alert">يجب اختيار الشركة لتحميل التقرير.</p>}
    {query.isError && <div role="alert" className="dw-state"><p>تعذر استكمال التقرير: {query.error instanceof Error ? query.error.message : 'خطأ في قراءة البيانات'}. التصدير متوقف حتى تنجح القراءة الكاملة.</p><button className="dw-button" onClick={() => void query.refetch()}>إعادة المحاولة</button></div>}
    {query.isFetching && <div role="status" className="dw-state"><RefreshCw className="animate-spin" size={20} /><p>قراءة جميع الصفحات والتحقق من الشمول…</p></div>}
    {data && !query.isError && <>
      <p className="fr-more-note">وقت القراءة: {new Date(data.readAt).toLocaleString('ar-QA', { timeZone: 'Asia/Qatar' })} · الشركة: <bdi>{data.companyId}</bdi> · اكتملت صفحات المصادر؛ تشمل الملفات كامل البيانات، والقوائم أدناه تعرض معاينة محددة.</p>
      <section className="dw-metrics" aria-label="ملخص السجلات">{metrics.map(m => <div key={m.label} className="dw-metric"><div className="dw-metric-top"><span>{m.label}</span><m.icon size={19} /></div><strong>{m.value}</strong><div className="dw-metric-bottom"><small>{m.hint}</small></div></div>)}</section>
      <div className="dw-main-grid">
        <Panel number="01" title="الحالات المسجلة للمركبات" subtitle="يشمل كل المركبات، ولا يثبت صلاحية التشغيل">
          <Table caption="الحالات المسجلة" headers={['الحالة المسجلة', 'العدد']} rows={[...statusCounts].map(([status, count]) => [status, count])} />
        </Panel>
        <Panel number="02" title="إيرادات ومصروفات الشركة خلال الفترة" subtitle="صافي حركات أسطر القيود المرحّلة، مع عدد الأسطر لكل شهر؛ لا يمثل قائمة دخل معتمدة" wide>
          <div className="fr-chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value: number, name: string) => [currency(value), name === 'revenue' ? 'إيراد الشركة المقيد' : 'مصروف الشركة المقيد']} /><Area type="linear" dataKey="revenue" stroke="#2f7966" fill="#2f7966" fillOpacity={0.12} /><Area type="linear" dataKey="expenses" stroke="#b4854b" fill="#b4854b" fillOpacity={0.08} /></AreaChart></ResponsiveContainer></div>
          <Table caption="حركات الشركة الشهرية" headers={['الشهر', 'الإيرادات المقيدة', 'المصروفات المقيدة', 'الفرق المقيد', 'عدد أسطر القيود']} rows={data.monthly.map(m => [m.month, currency(m.revenue), currency(m.expenses), currency(m.result), m.line_count])} />
          <p className="fr-more-note">إجمالي المصروفات المقيدة: {currency(expenses)}. إيراد وتكلفة وربح كل مركبة: غير متاح دون تخصيص محاسبي موثق. لا تستخدم أسعار التأجير كإيراد محقق.</p>
        </Panel>
        <Panel number="03" title="معاينة حصر المركبات" subtitle={`أول 20 من ${data.vehicles.length}؛ التصدير يشمل الجميع`} wide>
          <Table caption="معاينة المركبات" headers={['اللوحة', 'الماركة والموديل', 'الحالة المسجلة', 'نشطة بالسجل', 'الدفترية', 'ملاحظات']} rows={data.vehicles.slice(0, 20).map(v => [<Link to={`/fleet/vehicles/${v.id}`}>{v.plate_number}</Link>, `${v.make} ${v.model}`, fleetStatusLabel(v.status), v.is_active == null ? 'غير مسجل' : v.is_active ? 'نعم' : 'لا', currency(v.book_value), v.notes ?? 'غير مسجل'])} />
        </Panel>
        <Panel number="04" title="سجلات التأمين والاستمارة" subtitle="أحدث انتهاء لكل نوع في السجلات النشطة؛ فهرس لا يثبت صحة الأصل">
          <Table caption="وثائق المركبات" headers={['اللوحة', 'التأمين', 'الاستمارة']} rows={data.registration.slice(0, 12).map(v => [v.plate_number, docStatus(v.insurance_status), docStatus(v.registration_status)])} />
          <p className="fr-more-note">معاينة 12 من {data.registration.length} مركبة؛ {data.documents.length} وثيقة و{data.insurance.length} سجل تأمين في التصدير الكامل.</p>
        </Panel>
        <Panel number="05" title="معاينة أوامر الصيانة الحالية" subtitle={`أول 20 من ${data.maintenance.length}؛ غير مقصورة على الفترة المالية`} wide>
          <Table caption="معاينة الصيانة" headers={['رقم الطلب', 'اللوحة', 'الحالة', 'المجدول', 'المقدرة بالطلب', 'الفعلية بالطلب']} rows={data.maintenance.slice(0, 20).map(m => [m.maintenance_number, plate.get(m.vehicle_id) ?? 'غير مسجل', m.status ?? 'غير مسجل', m.scheduled_date ?? 'غير مسجل', currency(m.estimated_cost), currency(m.actual_cost)])} />
        </Panel>
      </div>
    </>}
    <nav className="dw-utility-links" aria-label="مصادر التقرير"><Link to="/fleet">سجل المركبات</Link><Link to="/fleet/maintenance">الصيانة</Link><Link to="/finance/reports/financial-statements">القوائم المالية للمراجعة</Link></nav>
  </div></div>;
}
