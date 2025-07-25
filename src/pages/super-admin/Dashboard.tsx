import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Building2, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Crown
} from 'lucide-react';

interface SystemStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  totalRevenue: number;
  pendingPayments: number;
}

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
    fetchRecentCompanies();
  }, []);

  const fetchSystemStats = async () => {
    try {
      // Get companies count
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const { count: activeCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      // Get users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalCompanies: totalCompanies || 0,
        activeCompanies: activeCompanies || 0,
        totalUsers: totalUsers || 0,
        totalRevenue: 15750.50, // Mock data
        pendingPayments: 3
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const systemStatsCards = [
    {
      title: 'إجمالي الشركات',
      value: stats.totalCompanies.toString(),
      change: '+2 هذا الشهر',
      changeType: 'positive' as const,
      icon: Building2,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'الشركات النشطة',
      value: stats.activeCompanies.toString(),
      change: `${((stats.activeCompanies / stats.totalCompanies) * 100).toFixed(1)}%`,
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'إجمالي المستخدمين',
      value: stats.totalUsers.toString(),
      change: '+12 هذا الأسبوع',
      changeType: 'positive' as const,
      icon: Users,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'إجمالي الإيرادات',
      value: `${stats.totalRevenue.toFixed(2)} د.ك`,
      change: '+15.2%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'from-amber-500 to-amber-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-destructive via-destructive/90 to-warning p-8 rounded-2xl text-destructive-foreground shadow-elevated">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-8 w-8 text-warning" />
              <h1 className="text-3xl font-bold">
                لوحة تحكم مزود الخدمة
              </h1>
            </div>
            <p className="text-destructive-foreground/80">
              إدارة شاملة لجميع الشركات والمستخدمين في النظام
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Button variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              شركة جديدة
            </Button>
          </div>
        </div>
      </div>

      {/* System Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemStatsCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-card hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-success mr-1" />
                    <span className="text-sm text-success font-medium">
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Companies */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                أحدث الشركات المسجلة
              </CardTitle>
              <CardDescription>
                آخر الشركات التي انضمت للنظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-4 bg-background-soft rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {company.name_ar || company.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {company.commercial_register}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={company.subscription_status === 'active' ? 'default' : 'secondary'}
                        className={company.subscription_status === 'active' ? 'bg-success' : ''}
                      >
                        {company.subscription_status === 'active' ? 'نشط' : 'غير نشط'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        إدارة
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Alerts */}
        <div>
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                تنبيهات النظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">دفعات معلقة</p>
                  <p className="text-muted-foreground">{stats.pendingPayments} شركات لديها دفعات معلقة</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">النظام يعمل بشكل طبيعي</p>
                  <p className="text-muted-foreground">جميع الخدمات متاحة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-card mt-6">
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-3" variant="outline">
                <Building2 className="h-4 w-4" />
                إضافة شركة جديدة
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <Users className="h-4 w-4" />
                إدارة المستخدمين
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <DollarSign className="h-4 w-4" />
                مراجعة المدفوعات
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;