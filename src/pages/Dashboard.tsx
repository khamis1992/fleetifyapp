import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePayrollSummary } from '@/hooks/usePayrollFinancialAnalysis';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign,
  AlertTriangle,
  Wrench,
  XCircle
} from 'lucide-react';

// Enhanced Dashboard Components
import { WelcomeHero } from '@/components/dashboard/WelcomeHero';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { StatusOverview } from '@/components/dashboard/StatusOverview';
import { Skeleton } from '@/components/ui/skeleton';

// Icon mapping for activities
const iconMap = {
  FileText,
  AlertTriangle,
  Users,
  DollarSign,
  Car
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: payrollSummary } = usePayrollSummary();
  const { metrics, activities, fleetStatus, isLoading, error } = useDashboardData();

  const userName = user?.profile?.first_name_ar || user?.profile?.first_name || user?.email?.split('@')[0] || 'الضيف';

  // Quick stats for hero section
  const quickStats = [
    { label: 'الأسطول النشط', value: '24 سيارة', trend: '+2' },
    { label: 'العملاء', value: '157', trend: '+12' },
    { label: 'الإيرادات', value: '12.4K د.ك', trend: '+8.2%' }
  ];

  // Quick actions configuration
  const quickActions = [
    {
      id: 'new-contract',
      title: 'إنشاء عقد جديد',
      description: 'إنشاء عقد إيجار جديد',
      icon: FileText,
      action: () => navigate('/fleet'),
      variant: 'primary' as const
    },
    {
      id: 'add-vehicle',
      title: 'إضافة سيارة جديدة',
      description: 'تسجيل سيارة في الأسطول',
      icon: Car,
      action: () => navigate('/fleet'),
      variant: 'default' as const
    },
    {
      id: 'new-customer',
      title: 'تسجيل عميل جديد',
      description: 'إضافة عميل جديد',
      icon: Users,
      action: () => navigate('/fleet'),
      variant: 'default' as const
    },
    {
      id: 'payment',
      title: 'إدخال دفعة مالية',
      description: 'تسجيل دفعة من عميل',
      icon: DollarSign,
      action: () => navigate('/finance/payments'),
      variant: 'default' as const
    },
    {
      id: 'violation',
      title: 'تسجيل مخالفة',
      description: 'إضافة مخالفة مرورية',
      icon: AlertTriangle,
      action: () => navigate('/fleet/traffic-violations'),
      variant: 'default' as const
    }
  ];

  // Fleet status items
  const fleetStatusItems = [
    {
      id: 'available',
      label: 'متاحة',
      value: fleetStatus.available,
      color: 'bg-success',
      bgColor: 'bg-success'
    },
    {
      id: 'rented',
      label: 'مؤجرة',
      value: fleetStatus.rented,
      color: 'bg-primary',
      bgColor: 'bg-primary'
    },
    {
      id: 'maintenance',
      label: 'صيانة',
      value: fleetStatus.maintenance,
      color: 'bg-warning',
      bgColor: 'bg-warning'
    },
    {
      id: 'out-of-service',
      label: 'خارج الخدمة',
      value: fleetStatus.outOfService,
      color: 'bg-destructive',
      bgColor: 'bg-destructive'
    }
  ];

  // Enhanced activities with proper icons
  const enhancedActivities = activities.map(activity => ({
    ...activity,
    icon: iconMap[activity.icon as keyof typeof iconMap] || FileText
  }));

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">حدث خطأ في تحميل البيانات</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Welcome Hero */}
      <WelcomeHero 
        userName={userName}
        quickStats={quickStats}
      />

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-[120px] w-full rounded-lg" />
            </div>
          ))
        ) : (
          metrics.map((metric, index) => {
            const icons = [Car, FileText, Users, DollarSign];
            return (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                changeType={metric.changeType}
                icon={icons[index]}
                trend={metric.trend}
              />
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enhanced Activity Feed */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full rounded-lg" />
            </div>
          ) : (
            <ActivityFeed activities={enhancedActivities} />
          )}
        </div>

        {/* Enhanced Sidebar */}
        <div className="space-y-6">
          {/* Enhanced Quick Actions */}
          <QuickActions actions={quickActions} />

          {/* Enhanced Fleet Status */}
          <StatusOverview
            title="حالة الأسطول"
            icon={Car}
            items={fleetStatusItems}
          />

          {/* Enhanced Payroll Summary */}
          {payrollSummary && (
            <StatusOverview
              title="ملخص الرواتب"
              icon={Users}
              items={[
                {
                  id: 'total-payrolls',
                  label: 'إجمالي الرواتب',
                  value: payrollSummary.totalPayrolls,
                  color: 'bg-primary'
                },
                {
                  id: 'integration-rate',
                  label: 'التكامل المحاسبي',
                  value: Math.round(payrollSummary.integrationRate),
                  color: payrollSummary.integrationRate > 80 ? 'bg-success' : 'bg-warning'
                },
                {
                  id: 'pending-integration',
                  label: 'معلقة التكامل',
                  value: payrollSummary.pendingIntegration,
                  color: payrollSummary.pendingIntegration > 0 ? 'bg-warning' : 'bg-success'
                }
              ]}
              showProgress={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;