import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useFleetAnalytics, useProcessVehicleDepreciation } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, TrendingDown, Car, Wrench, DollarSign, BarChart3, FileText, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function FleetReports() {
  const { user } = useAuth();
  
  // Get user profile with company ID
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: analytics, isLoading } = useFleetAnalytics(profile?.company_id);
  const processDepreciation = useProcessVehicleDepreciation();

  if (isLoading || !analytics) {
    return <div>جاري تحميل التحليلات...</div>;
  }

  const statusData = [
    { name: 'متاحة', value: analytics.availableVehicles, color: COLORS[0] },
    { name: 'مؤجرة', value: analytics.rentedVehicles, color: COLORS[1] },
    { name: 'قيد الصيانة', value: analytics.maintenanceVehicles, color: COLORS[2] },
  ];

  const monthlyData = [
    { month: 'الإيرادات', amount: analytics.vehicles.reduce((sum, v) => sum + (v.monthly_rate || 0), 0) },
    { month: 'الإهلاك', amount: analytics.totalDepreciation },
    { month: 'الصيانة', amount: analytics.monthlyMaintenanceCost },
  ];

  const handleProcessDepreciation = () => {
    processDepreciation.mutate(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تقارير وتحليلات الأسطول</h1>
          <p className="text-muted-foreground">
            تحليلات شاملة وتقارير مفصلة لأداء الأسطول
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المركبات</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.availableVehicles} متاحة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيمة الأسطول</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalBookValue)}</div>
            <p className="text-xs text-muted-foreground">
              القيمة الدفترية الحالية
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الاستخدام</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.utilizationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              المركبات المؤجرة حالياً
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تكلفة الصيانة</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthlyMaintenanceCost)}</div>
            <p className="text-xs text-muted-foreground">
              هذا الشهر
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>توزيع حالة المركبات</CardTitle>
            <CardDescription>الحالة الحالية لجميع المركبات</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>النظرة المالية العامة</CardTitle>
            <CardDescription>المقاييس المالية الشهرية</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Depreciation Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>إدارة الإهلاك</span>
          </CardTitle>
          <CardDescription>
            معالجة الإهلاك الشهري لجميع المركبات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                إجمالي الإهلاك المتراكم: {formatCurrency(analytics.totalDepreciation)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                معالجة الإهلاك لتحديث القيم الدفترية للمركبات
              </p>
            </div>
            <Button 
              onClick={handleProcessDepreciation}
              disabled={processDepreciation.isPending}
            >
              {processDepreciation.isPending ? "جاري المعالجة..." : "معالجة الإهلاك"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>تقارير مخصصة</span>
          </CardTitle>
          <CardDescription>
            إنشاء وتصدير تقارير مفصلة عن أداء الأسطول
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تقرير استخدام المركبات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  تتبع استخدام المركبات وكفاءة الإيجار والإيرادات المحققة
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">تحليل تكاليف الصيانة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  تحليل شامل لتكاليف الصيانة والأنماط والتوقعات المستقبلية
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الأداء المالي</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  تحليل الإيرادات والإهلاك والعائد على الاستثمار
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">تقرير الكفاءة التشغيلية</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  قياس كفاءة العمليات ومعدلات استخدام الأسطول
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">تحليل الربحية</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  تحليل ربحية كل مركبة والأسطول ككل على مدار الزمن
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">تقرير التوقعات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  توقعات الإيرادات والتكاليف للأشهر القادمة
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>أنشطة الصيانة الحديثة</CardTitle>
          <CardDescription>سجلات الصيانة الأخيرة وحالتها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.maintenance.slice(0, 5).map((maintenance: any) => (
              <div key={maintenance.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{maintenance.vehicles?.plate_number || 'غير محدد'}</p>
                  <p className="text-sm text-muted-foreground">
                    {maintenance.maintenance_type === 'routine' ? 'صيانة دورية' :
                     maintenance.maintenance_type === 'repair' ? 'إصلاح' :
                     maintenance.maintenance_type === 'emergency' ? 'صيانة طارئة' :
                     maintenance.maintenance_type}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    maintenance.status === 'completed' ? 'default' :
                    maintenance.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {maintenance.status === 'completed' ? 'مكتملة' :
                     maintenance.status === 'in_progress' ? 'قيد التنفيذ' :
                     maintenance.status === 'pending' ? 'معلقة' : maintenance.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(maintenance.estimated_cost || 0)}
                  </p>
                </div>
              </div>
            ))}
            {analytics.maintenance.length === 0 && (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد أنشطة صيانة حديثة</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}