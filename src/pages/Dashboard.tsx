import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePayrollSummary } from '@/hooks/usePayrollFinancialAnalysis';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useFleetStatus } from '@/hooks/useFleetStatus';
import { WelcomeScreen } from '@/components/ui/welcome-screen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Plus,
  Activity
} from 'lucide-react';

// Helper function to get icon component by name
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    FileText,
    AlertTriangle,
    Users,
    Activity
  };
  return iconMap[iconName] || Activity;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: payrollSummary } = usePayrollSummary();
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities();
  const { data: fleetStatus, isLoading: fleetLoading } = useFleetStatus();

  // Check if this is a new company with no data
  const isNewCompany = !statsLoading && dashboardStats && 
    dashboardStats.totalVehicles === 0 && 
    dashboardStats.totalCustomers === 0 && 
    dashboardStats.activeContracts === 0;

  // Show welcome screen for new companies
  if (isNewCompany) {
    return (
      <WelcomeScreen 
        companyName={user?.company?.name || user?.company?.name_ar}
        onGetStarted={() => {
          // This could navigate to a specific setup flow
          console.log('Getting started...');
        }}
      />
    );
  }

  // Prepare dashboard stats data
  const statsData = dashboardStats ? [
    {
      title: 'إجمالي الأسطول',
      value: dashboardStats.totalVehicles.toString(),
      change: dashboardStats.vehiclesChange,
      changeType: 'positive' as const,
      icon: Car,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'العقود النشطة',
      value: dashboardStats.activeContracts.toString(),
      change: dashboardStats.contractsChange,
      changeType: 'positive' as const,
      icon: FileText,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'العملاء',
      value: dashboardStats.totalCustomers.toString(),
      change: dashboardStats.customersChange,
      changeType: 'positive' as const,
      icon: Users,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'الإيرادات الشهرية',
      value: `${dashboardStats.monthlyRevenue.toFixed(0)} د.ك`,
      change: dashboardStats.revenueChange,
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'from-amber-500 to-amber-600'
    }
  ] : [];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-primary p-8 rounded-2xl text-primary-foreground shadow-elevated">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            مرحباً، {user?.profile?.first_name_ar || user?.profile?.first_name || user?.email?.split('@')[0] || 'الضيف'}
          </h1>
          <p className="text-primary-foreground/80">
            نظرة سريعة على أداء شركتك اليوم
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="group border-0 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm shadow-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-20 mb-3"></div>
                  <div className="h-8 bg-muted rounded w-16 mb-3"></div>
                  <div className="h-4 bg-muted rounded w-12"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : statsData.length === 0 ? (
          // Empty state for new companies
          <div className="lg:col-span-4 text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">مرحباً بك في نظام إدارة الأسطول</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإضافة المركبات والعملاء لتظهر الإحصائيات هنا</p>
            <div className="flex gap-3 justify-center">
              <Button className="gap-2">
                <Car className="h-4 w-4" />
                إضافة مركبة
              </Button>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                إضافة عميل
              </Button>
            </div>
          </div>
        ) : (
          statsData.map((stat, index) => (
          <Card key={index} className="group border-0 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
            <CardContent className="p-0 overflow-hidden">
              <div className="p-6 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                      {stat.value}
                    </p>
                    <div className="flex items-center">
                      <div className="flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-semibold">
                        <TrendingUp className="h-3 w-3" />
                        {stat.change}
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <stat.icon className="h-7 w-7 text-white drop-shadow-sm" />
                    </div>
                    <div className={`absolute inset-0 p-4 rounded-2xl bg-gradient-to-br ${stat.color} opacity-20 blur-xl group-hover:opacity-40 transition-all duration-300`}>
                      <stat.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Bottom Accent Line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                الأنشطة الأخيرة
              </CardTitle>
              <CardDescription>
                آخر التحديثات في نظامك
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                // Loading skeleton
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-background-soft rounded-lg animate-pulse">
                      <div className="h-8 w-8 bg-muted rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !recentActivities || recentActivities.length === 0 ? (
                // Empty state
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد أنشطة حديثة</p>
                  <p className="text-xs text-muted-foreground mt-1">ستظهر الأنشطة هنا عند بدء استخدام النظام</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const IconComponent = getIconComponent(activity.icon);
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-background-soft rounded-lg">
                        <div className={`p-2 rounded-lg bg-muted ${activity.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {activity.time}
                            </span>
                          </div>
                          <p className="text-sm">{activity.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
              <CardDescription>
                الإجراءات الأكثر استخداماً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-3" variant="outline">
                <FileText className="h-4 w-4" />
                إنشاء عقد جديد
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <Car className="h-4 w-4" />
                إضافة سيارة جديدة
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <Users className="h-4 w-4" />
                تسجيل عميل جديد
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <DollarSign className="h-4 w-4" />
                إدخال دفعة مالية
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <AlertTriangle className="h-4 w-4" />
                تسجيل مخالفة
              </Button>
            </CardContent>
          </Card>

          {/* Fleet Status */}
          <Card className="border-0 shadow-card mt-6">
            <CardHeader>
              <CardTitle>حالة الأسطول</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fleetLoading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between animate-pulse">
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-8"></div>
                  </div>
                ))
              ) : !fleetStatus || fleetStatus.total === 0 ? (
                // Empty state
                <div className="text-center py-6">
                  <Car className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد مركبات مضافة</p>
                  <Button size="sm" className="mt-3 gap-2">
                    <Plus className="h-3 w-3" />
                    إضافة مركبة
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">متاحة</span>
                    <Badge variant="default" className="bg-success">{fleetStatus.available}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">مؤجرة</span>
                    <Badge variant="default" className="bg-primary">{fleetStatus.rented}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">صيانة</span>
                    <Badge variant="default" className="bg-warning">{fleetStatus.maintenance}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">خارج الخدمة</span>
                    <Badge variant="destructive">{fleetStatus.outOfService}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payroll Summary */}
          {payrollSummary && (
            <Card className="border-0 shadow-card mt-6">
              <CardHeader>
                <CardTitle>ملخص الرواتب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">إجمالي الرواتب</span>
                  <Badge variant="default">{payrollSummary.totalPayrolls}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">التكامل المحاسبي</span>
                  <Badge 
                    variant={payrollSummary.integrationRate > 80 ? "default" : "secondary"}
                    className={payrollSummary.integrationRate > 80 ? "bg-green-600" : ""}
                  >
                    {payrollSummary.integrationRate.toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">المبلغ الإجمالي</span>
                  <span className="text-sm font-medium">
                    {(payrollSummary.totalNetAmount / 1000).toFixed(1)}ك د.ك
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">معلقة التكامل</span>
                  <Badge 
                    variant={payrollSummary.pendingIntegration > 0 ? "secondary" : "default"}
                    className={payrollSummary.pendingIntegration > 0 ? "bg-yellow-500" : "bg-green-600"}
                  >
                    {payrollSummary.pendingIntegration}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;