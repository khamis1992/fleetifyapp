import React from 'react';
import { useSystemLogStats } from '@/hooks/useSystemLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  Users, 
  FileText, 
  Car, 
  Building2, 
  CreditCard, 
  Shield,
  Database,
  BarChart3,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'customers':
      return <Users className="h-4 w-4 text-blue-600" />;
    case 'contracts':
      return <FileText className="h-4 w-4 text-green-600" />;
    case 'fleet':
      return <Car className="h-4 w-4 text-purple-600" />;
    case 'hr':
      return <Building2 className="h-4 w-4 text-orange-600" />;
    case 'finance':
      return <CreditCard className="h-4 w-4 text-emerald-600" />;
    case 'authentication':
      return <Shield className="h-4 w-4 text-indigo-600" />;
    case 'system':
      return <Database className="h-4 w-4 text-gray-600" />;
    case 'reports':
      return <BarChart3 className="h-4 w-4 text-cyan-600" />;
    case 'backup':
      return <Archive className="h-4 w-4 text-amber-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
};

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'error':
      return <XCircle className="h-3 w-3 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
    case 'info':
      return <Info className="h-3 w-3 text-blue-600" />;
    default:
      return <CheckCircle className="h-3 w-3 text-green-600" />;
  }
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    customers: 'العملاء',
    contracts: 'العقود',
    fleet: 'الأسطول',
    hr: 'الموارد البشرية',
    finance: 'المالية',
    authentication: 'المصادقة',
    system: 'النظام',
    reports: 'التقارير',
    backup: 'النسخ الاحتياطية'
  };
  return labels[category] || category;
};

export const SystemActivityCard: React.FC = () => {
  const { data: stats, isLoading } = useSystemLogStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>نشاط النظام</CardTitle>
          <CardDescription>إحصائيات العمليات الحديثة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>نشاط النظام</CardTitle>
          <CardDescription>لا توجد بيانات متاحة</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            لا يمكن تحميل إحصائيات النشاط
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            إحصائيات النشاط
          </CardTitle>
          <CardDescription>ملخص العمليات في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <StatCardNumber value={stats.total} className="text-blue-600" />
              <div className="text-sm text-blue-600">إجمالي السجلات</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <StatCardNumber value={stats.today} className="text-green-600" />
              <div className="text-sm text-green-600">عمليات اليوم</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <StatCardNumber value={stats.errors} className="text-red-600" />
              <div className="text-sm text-red-600">أخطاء</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <StatCardNumber value={stats.warnings} className="text-yellow-600" />
              <div className="text-sm text-yellow-600">تحذيرات</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>التوزيع حسب الفئة</CardTitle>
          <CardDescription>عدد العمليات لكل فئة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byCategory)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <span className="text-sm font-medium">
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>النشاط الحديث</CardTitle>
          <CardDescription>آخر 10 عمليات في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {stats.recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mt-1">
                    {getCategoryIcon(log.category)}
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {getCategoryLabel(log.category)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {log.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};