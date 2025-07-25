import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Plus
} from 'lucide-react';

const DashboardStats = [
  {
    title: 'إجمالي الأسطول',
    value: '24',
    change: '+2',
    changeType: 'positive' as const,
    icon: Car,
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'العقود النشطة',
    value: '18',
    change: '+3',
    changeType: 'positive' as const,
    icon: FileText,
    color: 'from-green-500 to-green-600'
  },
  {
    title: 'العملاء',
    value: '157',
    change: '+12',
    changeType: 'positive' as const,
    icon: Users,
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'الإيرادات الشهرية',
    value: '12,450 د.ك',
    change: '+8.2%',
    changeType: 'positive' as const,
    icon: DollarSign,
    color: 'from-amber-500 to-amber-600'
  }
];

const RecentActivities = [
  {
    id: 1,
    type: 'عقد جديد',
    description: 'تم إنشاء عقد جديد للسيد أحمد المحمد',
    time: 'منذ ساعتين',
    icon: FileText,
    color: 'text-green-600'
  },
  {
    id: 2,
    type: 'صيانة مطلوبة',
    description: 'السيارة ABC-123 تحتاج صيانة دورية',
    time: 'منذ 4 ساعات',
    icon: AlertTriangle,
    color: 'text-amber-600'
  },
  {
    id: 3,
    type: 'عميل جديد',
    description: 'تم تسجيل عميل جديد: سارة الكندري',
    time: 'منذ يوم',
    icon: Users,
    color: 'text-blue-600'
  }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-primary p-8 rounded-2xl text-primary-foreground shadow-elevated">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              مرحباً، {user?.profile?.first_name_ar || user?.profile?.first_name || 'المستخدم'}
            </h1>
            <p className="text-primary-foreground/80">
              نظرة سريعة على أداء شركتك اليوم
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Button variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              عقد جديد
            </Button>
            <Button variant="outline" className="gap-2 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
              <Calendar className="h-4 w-4" />
              التقويم
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DashboardStats.map((stat, index) => (
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
              <div className="space-y-4">
                {RecentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 bg-background-soft rounded-lg">
                    <div className={`p-2 rounded-lg bg-muted ${activity.color}`}>
                      <activity.icon className="h-4 w-4" />
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
                ))}
              </div>
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
              <div className="flex items-center justify-between">
                <span className="text-sm">متاحة</span>
                <Badge variant="default" className="bg-success">6</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">مؤجرة</span>
                <Badge variant="default" className="bg-primary">18</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">صيانة</span>
                <Badge variant="default" className="bg-warning">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">خارج الخدمة</span>
                <Badge variant="destructive">1</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;