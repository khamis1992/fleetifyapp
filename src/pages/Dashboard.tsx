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
  Plus,
  MoreHorizontal
} from 'lucide-react';

const DashboardStats = [
  {
    title: 'المقررات الشهرية',
    value: '0',
    subtitle: 'لا توجد مقررات',
    icon: FileText,
    bgColor: 'bg-white',
    iconColor: 'text-gray-600'
  },
  {
    title: 'الإيرادات الشهرية',
    value: '0.000 د.ك',
    subtitle: 'من 0 غير ميدة',
    details: 'لا توجد إيرادات',
    icon: DollarSign,
    bgColor: 'bg-white',
    iconColor: 'text-gray-600'
  },
  {
    title: 'المطالبات الشهرية',
    value: '0',
    subtitle: 'عميل مدين',
    details: '0 مدين',
    icon: Users,
    bgColor: 'bg-white',
    iconColor: 'text-gray-600'
  },
  {
    title: 'إجمالي المواقع',
    value: '0',
    subtitle: 'هذا الشهر',
    details: '0 نشط',
    icon: AlertTriangle,
    bgColor: 'bg-white',
    iconColor: 'text-gray-600'
  }
];

const QuickActions = [
  {
    title: 'عرض جديد',
    subtitle: 'إنشاء عرض سعر جديد',
    bgColor: 'bg-blue-500',
    textColor: 'text-white'
  },
  {
    title: 'إدارة العملاء',
    subtitle: 'عرض وإدارة العملاء',
    bgColor: 'bg-green-500',
    textColor: 'text-white'
  },
  {
    title: 'الحجوزات والمبيعات',
    subtitle: 'إدارة حجوز الموفقين',
    bgColor: 'bg-orange-500',
    textColor: 'text-white'
  }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            مرحباً بك في البشائر الخليجية
          </h1>
          <p className="text-muted-foreground mt-1">
            نظرة شاملة على أعمالك وإدارة عمليات التاجر
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            اليوم
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            إضافة جديد
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DashboardStats.map((stat, index) => (
          <Card key={index} className={`${stat.bgColor} border border-border shadow-sm hover:shadow-md transition-smooth`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.subtitle}</p>
                  {stat.details && (
                    <p className="text-xs text-gray-400 mt-1">{stat.details}</p>
                  )}
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="text-xs">
                      تفاصيل
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Overview */}
        <div className="lg:col-span-2">
          <Card className="bg-white border border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">مهام اليوم</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    التقدم اليومي
                  </CardDescription>
                </div>
                <MoreHorizontal className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">لا توجد مهام اليوم</span>
                  </div>
                  <span className="text-sm text-gray-400">0%</span>
                </div>
                
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full w-0"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-sm text-gray-500">مولي</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">2</div>
                    <div className="text-sm text-gray-500">مكامل</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">2</div>
                    <div className="text-sm text-gray-500">إجمالي</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-sm text-gray-500">مميلة</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card className="bg-white border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {QuickActions.map((action, index) => (
                <Button
                  key={index}
                  className={`w-full h-auto p-4 ${action.bgColor} ${action.textColor} hover:opacity-90 transition-smooth`}
                  variant="default"
                >
                  <div className="flex flex-col items-center text-center gap-1">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs opacity-90">{action.subtitle}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="bg-white border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg font-semibold text-foreground">تنبيهات الميزانية</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">لا توجد تنبيهات حالياً - جميع مراكز التكلفة ضمن الميزانية</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Contracts */}
        <Card className="bg-white border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">العقود الحديثة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">لا توجد عقود جديدة هالة</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;