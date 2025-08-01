import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users, 
  CreditCard, 
  Calendar,
  TrendingUp,
  PieChart,
  Globe,
  Building2
} from 'lucide-react';

const SuperAdminReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  const handleDownloadReport = (reportType: string) => {
    toast.success(`يتم تحضير تقرير ${reportType}...`);
  };

  const reports = [
    {
      id: 'revenue',
      title: 'تقرير الإيرادات الشهرية',
      description: 'تفصيل شامل للإيرادات والمدفوعات',
      icon: BarChart3,
      color: 'text-blue-600'
    },
    {
      id: 'subscriptions',
      title: 'تقرير الاشتراكات',
      description: 'إحصائيات شاملة عن حالة الاشتراكات',
      icon: Users,
      color: 'text-green-600'
    },
    {
      id: 'performance',
      title: 'تقرير الأداء',
      description: 'تحليل شامل لأداء النظام والنمو',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      id: 'transactions',
      title: 'تقرير المعاملات',
      description: 'سجل مفصل لجميع المعاملات المالية',
      icon: CreditCard,
      color: 'text-orange-600'
    },
    {
      id: 'companies',
      title: 'تقرير الشركات',
      description: 'إحصائيات الشركات المسجلة والنشطة',
      icon: Building2,
      color: 'text-indigo-600'
    },
    {
      id: 'analytics',
      title: 'تقرير التحليلات المتقدمة',
      description: 'تحليلات مفصلة وتوقعات مستقبلية',
      icon: PieChart,
      color: 'text-pink-600'
    }
  ];

  const scheduledReports = [
    { name: 'تقرير شهري', schedule: 'يرسل في بداية كل شهر', active: true },
    { name: 'تقرير أسبوعي', schedule: 'يرسل كل يوم إثنين', active: false },
    { name: 'تقرير ربعي', schedule: 'يرسل في نهاية كل ربع', active: true },
    { name: 'تقرير سنوي', schedule: 'يرسل في نهاية السنة المالية', active: true }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">تقارير النظام</h1>
          <p className="text-muted-foreground">
            تحميل التقارير المفصلة وإدارة التقارير المجدولة
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          جميع الشركات
        </Badge>
      </div>

      {/* Quick Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${report.color}`} />
                  {report.title}
                </CardTitle>
                <CardDescription>
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => handleDownloadReport(report.title)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل التقرير
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            تقرير مخصص
          </CardTitle>
          <CardDescription>
            إنشاء تقرير مخصص لفترة محددة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الفترة الزمنية</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">الشهر الحالي</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="quarter">الربع الحالي</SelectItem>
                  <SelectItem value="year">السنة الحالية</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع التقرير</Label>
              <Select defaultValue="comprehensive">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">شامل</SelectItem>
                  <SelectItem value="financial">مالي فقط</SelectItem>
                  <SelectItem value="users">المستخدمين فقط</SelectItem>
                  <SelectItem value="performance">الأداء فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            className="w-full md:w-auto" 
            onClick={() => handleDownloadReport('المخصص')}
          >
            <Download className="h-4 w-4 mr-2" />
            إنشاء التقرير المخصص
          </Button>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>جدولة التقارير التلقائية</CardTitle>
          <CardDescription>
            إعداد التقارير التلقائية المنتظمة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{report.name}</div>
                  <div className="text-sm text-muted-foreground">{report.schedule}</div>
                </div>
                <Badge className={report.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {report.active ? 'نشط' : 'معطل'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminReports;