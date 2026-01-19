import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Car,
  AlertTriangle,
  TrendingUp,
  Bell,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  activeContracts: number;
  rentedVehicles: number;
  latePayments: number;
  monthlyRevenue: number;
  monthlyTarget: number;
}

interface UrgentAlert {
  id: string;
  type: 'expiring' | 'overdue';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export const MobileHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeContracts: 0,
    rentedVehicles: 0,
    latePayments: 0,
    monthlyRevenue: 0,
    monthlyTarget: 55000,
  });
  const [alerts, setAlerts] = useState<UrgentAlert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch company_id from profiles table (same approach as dashboard)
      let companyId: string;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.company_id) {
        console.warn('[MobileHome] No company_id in profiles, trying employees table', { profileError, user_id: user.id });

        // Try fallback to employees table
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (employeeError || !employeeData?.company_id) {
          console.error('[MobileHome] No company_id found', { employeeError, user_id: user.id });
          return; // Exit early - no valid company_id
        }

        companyId = employeeData.company_id;
      } else {
        companyId = profileData.company_id;
      }

      console.log('[MobileHome] Using company_id:', companyId);

      // Fetch active contracts count only
      const { count: activeCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active');

      // Fetch rented vehicles from vehicles table
      const { count: rentedCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'rented');

      const rentedVehicles = rentedCount || 0;

      // Fetch unpaid contracts
      const { count: unpaidCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('payment_status', 'unpaid');

      // Calculate monthly revenue (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('status', 'verified')
        .gte('payment_date', startOfMonth);

      const monthlyRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      setStats({
        activeContracts: activeCount || 0,
        rentedVehicles,
        latePayments: unpaidCount || 0,
        monthlyRevenue,
        monthlyTarget: 55000,
      });

      // Fetch urgent alerts
      await fetchUrgentAlerts(companyId);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchUrgentAlerts = async (companyId: string) => {
    const alerts: UrgentAlert[] = [];

    // Expiring contracts (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select('id, contract_number, end_date, customer_id, customers!inner(first_name, last_name)')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .lte('end_date', sevenDaysFromNow.toISOString())
      .order('end_date', { ascending: true })
      .limit(3);

    expiringContracts?.forEach(contract => {
      const daysRemaining = Math.ceil(
        (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: contract.id,
        type: 'expiring',
        title: `عقد #${contract.contract_number} ينتهق قريباً`,
        description: `ينتهي خلال ${daysRemaining} يوم - ${contract.customers.first_name} ${contract.customers.last_name}`,
        severity: daysRemaining <= 2 ? 'high' : 'medium',
      });
    });

    // Overdue contracts
    const { data: overdueContracts } = await supabase
      .from('contracts')
      .select('id, contract_number, days_overdue, balance_due, customer_id, customers!inner(first_name, last_name)')
      .eq('company_id', companyId)
      .gt('days_overdue', 0)
      .order('days_overdue', { ascending: false })
      .limit(3);

    overdueContracts?.forEach(contract => {
      const daysOverdue = contract.days_overdue || 0;
      alerts.push({
        id: contract.id,
        type: 'overdue',
        title: `تأخير في الدفع - ${contract.customers.first_name} ${contract.customers.last_name}`,
        description: `${daysOverdue} يوم متأخر - QAR ${contract.balance_due?.toLocaleString()}`,
        severity: daysOverdue > 30 ? 'high' : 'medium',
      });
    });

    setAlerts(alerts.slice(0, 5)); // Limit to 5 alerts
  };

  const revenuePercentage = Math.min((stats.monthlyRevenue / stats.monthlyTarget) * 100, 100);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 mt-1">مرحباً بك في فليتفاي</p>
        </div>
        <button
          onClick={() => navigate('/mobile/notifications')}
          className="relative p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/50"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={FileText}
          value={stats.activeContracts.toString()}
          label="العقود"
          color="from-teal-500 to-teal-600"
        />
        <StatCard
          icon={Car}
          value={stats.rentedVehicles.toString()}
          label="مركبات مستأجرة"
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          value={stats.latePayments.toString()}
          label="متأخرات"
          color="from-red-500 to-red-600"
        />
      </div>

      {/* Urgent Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">⚠️ تنبيهات عاجلة</h2>
            <button className="text-sm text-teal-600">عرض الكل</button>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Monthly Revenue */}
      <div>
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">إيرادات الشهر</h3>
                <p className="text-xs text-slate-500">يناير 2026</p>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                QAR {stats.monthlyRevenue.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500">
                / {stats.monthlyTarget.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
              style={{ width: `${revenuePercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{revenuePercentage.toFixed(0)}% من الهدف</span>
            <span className="text-teal-600 font-medium">
              QAR {(stats.monthlyTarget - stats.monthlyRevenue).toLocaleString()} متبقي
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionButton
          icon={FileText}
          label="عقد جديد"
          color="from-teal-500 to-teal-600"
          onClick={() => navigate('/mobile/contracts/new')}
        />
        <QuickActionButton
          icon={Smartphone}
          label="تسجيل دفعة"
          color="from-blue-500 to-blue-600"
          onClick={() => navigate('/mobile/overdue')}
        />
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  value: string;
  label: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, color }) => (
  <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4">
    <div className={`p-2 rounded-xl bg-gradient-to-br ${color} shadow-lg mb-2`}>
      <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
    </div>
    <p className="text-xl font-bold text-slate-900">{value}</p>
    <p className="text-[10px] text-slate-500">{label}</p>
  </div>
);

interface AlertCardProps {
  alert: UrgentAlert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const severityColors = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-amber-300 bg-amber-50',
    low: 'border-yellow-200 bg-yellow-50',
  };

  return (
    <div className={cn(
      'border rounded-2xl p-4',
      severityColors[alert.severity]
    )}>
      <p className="text-sm font-semibold text-slate-900 mb-1">{alert.title}</p>
      <p className="text-xs text-slate-600">{alert.description}</p>
    </div>
  );
};

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon: Icon,
  label,
  color,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 text-right"
  >
    <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${color} shadow-lg shadow-teal-500/20 mb-3 w-fit`}>
      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
    </div>
    <p className="text-sm font-semibold text-slate-900">{label}</p>
  </button>
);

export default MobileHome;
