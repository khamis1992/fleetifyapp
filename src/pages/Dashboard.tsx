import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedDashboardStats } from '@/hooks/useEnhancedDashboardStats';
import { useEnhancedRecentActivities } from '@/hooks/useEnhancedRecentActivities';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { EnhancedStatsGrid } from '@/components/dashboard/EnhancedStatsGrid';
import { SmartAlertsPanel } from '@/components/dashboard/SmartAlertsPanel';
import { FinancialOverviewCard } from '@/components/dashboard/FinancialOverviewCard';
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
  Activity,
  ArrowRight,
  Zap
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
  const { data: enhancedStats, isLoading: statsLoading } = useEnhancedDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useEnhancedRecentActivities();
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview();

  // Check if this is a new company with no data
  const isNewCompany = !statsLoading && enhancedStats && 
    enhancedStats.totalVehicles === 0 && 
    enhancedStats.totalCustomers === 0 && 
    enhancedStats.activeContracts === 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };


  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-50"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl"></div>
        <div className="relative p-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4 flex-1">
              <div className="animate-fade-in">
                <p className="text-lg text-muted-foreground font-medium">
                  {getGreeting()}، {user?.profile?.first_name_ar || user?.profile?.first_name || user?.email?.split('@')[0] || 'الضيف'}! 👋
                </p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent leading-tight">
                  لوحة التحكم
                </h1>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                  نظرة شاملة على أداء شركتك وآخر التطورات في نظام إدارة الأسطول
                </p>
              </div>
              {isNewCompany && (
                <div className="animate-fade-in bg-primary/10 border border-primary/20 rounded-2xl p-6 mt-6" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/20 rounded-xl">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">مرحباً بك في نظام إدارة الأسطول!</h3>
                      <p className="text-sm text-muted-foreground mb-4">ابدأ رحلتك بإضافة أول مركبة أو عميل لتفعيل جميع ميزات النظام</p>
                      <div className="flex flex-wrap gap-3">
                        <Button size="sm" className="gap-2">
                          <Car className="h-4 w-4" />
                          إضافة مركبة
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Users className="h-4 w-4" />
                          إضافة عميل
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-primary/20 backdrop-blur-sm rounded-full p-8 animate-float">
                  <Activity className="h-10 w-10 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <EnhancedStatsGrid stats={enhancedStats} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        {/* Recent Activities - Enhanced */}
        <div className="lg:col-span-2">
          <Card className="glass-card shadow-card card-hover animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                الأنشطة الأخيرة
              </CardTitle>
              <CardDescription className="text-base">
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
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => {
                    const IconComponent = getIconComponent(activity.icon);
                    return (
                      <div 
                        key={activity.id} 
                        className="group flex items-start gap-4 p-4 bg-gradient-card rounded-xl border border-border/50 hover:border-primary/20 transition-smooth hover:shadow-card hover:scale-[1.01]"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className={`p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-smooth ${activity.color}`}>
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                              {activity.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                              {activity.time}
                            </span>
                            {activity.priority === 'high' && (
                              <div className="h-2 w-2 bg-destructive rounded-full pulse-glow"></div>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{activity.description}</p>
                          {activity.amount && (
                            <p className="text-xs text-primary font-semibold mt-1">
                              {activity.amount}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Smart Alerts & Financial Overview */}
        <div className="space-y-6">
          <SmartAlertsPanel alerts={smartAlerts || []} loading={alertsLoading} />
          <FinancialOverviewCard data={financialOverview} loading={financialLoading} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;