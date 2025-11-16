/**
 * Legal Cases Tracking - Redesigned Version
 * تتبع القضايا القانونية - النسخة المحسّنة
 * 
 * Simplified from 7 tabs to 4:
 * 1. نظرة عامة (Overview) - Dashboard + Appointments + Alerts
 * 2. القضايا (Cases) - List + Details
 * 3. الإعدادات (Settings) - Auto-Create + Templates
 * 4. التقارير (Reports) - Overdue + Settlements + Analytics
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Scale, 
  Settings, 
  FileText,
  Plus,
  Zap,
  Calendar,
  Bell,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';

interface LegalCasesTrackingV2Props {
  companyId?: string;
}

const LegalCasesTrackingV2: React.FC<LegalCasesTrackingV2Props> = ({ companyId: propCompanyId }) => {
  const { user } = useAuth();
  const companyId = propCompanyId || user?.user_metadata?.company_id;

  const [activeTab, setActiveTab] = useState('overview');
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [showCaseWizard, setShowCaseWizard] = useState(false);

  // Mock data for demonstration
  const stats = {
    active: 45,
    urgent: 12,
    pending: 8,
    closed: 120,
    totalCost: 450000,
    averageDuration: 45,
    successRate: 85,
    upcomingAppointments: 5,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            إدارة القضايا القانونية
          </h1>
          <p className="text-muted-foreground mt-2">
            نظام متكامل لإدارة ومتابعة القضايا القانونية
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowTriggersConfig(true)}
            className="inline-flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            إعداد الإنشاء التلقائي
          </Button>
          <Button
            onClick={() => setShowCaseWizard(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            قضية جديدة
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            القضايا
            <Badge variant="secondary" className="ml-1">{stats.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview (Dashboard + Appointments + Alerts) */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">القضايا النشطة</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +3 منذ الأسبوع الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">قضايا عاجلة</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  تحتاج متابعة فورية
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">قضايا معلقة</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  في انتظار الإجراء
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">قضايا مغلقة</CardTitle>
                <XCircle className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.closed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  معدل النجاح {stats.successRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي التكاليف</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCost.toLocaleString('ar-SA')} ر.س</div>
                <p className="text-xs text-muted-foreground mt-1">
                  للقضايا النشطة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">متوسط المدة</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageDuration} يوم</div>
                <p className="text-xs text-muted-foreground mt-1">
                  من الفتح للإغلاق
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  من القضايا المغلقة
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                المواعيد القادمة
              </CardTitle>
              <CardDescription>
                لديك {stats.upcomingAppointments} مواعيد خلال الأسبوع القادم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">جلسة محكمة - قضية #{2025000 + i}</p>
                        <p className="text-sm text-muted-foreground">نزاع تجاري - شركة النور</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">2025-01-{20 + i}</p>
                      <p className="text-sm text-muted-foreground">10:00 صباحاً</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                التنبيهات الأخيرة
              </CardTitle>
              <CardDescription>
                آخر التحديثات والتنبيهات المهمة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'urgent', text: 'موعد محكمة غداً - قضية #2025001', time: 'منذ ساعة' },
                  { type: 'warning', text: 'انتهاء مهلة الرد خلال 3 أيام - قضية #2025002', time: 'منذ 3 ساعات' },
                  { type: 'info', text: 'تم إضافة مستند جديد - قضية #2025003', time: 'منذ 5 ساعات' },
                ].map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${
                      alert.type === 'urgent' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{alert.text}</p>
                      <p className="text-sm text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Cases (List + Details) */}
        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>قائمة القضايا</CardTitle>
              <CardDescription>
                سيتم تنفيذ عرض البطاقات المحسّن في المرحلة التالية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">قيد التطوير...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Settings (Auto-Create + Templates) */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                الإعدادات
              </CardTitle>
              <CardDescription>
                إعدادات النظام والقوالب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={() => setShowTriggersConfig(true)}
                className="w-full justify-start"
              >
                <Zap className="w-4 h-4 mr-2" />
                محفزات الإنشاء التلقائي
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <FileText className="w-4 h-4 mr-2" />
                قوالب المستندات (قريباً)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Reports (Overdue + Settlements + Analytics) */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>التقارير والتحليلات</CardTitle>
              <CardDescription>
                سيتم تنفيذ التقارير المفصلة في المرحلة التالية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">قيد التطوير...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AutoCreateCaseTriggersConfig
        open={showTriggersConfig}
        onOpenChange={setShowTriggersConfig}
        companyId={companyId || ''}
      />
    </div>
  );
};

export default LegalCasesTrackingV2;
