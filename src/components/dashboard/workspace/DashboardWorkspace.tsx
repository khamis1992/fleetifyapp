import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowLeft, ArrowUpLeft, Banknote, CalendarDays, Car, CheckCircle2,
  ChevronLeft, CircleHelp, Clock3, CreditCard, FilePlus2, FileText, LayoutGrid, ListTodo,
  Plus, RefreshCw, Search, ShieldAlert, Sparkles, Users, Wrench,
} from 'lucide-react';
import type { DashboardStats } from '@/hooks/useDashboardStats';
import type { FleetStatus } from '@/hooks/useFleetStatus';
import type { DailyDecisionResult } from '@/hooks/useDailyDecisionCenter';
import {
  dashboardRoute, fleetBreakdown, fleetGradient, formatDashboardCurrency as money, prioritizeActions,
  type DashboardSource, type MaintenanceItem, type SourceState,
} from './model';
import './dashboard-workspace.css';

export interface DashboardWorkspaceProps {
  stats?: DashboardStats;
  fleet?: FleetStatus;
  decision?: DailyDecisionResult;
  maintenance: MaintenanceItem[];
  sources: Record<DashboardSource, SourceState>;
  refreshing: boolean;
  updatedAt?: number;
  onRefresh: () => void;
  onNewContract: () => void;
  onSearch: () => void;
  notifications?: ReactNode;
}

function Panel({ title, subtitle, number, children, action, className = '' }: {
  title: string; subtitle: string; number: string; children: ReactNode; action?: ReactNode; className?: string;
}) {
  return <section className={`dw-panel ${className}`}>
    <header className="dw-panel-heading">
      <div className="dw-panel-title"><span className="dw-section-number">{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      {action}
    </header>
    {children}
  </section>;
}

function SourceMessage({ state, children, onRetry }: { state: SourceState; children: ReactNode; onRetry: () => void }) {
  if (state.error) return <div className="dw-state" role="alert"><CircleHelp size={24}/><p>تعذر تحميل هذا القسم</p><button onClick={onRetry}>إعادة المحاولة</button></div>;
  if (state.loading) return <div className="dw-state" role="status"><RefreshCw className="animate-spin" size={20}/><p>جاري تحميل البيانات…</p></div>;
  return <>{children}</>;
}

export default function DashboardWorkspace({ stats, fleet, decision, maintenance, sources, refreshing, updatedAt,
  onRefresh, onNewContract, onSearch, notifications }: DashboardWorkspaceProps) {
  const [priority, setPriority] = useState<'all' | 'high' | 'other'>('all');
  const actions = prioritizeActions(decision?.actions || []);
  const visibleActions = actions.filter(action => priority === 'all' || (priority === 'high' ? action.priority === 'high' : action.priority !== 'high'));
  const urgentCount = actions.filter(action => action.priority === 'high').length;
  const fleetRows = fleet ? fleetBreakdown(fleet) : [];
  const occupancy = fleet && fleet.total > 0 ? Math.round(fleet.rented / fleet.total * 100) : 0;
  const collections = decision?.metrics?.collections;
  const contracts = decision?.metrics?.contracts;
  const forecast7 = decision?.cashflow?.next7Days;
  const forecast30 = decision?.cashflow?.next30Days;
  const forecastMax = Math.max(forecast7 || 0, forecast30 || 0, 1);
  const dateLabel = new Date().toLocaleDateString('ar-QA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const metricValue = (source: DashboardSource, value: string | number | undefined) =>
    sources[source].loading || sources[source].error || value === undefined ? '—' : value;
  const metrics = [
    { label: 'إيراد الشهر', value: metricValue('stats', stats ? money(stats.monthlyRevenue) : undefined), hint: 'الشهر الجاري', icon: Banknote, path: '/finance', accent: true },
    { label: 'العقود النشطة', value: metricValue('stats', stats?.activeContracts), hint: 'عقود قيد التشغيل', icon: FileText, path: '/contracts' },
    { label: 'إجمالي الأسطول', value: metricValue('fleet', fleet?.total), hint: fleet && !sources.fleet.error ? `${fleet.available} مركبة متاحة للتأجير` : 'حالة المركبات الحالية', icon: Car, path: '/fleet' },
    { label: 'العملاء', value: metricValue('stats', stats?.totalCustomers), hint: 'ملفات العملاء النشطين', icon: Users, path: '/customers' },
  ];
  return <div className="dashboard-workspace" dir="rtl">
    <div className="dw-container">
      <header className="dw-header">
        <div><div className="dw-eyebrow"><span className="dw-mark"/>العراف لتأجير السيارات <span>/</span> نظرة عامة</div>
          <h1>لوحة التحكم</h1><p>صورة واضحة لأعمالك، وخطوة تالية لكل أولوية.</p></div>
        <div className="dw-header-tools">
          <button className="dw-search-button" onClick={onSearch}><Search size={17}/><span>البحث في النظام</span><kbd>⌘ K</kbd></button>
          <button className="dw-icon-button" onClick={onRefresh} disabled={refreshing} aria-label="تحديث بيانات لوحة التحكم"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''}/></button>
          {notifications}
        </div>
      </header>

      <div className="dw-daybar">
        <div className="dw-date"><CalendarDays size={17}/><span>{dateLabel}</span></div>
        <div className="dw-primary-actions">
          <Link to="/tasks" className="dw-button"><ListTodo size={16}/>المهام</Link>
          <Link to="/finance/payments/quick" className="dw-button"><CreditCard size={16}/>تسجيل دفعة</Link>
          <button onClick={onNewContract} className="dw-button dw-button-primary"><Plus size={17}/>عقد جديد</button>
        </div>
      </div>

      <section className="dw-metrics" aria-label="المؤشرات الرئيسية" data-tour="stats-cards">
        {metrics.map(metric => <Link key={metric.label} to={metric.path} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
          <div className="dw-metric-top"><span>{metric.label}</span><metric.icon size={19}/></div>
          <strong>{metric.value}</strong><div className="dw-metric-bottom"><small>{metric.hint}</small><ArrowUpLeft size={16}/></div>
        </Link>)}
      </section>
      {(sources.stats.error || sources.fleet.error) && <p className="dw-data-notice" role="alert">بعض المؤشرات غير متاحة حالياً. أعد تحديث البيانات للمحاولة مجدداً.</p>}

      <div className="dw-main-grid">
        <Panel number="01" title="أولويات اليوم" subtitle="الحالات التي تستحق انتباهك أولاً" className="dw-priorities"
          action={<Link to="/ai/operations" className="dw-text-link">مركز القرارات<ArrowLeft size={15}/></Link>}>
          <div className="dw-priority-toolbar" data-tour="decision-center">
            <div className="dw-filters" role="group" aria-label="تصفية أولويات اليوم">
              {([{ value: 'all', label: 'الكل', count: actions.length }, { value: 'high', label: 'عاجل', count: urgentCount }, { value: 'other', label: 'متابعة', count: actions.length - urgentCount }] as const).map(filter =>
                <button key={filter.value} aria-pressed={priority === filter.value} onClick={() => setPriority(filter.value)}>{filter.label}<span>{sources.decision.loading || sources.decision.error ? '—' : filter.count}</span></button>)}
            </div>
            <span className="dw-priority-note"><Clock3 size={13}/>متابعة يومية</span>
          </div>
          <SourceMessage state={sources.decision} onRetry={onRefresh}>
            <div className="dw-priority-list" aria-live="polite">
              {visibleActions.length ? visibleActions.map((action, index) => <Link key={`${action.title}-${index}`} to={dashboardRoute(action.route)} className="dw-priority-row">
                <span className={`dw-priority-icon ${action.priority === 'high' ? 'is-urgent' : ''}`}>{action.priority === 'high' ? <ShieldAlert size={19}/> : <FileText size={19}/>}</span>
                <div className="dw-priority-copy"><h3>{action.title}</h3><p>{action.reason}</p></div>
                <span className={`dw-priority-badge ${action.priority === 'high' ? 'is-urgent' : ''}`}>{action.priority === 'high' ? 'عاجل' : action.priority === 'medium' ? 'مهم' : 'متابعة'}</span><ChevronLeft className="dw-row-arrow" size={16}/>
              </Link>) : <div className="dw-state"><CheckCircle2 size={28}/><p>{priority === 'all' ? 'لا توجد أولويات مسجلة حالياً' : 'لا توجد حالات ضمن هذا التصنيف'}</p><Link to="/tasks">عرض المهام</Link></div>}
            </div>
          </SourceMessage>
          <div className="dw-panel-foot"><Sparkles size={14}/><span>اختر الحالة للانتقال مباشرة إلى الإجراء المرتبط بها.</span></div>
        </Panel>

        <Panel number="02" title="جاهزية الأسطول" subtitle="توزيع جميع المركبات حسب الحالة" className="dw-fleet"
          action={<Link className="dw-text-link" to="/fleet" aria-label="عرض إدارة الأسطول"><ArrowUpLeft size={19}/></Link>}>
          <SourceMessage state={sources.fleet} onRetry={onRefresh}>
            <div className="dw-fleet-visual" data-tour="fleet-readiness">
              <div className="dw-fleet-ring" style={{ background: fleetGradient(fleetRows) }} role="img" aria-label={`نسبة إشغال الأسطول ${occupancy}%`}>
                <div><strong>{fleet ? occupancy : '—'}<small>%</small></strong><span>نسبة الإشغال</span></div>
              </div>
              <div className="dw-fleet-annotation"><span>جاهزة للانطلاق</span><strong>{fleet?.available ?? '—'}</strong><small>مركبة متاحة للتأجير</small><Link to="/fleet?status=available">عرض المتاح<ArrowLeft size={13}/></Link></div>
            </div>
            <div className="dw-fleet-legend">{fleetRows.map(row => <Link key={row.label} to={row.path}>
              <i style={{ background: row.color }}/><span>{row.label}</span><strong>{row.value}</strong><small>{Math.round(row.percent)}%</small>
            </Link>)}</div>
          </SourceMessage>
        </Panel>

        <Panel number="03" title="التحصيل والمستحقات" subtitle="المبالغ المتأخرة ومتابعة التدفقات القادمة" className="dw-collections"
          action={<Link to="/financial-tracking" className="dw-text-link">متابعة التحصيل<ArrowLeft size={15}/></Link>}>
          <SourceMessage state={sources.decision} onRetry={onRefresh}>
            <div className="dw-collection-body">
              <div className="dw-overdue"><span><ShieldAlert size={16}/>المستحقات المتأخرة</span><strong>{money(collections?.overdueAmount)}</strong><p>{collections ? `${collections.overdueInvoices} فاتورة تحتاج متابعة` : 'تفاصيل التحصيل غير متاحة'}</p><Link to="/finance/billing">مراجعة الفواتير<ArrowLeft size={14}/></Link></div>
              <div className="dw-forecast"><h3>التحصيل المتوقع</h3><p>توقعات تراكمية؛ مبلغ 30 يوماً يشمل أول 7 أيام.</p>
                {[{ label: 'خلال 7 أيام', value: forecast7 }, { label: 'خلال 30 يوماً', value: forecast30 }].map((row, index) => <div key={row.label} className="dw-forecast-row"><div><span>{row.label}</span><strong>{money(row.value)}</strong></div><div className="dw-forecast-track" aria-hidden="true"><i style={{ width: `${Math.max(0, row.value || 0) / forecastMax * 100}%`, background: index ? '#2f7966' : '#9db88a' }}/></div></div>)}
                <span className="dw-forecast-hint"><ArrowDownLeft size={14}/>توقعات تحصيل، وليست مبالغ مستلمة</span>
              </div>
            </div>
          </SourceMessage>
        </Panel>

        <Panel number="04" title="العقود القريبة من الانتهاء" subtitle="تابع التجديد مبكراً لاستمرار العلاقة" className="dw-contracts"
          action={<Link to="/contracts" className="dw-text-link">كل العقود<ArrowLeft size={15}/></Link>}>
          <SourceMessage state={sources.decision} onRetry={onRefresh}>
            {contracts?.endingSoon?.length ? <div className="dw-contract-table"><table>
              <caption className="sr-only">العقود القريبة من الانتهاء</caption><thead><tr><th scope="col">العقد / العميل</th><th scope="col">تاريخ الانتهاء</th><th scope="col">الإيجار الشهري</th><th scope="col"><span className="sr-only">فتح العقد</span></th></tr></thead>
              <tbody>{contracts.endingSoon.slice(0, 5).map(contract => <tr key={contract.contractNumber}><td><strong><bdi>{contract.contractNumber}</bdi></strong><span>{contract.customerName}</span></td><td><bdi>{contract.endDate}</bdi></td><td>{money(contract.monthlyAmount)}</td><td><Link to={dashboardRoute(contract.route, '/contracts')} aria-label={`فتح العقد ${contract.contractNumber}`}><ArrowUpLeft size={17}/></Link></td></tr>)}</tbody>
            </table></div> : <div className="dw-state"><FileText size={27}/><p>{contracts ? 'لا توجد عقود قريبة من الانتهاء' : 'تفاصيل العقود غير متاحة حالياً'}</p><Link to="/contracts">عرض سجل العقود</Link></div>}
          </SourceMessage>
        </Panel>

        <Panel number="05" title="الصيانة المجدولة" subtitle="أقرب الطلبات المفتوحة لجاهزية المركبات" className="dw-maintenance"
          action={<Link to="/fleet/maintenance" className="dw-text-link" aria-label="عرض جميع طلبات الصيانة"><ArrowUpLeft size={19}/></Link>}>
          <SourceMessage state={sources.maintenance} onRetry={onRefresh}>
            {maintenance.length ? <div className="dw-maintenance-list">{maintenance.map(item => <Link key={item.id} to="/fleet/maintenance" className="dw-maintenance-row">
              <div className="dw-maintenance-icon"><Wrench size={18}/></div><div><h3><bdi>{item.vehicles?.plate_number || 'مركبة غير محددة'}</bdi></h3><p>{item.maintenance_type || 'طلب صيانة'} · {item.status === 'in_progress' ? 'قيد التنفيذ' : 'بانتظار التنفيذ'}</p></div><time>{item.scheduled_date || 'غير مجدول'}</time>
            </Link>)}</div> : <div className="dw-state"><CheckCircle2 size={28}/><p>لا توجد طلبات صيانة مفتوحة</p><Link to="/fleet/maintenance">إدارة الصيانة</Link></div>}
          </SourceMessage>
        </Panel>
      </div>

      <section className="dw-shortcuts" data-tour="operation-lanes" aria-labelledby="dw-shortcuts-title">
        <div className="dw-shortcut-heading"><div className="dw-eyebrow">مساحات العمل</div><h2 id="dw-shortcuts-title">انتقل إلى التفاصيل</h2><p>أدواتك اليومية، في مكان واحد.</p></div>
        <div className="dw-shortcut-grid">{[
          { label: 'المالية والفواتير', detail: 'الفواتير، الدفعات والتقارير', icon: Banknote, path: '/finance' },
          { label: 'العقود والعملاء', detail: 'إدارة العقود ومتابعة التجديد', icon: FileText, path: '/contracts' },
          { label: 'الأسطول والحجوزات', detail: 'المركبات والجاهزية التشغيلية', icon: Car, path: '/fleet' },
          { label: 'الفريق والمهام', detail: 'تنسيق العمل وتوزيع المسؤوليات', icon: Users, path: '/team-management' },
        ].map(item => <Link key={item.path} to={item.path}><item.icon size={23}/><div><h3>{item.label}</h3><p>{item.detail}</p></div><ArrowUpLeft size={17}/></Link>)}</div>
      </section>

      <nav className="dw-utility-links" aria-label="إجراءات إضافية" data-tour="quick-actions">
        <Link to="/finance/billing"><FilePlus2 size={15}/>الفواتير</Link><Link to="/finance/reports-analysis?tab=reports"><LayoutGrid size={15}/>التقارير المالية</Link><Link to="/fleet/reservations"><CalendarDays size={15}/>الحجوزات</Link><Link to="/employee-workspace"><ListTodo size={15}/>مساحة عملي</Link>
      </nav>
      <footer className="dw-footer"><span>Fleetify <span>/</span> إدارة الأسطول والأعمال</span><span role="status">{refreshing ? 'جاري تحديث البيانات…' : updatedAt ? `آخر تحديث ${new Date(updatedAt).toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}` : 'بانتظار تحميل البيانات'}</span></footer>
    </div>
  </div>;
}
