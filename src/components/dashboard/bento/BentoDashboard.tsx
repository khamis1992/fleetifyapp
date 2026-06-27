import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  Briefcase,
  Calendar,
  Car,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  FilePlus,
  FileText,
  Search,
  ShieldAlert,
  Target,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { useStableCompanyId } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';

const dashboardColors = {
  text: systemColorPattern.colors.text,
  inner: systemColorPattern.colors.innerSurface,
  secondaryText: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
  navy: '#173A63',
  amber: '#F59E0B',
};

type FleetStatus = {
  available: number;
  rented: number;
  maintenance: number;
  reserved: number;
};

type MaintenanceItem = {
  id: string;
  maintenance_type: string | null;
  scheduled_date: string | null;
  status: string | null;
  vehicles?: { plate_number?: string | null } | null;
};

type WorkItem = {
  id: string;
  title: string;
  detail: string;
  value: string;
  tone: 'danger' | 'warning' | 'success' | 'info';
  icon: React.ElementType;
  action: string;
  path: string;
};

type MetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  tone: 'danger' | 'warning' | 'success' | 'info' | 'navy';
  path: string;
};

const toneMap = {
  danger: { color: dashboardColors.alert, bg: '#FFF1F2', border: '#FECACA' },
  warning: { color: dashboardColors.amber, bg: '#FFFBEB', border: '#FDE68A' },
  success: { color: dashboardColors.success, bg: '#ECFDF5', border: '#A7F3D0' },
  info: { color: dashboardColors.info, bg: '#EFF6FF', border: '#BFDBFE' },
  navy: { color: dashboardColors.navy, bg: '#F1F5F9', border: '#CBD5E1' },
};

const formatQar = (value: number) =>
  new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const getStatNumber = (stats: any, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = stats?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
};

const ShellCard: React.FC<React.PropsWithChildren<{ className?: string; onClick?: () => void }>> = ({
  children,
  className,
  onClick,
}) => (
  <motion.div
    className={cn(
      'rounded-lg border bg-white shadow-sm transition-all',
      onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
      className
    )}
    style={{ borderColor: dashboardColors.border }}
    onClick={onClick}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28 }}
  >
    {children}
  </motion.div>
);

const MetricCard: React.FC<MetricCardProps> = ({ label, value, hint, icon: Icon, tone, path }) => {
  const navigate = useNavigate();
  const colors = toneMap[tone];

  return (
    <ShellCard onClick={() => navigate(path)} className="min-h-[118px] p-4">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: dashboardColors.secondaryText }}>
            {label}
          </p>
          <p className="text-2xl font-black tracking-normal" style={{ color: dashboardColors.text }}>
            {value}
          </p>
          <p className="text-xs font-medium" style={{ color: dashboardColors.secondaryText }}>
            {hint}
          </p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: colors.bg, color: colors.color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </ShellCard>
  );
};

const QuickAction: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  to?: string;
  primary?: boolean;
}> = ({ label, icon: Icon, onClick, to, primary }) => {
  const className = cn(
    'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors',
    primary ? 'border-transparent text-white' : 'bg-white text-slate-800 hover:bg-slate-50'
  );
  const style = primary
    ? { backgroundColor: dashboardColors.navy }
    : { borderColor: dashboardColors.border };

  if (to) {
    return (
      <Link to={to} className={className} style={style}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};

const BentoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: statsData } = useDashboardStats();
  const stats = statsData as any;
  const [showContractWizard, setShowContractWizard] = useState(false);

  const rawCompanyId = user?.profile?.company_id || user?.company?.id;
  const contextStableId = useStableCompanyId();
  const stableCompanyIdRef = useRef<string | null>(null);
  if (rawCompanyId) stableCompanyIdRef.current = rawCompanyId;
  const companyId = rawCompanyId || contextStableId || stableCompanyIdRef.current;
  const isReady = !!companyId;

  const { data: fleetStatus } = useQuery<FleetStatus>({
    queryKey: ['fleet-status-operations-center', companyId],
    queryFn: async () => {
      if (!companyId) return { available: 0, rented: 0, maintenance: 0, reserved: 0 };

      const { data } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const counts: FleetStatus = { available: 0, rented: 0, maintenance: 0, reserved: 0 };
      data?.forEach((vehicle) => {
        const status = String(vehicle.status || 'available') as keyof FleetStatus;
        if (status in counts) counts[status] += 1;
      });

      return counts;
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const { data: maintenanceData = [] } = useQuery<MaintenanceItem[]>({
    queryKey: ['maintenance-operations-center', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_type, scheduled_date, status, vehicles(plate_number)')
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(5);

      return (data || []) as MaintenanceItem[];
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const { data: revenueData = [] } = useQuery<Array<{ name: string; value: number }>>({
    queryKey: ['revenue-operations-center', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const currentMonth = new Date().getMonth();
      const results: Array<{ name: string; value: number }> = [];

      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date();
        date.setMonth(currentMonth - i);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data } = await supabase
          .from('contracts')
          .select('monthly_amount')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .lte('start_date', monthEnd.toISOString().split('T')[0]);

        const total = data?.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0) || 0;
        results.push({ name: monthNames[date.getMonth()], value: Math.round(total / 1000) });
      }

      return results;
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const totalVehicles =
    (fleetStatus?.available || 0) +
    (fleetStatus?.rented || 0) +
    (fleetStatus?.maintenance || 0) +
    (fleetStatus?.reserved || 0);
  const occupancyRate = totalVehicles > 0 ? Math.round(((fleetStatus?.rented || 0) / totalVehicles) * 100) : 0;

  const monthlyRevenue = getStatNumber(stats, ['monthlyRevenue', 'totalRevenue', 'revenue']);
  const overdueAmount = getStatNumber(stats, ['overdueAmount', 'totalOverdue', 'outstandingAmount', 'pendingAmount']);
  const activeContracts = getStatNumber(stats, ['activeContracts', 'totalActiveContracts']);
  const totalCustomers = getStatNumber(stats, ['totalCustomers', 'customersCount']);
  const pendingInvoices = getStatNumber(stats, ['pendingInvoices', 'unpaidInvoices', 'overdueInvoices']);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('ar-QA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const fleetChartData = [
    { name: 'متاح', value: fleetStatus?.available || 0, color: dashboardColors.success, path: '/fleet?status=available' },
    { name: 'مؤجر', value: fleetStatus?.rented || 0, color: dashboardColors.info, path: '/fleet?status=rented' },
    { name: 'صيانة', value: fleetStatus?.maintenance || 0, color: dashboardColors.amber, path: '/fleet/maintenance' },
    { name: 'محجوز', value: fleetStatus?.reserved || 0, color: dashboardColors.focus, path: '/fleet/reservations' },
  ];

  const workItems: WorkItem[] = [
    {
      id: 'collections',
      title: 'تحصيل المستحقات المفتوحة',
      detail: `${pendingInvoices || 0} فاتورة تحتاج متابعة مالية`,
      value: formatQar(overdueAmount),
      tone: overdueAmount > 0 ? 'danger' : 'success',
      icon: Wallet,
      action: 'تسجيل دفعة',
      path: '/finance/payments/quick',
    },
    {
      id: 'contracts',
      title: 'مراجعة العقود النشطة',
      detail: 'تابع العقود التي تحتاج تجديد أو إجراء',
      value: `${activeContracts || 0} عقد`,
      tone: 'info',
      icon: FileText,
      action: 'فتح العقود',
      path: '/contracts',
    },
    {
      id: 'maintenance',
      title: 'مركبات تحتاج متابعة',
      detail: 'الصيانة والحجوزات تؤثر على جاهزية الأسطول',
      value: `${maintenanceData.length || 0} طلب`,
      tone: maintenanceData.length > 0 ? 'warning' : 'success',
      icon: Wrench,
      action: 'عرض الصيانة',
      path: '/fleet/maintenance',
    },
    {
      id: 'team',
      title: 'تنسيق عمل الفريق',
      detail: 'راجع الحمل التشغيلي والمهام اليومية',
      value: 'اليوم',
      tone: 'info',
      icon: Users,
      action: 'إدارة الفريق',
      path: '/team-management',
    },
  ];

  const operationLanes = [
    {
      title: 'المال والتحصيل',
      subtitle: 'الأموال التي تحتاج حركة الآن',
      icon: Banknote,
      color: dashboardColors.success,
      path: '/finance',
      items: [
        { label: 'إيراد الشهر', value: formatQar(monthlyRevenue) },
        { label: 'مستحقات مفتوحة', value: formatQar(overdueAmount) },
        { label: 'فواتير تحتاج مراجعة', value: pendingInvoices || 0 },
      ],
      actions: [
        { label: 'تسجيل دفعة', path: '/finance/payments/quick' },
        { label: 'الفواتير', path: '/finance/billing' },
      ],
    },
    {
      title: 'العقود والمخاطر',
      subtitle: 'تجديد، تحصيل، أو تحويل قانوني',
      icon: ShieldAlert,
      color: dashboardColors.navy,
      path: '/contracts',
      items: [
        { label: 'العقود النشطة', value: activeContracts || 0 },
        { label: 'العملاء', value: totalCustomers || 0 },
        { label: 'نسبة الإشغال', value: `${occupancyRate}%` },
      ],
      actions: [
        { label: 'عقد جديد', path: 'contract-wizard' },
        { label: 'سجل العقود', path: '/contracts' },
      ],
    },
    {
      title: 'الأسطول',
      subtitle: 'جاهزية المركبات والحجوزات',
      icon: Car,
      color: dashboardColors.info,
      path: '/fleet',
      items: [
        { label: 'إجمالي المركبات', value: totalVehicles },
        { label: 'متاحة', value: fleetStatus?.available || 0 },
        { label: 'في الصيانة', value: fleetStatus?.maintenance || 0 },
      ],
      actions: [
        { label: 'إدارة الأسطول', path: '/fleet' },
        { label: 'الحجوزات', path: '/fleet/reservations' },
      ],
    },
    {
      title: 'الفريق والمتابعة',
      subtitle: 'من المسؤول عن الخطوة التالية؟',
      icon: Briefcase,
      color: dashboardColors.focus,
      path: '/team-management',
      items: [
        { label: 'متابعات اليوم', value: workItems.length },
        { label: 'حالات عاجلة', value: workItems.filter((item) => item.tone === 'danger' || item.tone === 'warning').length },
        { label: 'إجراءات جاهزة', value: 4 },
      ],
      actions: [
        { label: 'إدارة الفريق', path: '/team-management' },
        { label: 'مساحة عملي', path: '/employee-workspace' },
      ],
    },
  ];

  const triggerQuickSearch = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      })
    );
  }, []);

  const handleLaneAction = (path: string) => {
    if (path === 'contract-wizard') {
      setShowContractWizard(true);
      return;
    }
    navigate(path);
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: dashboardColors.inner }}>
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ borderColor: dashboardColors.border }}>
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: dashboardColors.navy }}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: dashboardColors.text }}>
                لوحة القيادة التشغيلية
              </h1>
              <p className="text-xs font-medium" style={{ color: dashboardColors.secondaryText }}>
                {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <button
              type="button"
              onClick={triggerQuickSearch}
              className="hidden min-w-[260px] items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-white lg:flex"
              style={{ borderColor: dashboardColors.border }}
            >
              <span>بحث سريع...</span>
              <Search className="h-4 w-4" />
            </button>
            <QuickAction label="فاتورة جديدة" icon={FilePlus} to="/finance/billing" />
            <QuickAction label="تسجيل دفعة" icon={CreditCard} to="/finance/payments/quick" primary />
            <QuickAction label="عقد جديد" icon={FileText} onClick={() => setShowContractWizard(true)} />
            <UnifiedNotificationBell />
          </div>
        </div>
      </header>

      <main className="w-full space-y-6 px-6 py-6">
        <section>
          <ShellCard className="overflow-hidden">
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold" style={{ color: dashboardColors.success }}>
                      مركز القرار اليومي
                    </p>
                    <h2 className="mt-1 text-2xl font-black lg:text-3xl" style={{ color: dashboardColors.text }}>
                      ابدأ من الحالات التي تحتاج قرارًا الآن
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/tasks')}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white"
                    style={{ backgroundColor: dashboardColors.navy }}
                  >
                    فتح قائمة العمل
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {workItems.map((item) => {
                    const colors = toneMap[item.tone];
                    const Icon = item.icon;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className="group min-h-[118px] rounded-lg border p-5 text-right transition-all hover:-translate-y-0.5 hover:shadow-md"
                        style={{ borderColor: colors.border, backgroundColor: colors.bg }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg p-2" style={{ color: colors.color, backgroundColor: '#FFFFFFB8' }}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <h3 className="text-base font-black" style={{ color: dashboardColors.text }}>
                                {item.title}
                              </h3>
                            </div>
                            <p className="text-sm font-medium" style={{ color: dashboardColors.secondaryText }}>
                              {item.detail}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-black" style={{ color: colors.color }}>
                              {item.value}
                            </p>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: dashboardColors.navy }}>
                              {item.action}
                              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t bg-slate-50 p-6 2xl:border-r 2xl:border-t-0" style={{ borderColor: dashboardColors.border }}>
                <p className="mb-4 text-sm font-black" style={{ color: dashboardColors.text }}>
                  نبض اليوم
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'الإيراد الشهري', value: formatQar(monthlyRevenue), icon: Banknote, color: dashboardColors.success },
                    { label: 'المستحقات المفتوحة', value: formatQar(overdueAmount), icon: AlertTriangle, color: dashboardColors.alert },
                    { label: 'إشغال الأسطول', value: `${occupancyRate}%`, icon: Car, color: dashboardColors.info },
                    { label: 'العقود النشطة', value: activeContracts || 0, icon: FileText, color: dashboardColors.navy },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border bg-white p-3" style={{ borderColor: dashboardColors.border }}>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: dashboardColors.secondaryText }}>
                            {item.label}
                          </p>
                          <p className="mt-1 text-lg font-black" style={{ color: dashboardColors.text }}>
                            {item.value}
                          </p>
                        </div>
                        <div className="rounded-lg p-2" style={{ backgroundColor: `${item.color}16`, color: item.color }}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ShellCard>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <MetricCard label="إجمالي المركبات" value={totalVehicles} hint={`${fleetStatus?.available || 0} متاحة الآن`} icon={Car} tone="info" path="/fleet" />
          <MetricCard label="العقود النشطة" value={activeContracts || 0} hint="اضغط لفتح سجل العقود" icon={FileText} tone="navy" path="/contracts" />
          <MetricCard label="العملاء" value={totalCustomers || 0} hint="ملفات العملاء والمتابعة" icon={Users} tone="success" path="/customers" />
          <MetricCard label="إيراد الشهر" value={formatQar(monthlyRevenue)} hint="لوحة المالية والتحصيل" icon={Banknote} tone="success" path="/finance" />
          <MetricCard label="تنبيهات تشغيلية" value={maintenanceData.length + (pendingInvoices || 0)} hint="صيانة وفواتير تحتاج إجراء" icon={ShieldAlert} tone="warning" path="/tasks" />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {operationLanes.map((lane) => {
            const Icon = lane.icon;
            return (
              <ShellCard key={lane.title} className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: `${lane.color}14`, color: lane.color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-black" style={{ color: dashboardColors.text }}>
                      {lane.title}
                    </h3>
                    <p className="text-xs font-medium" style={{ color: dashboardColors.secondaryText }}>
                      {lane.subtitle}
                    </p>
                  </div>
                  <button type="button" onClick={() => navigate(lane.path)} className="rounded-lg border p-2 hover:bg-slate-50" style={{ borderColor: dashboardColors.border }}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {lane.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-sm font-semibold" style={{ color: dashboardColors.secondaryText }}>
                        {item.label}
                      </span>
                      <span className="text-sm font-black" style={{ color: dashboardColors.text }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {lane.actions.map((action) => (
                    <button
                      type="button"
                      key={action.label}
                      onClick={() => handleLaneAction(action.path)}
                      className="rounded-lg border px-3 py-2 text-sm font-bold transition-colors hover:bg-slate-50"
                      style={{ borderColor: dashboardColors.border, color: dashboardColors.navy }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </ShellCard>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <ShellCard className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black" style={{ color: dashboardColors.text }}>
                  حركة الإيرادات
                </h3>
                <p className="text-sm font-medium" style={{ color: dashboardColors.secondaryText }}>
                  قراءة مختصرة لآخر ستة أشهر
                </p>
              </div>
              <button type="button" onClick={() => navigate('/finance/reports-analysis?tab=reports')} className="rounded-lg border px-3 py-2 text-sm font-bold" style={{ borderColor: dashboardColors.border }}>
                عرض التقارير
              </button>
            </div>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={dashboardColors.success} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={dashboardColors.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={dashboardColors.border} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: dashboardColors.secondaryText }} />
                  <YAxis tick={{ fontSize: 12, fill: dashboardColors.secondaryText }} tickFormatter={(value) => `${value}K`} />
                  <Tooltip
                    formatter={(value) => [`${value}K`, 'الإيراد']}
                    contentStyle={{ borderRadius: 8, borderColor: dashboardColors.border, fontSize: 13 }}
                  />
                  <Area type="monotone" dataKey="value" stroke={dashboardColors.success} strokeWidth={3} fill="url(#dashboardRevenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ShellCard>

          <ShellCard className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black" style={{ color: dashboardColors.text }}>
                  جاهزية الأسطول
                </h3>
                <p className="text-sm font-medium" style={{ color: dashboardColors.secondaryText }}>
                  توزيع المركبات حسب الحالة
                </p>
              </div>
              <span className="rounded-lg px-3 py-1 text-sm font-black" style={{ backgroundColor: `${dashboardColors.info}14`, color: dashboardColors.info }}>
                {occupancyRate}% إشغال
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[220px_1fr]">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetChartData} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={3}>
                      {fleetChartData.map((item) => (
                        <Cell key={item.name} fill={item.color} onClick={() => navigate(item.path)} className="cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: dashboardColors.border, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {fleetChartData.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-3 text-right transition-colors hover:bg-slate-50"
                    style={{ borderColor: dashboardColors.border }}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold" style={{ color: dashboardColors.text }}>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-lg font-black" style={{ color: item.color }}>
                      {item.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </ShellCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <ShellCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black" style={{ color: dashboardColors.text }}>
                  الصيانة القريبة
                </h3>
                <p className="text-sm font-medium" style={{ color: dashboardColors.secondaryText }}>
                  طلبات تؤثر على جاهزية المركبات
                </p>
              </div>
              <Wrench className="h-5 w-5" style={{ color: dashboardColors.amber }} />
            </div>

            {maintenanceData.length > 0 ? (
              <div className="space-y-2">
                {maintenanceData.slice(0, 4).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => navigate('/fleet/maintenance')}
                    className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-3 text-right transition-colors hover:bg-amber-50"
                    style={{ borderColor: dashboardColors.border }}
                  >
                    <div>
                      <p className="text-sm font-black" style={{ color: dashboardColors.text }}>
                        {item.vehicles?.plate_number || 'مركبة غير محددة'}
                      </p>
                      <p className="text-xs font-medium" style={{ color: dashboardColors.secondaryText }}>
                        {item.maintenance_type || 'صيانة'}
                      </p>
                    </div>
                    <Clock className="h-4 w-4" style={{ color: dashboardColors.amber }} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: dashboardColors.border }}>
                <CheckCircle2 className="mx-auto mb-3 h-9 w-9" style={{ color: dashboardColors.success }} />
                <p className="text-sm font-bold" style={{ color: dashboardColors.text }}>
                  لا توجد طلبات صيانة مفتوحة
                </p>
              </div>
            )}
          </ShellCard>

          <ShellCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black" style={{ color: dashboardColors.text }}>
                  قائمة العمل المختصرة
                </h3>
                <p className="text-sm font-medium" style={{ color: dashboardColors.secondaryText }}>
                  إجراءات تنفيذية من لوحة التحكم مباشرة
                </p>
              </div>
              <Target className="h-5 w-5" style={{ color: dashboardColors.navy }} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { label: 'إنشاء فاتورة جديدة', detail: 'إضافة مطالبة مالية مرتبطة بعقد أو عميل', icon: FilePlus, path: '/finance/billing' },
                { label: 'تسجيل دفعة', detail: 'تسجيل دفعة مباشرة وربطها بالفواتير', icon: CreditCard, path: '/finance/payments/quick' },
                { label: 'مراجعة التقارير', detail: 'فتح التقارير المالية والتحليل', icon: BarChart3, path: '/finance/reports-analysis?tab=reports' },
                { label: 'إدارة الحجوزات', detail: 'متابعة حجوزات المركبات القادمة', icon: Calendar, path: '/fleet/reservations' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="group rounded-lg border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-sm"
                    style={{ borderColor: dashboardColors.border }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-lg p-2" style={{ backgroundColor: `${dashboardColors.navy}10`, color: dashboardColors.navy }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <ChevronLeft className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-x-1" />
                    </div>
                    <p className="text-base font-black" style={{ color: dashboardColors.text }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-medium" style={{ color: dashboardColors.secondaryText }}>
                      {item.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </ShellCard>
        </section>
      </main>

      <SimpleContractWizard open={showContractWizard} onOpenChange={setShowContractWizard} />
    </div>
  );
};

export default BentoDashboard;
