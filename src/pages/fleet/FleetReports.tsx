import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useFleetAnalytics, useProcessVehicleDepreciation } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, TrendingDown, Car, Wrench, DollarSign, BarChart3, FileText, Download } from "lucide-react";
import { TrafficViolationReports } from "@/components/fleet/TrafficViolationReports";
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

  const { data: analytics, isLoading, error } = useFleetAnalytics(profile?.company_id);
  const processDepreciation = useProcessVehicleDepreciation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل التحليلات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Fleet analytics error:", error);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-2">حدث خطأ في تحميل البيانات</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Provide fallback data if analytics is null
  const safeAnalytics = analytics || {
    totalVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    rentedVehicles: 0,
    totalBookValue: 0,
    totalDepreciation: 0,
    monthlyMaintenanceCost: 0,
    utilizationRate: 0,
    maintenanceRate: 0,
    vehicles: [],
    maintenance: [],
  };

  const statusData = [
    { name: 'متاحة', value: safeAnalytics.availableVehicles, color: COLORS[0] },
    { name: 'مؤجرة', value: safeAnalytics.rentedVehicles, color: COLORS[1] },
    { name: 'قيد الصيانة', value: safeAnalytics.maintenanceVehicles, color: COLORS[2] },
  ];

  const monthlyData = [
    { month: 'الإيرادات', amount: safeAnalytics.vehicles.reduce((sum, v) => sum + (v.monthly_rate || 0), 0) },
    { month: 'الإهلاك', amount: safeAnalytics.totalDepreciation },
    { month: 'الصيانة', amount: safeAnalytics.monthlyMaintenanceCost },
  ];

  const handleProcessDepreciation = () => {
    processDepreciation.mutate(undefined);
  };

  // Function to generate vehicle usage report
  const generateVehicleUsageReport = () => {
    if (!safeAnalytics.vehicles || safeAnalytics.vehicles.length === 0) {
      alert("لا توجد بيانات مركبات لإنشاء التقرير");
      return;
    }

    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.totalVehicles}</div>
          <div class="stat-label">إجمالي المركبات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.availableVehicles}</div>
          <div class="stat-label">المركبات المتاحة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.rentedVehicles}</div>
          <div class="stat-label">المركبات المؤجرة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.utilizationRate.toFixed(1)}%</div>
          <div class="stat-label">معدل الاستخدام</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>الماركة</th>
            <th>النموذج</th>
            <th>السنة</th>
            <th>الحالة</th>
            <th>السعر اليومي</th>
            <th>السعر الشهري</th>
          </tr>
        </thead>
        <tbody>
          ${safeAnalytics.vehicles.map(vehicle => `
            <tr>
              <td>${vehicle.plate_number}</td>
              <td>${vehicle.make}</td>
              <td>${vehicle.model}</td>
              <td>${vehicle.year}</td>
              <td>${vehicle.status === 'available' ? 'متاحة' : vehicle.status === 'rented' ? 'مؤجرة' : 'في الصيانة'}</td>
              <td>KWD ${(vehicle.daily_rate || 0).toFixed(3)}</td>
              <td>KWD ${(vehicle.monthly_rate || 0).toFixed(3)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    createHTMLReport(content, "تقرير استخدام المركبات");
  };

  // Function to generate maintenance cost analysis report
  const generateMaintenanceCostReport = () => {
    if (!safeAnalytics.maintenance || safeAnalytics.maintenance.length === 0) {
      alert("لا توجد بيانات صيانة لإنشاء التقرير");
      return;
    }

    const totalCost = safeAnalytics.maintenance.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);
    const completedMaintenance = safeAnalytics.maintenance.filter(m => m.status === 'completed');
    const pendingMaintenance = safeAnalytics.maintenance.filter(m => m.status === 'pending');

    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.maintenance.length}</div>
          <div class="stat-label">إجمالي أعمال الصيانة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${completedMaintenance.length}</div>
          <div class="stat-label">الصيانة المكتملة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pendingMaintenance.length}</div>
          <div class="stat-label">الصيانة المعلقة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${totalCost.toFixed(3)}</div>
          <div class="stat-label">إجمالي التكلفة</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>نوع الصيانة</th>
            <th>التاريخ المجدول</th>
            <th>الحالة</th>
            <th>التكلفة المقدرة</th>
            <th>الوصف</th>
          </tr>
        </thead>
        <tbody>
          ${safeAnalytics.maintenance.map(maintenance => `
            <tr>
              <td>${maintenance.vehicles?.plate_number || 'غير محدد'}</td>
              <td>${maintenance.maintenance_type === 'routine' ? 'صيانة دورية' : 
                   maintenance.maintenance_type === 'repair' ? 'إصلاح' : 
                   maintenance.maintenance_type === 'emergency' ? 'صيانة طارئة' : 
                   maintenance.maintenance_type}</td>
              <td>${new Date(maintenance.scheduled_date).toLocaleDateString('en-GB')}</td>
              <td>${maintenance.status === 'completed' ? 'مكتملة' : 
                   maintenance.status === 'in_progress' ? 'قيد التنفيذ' : 
                   maintenance.status === 'pending' ? 'معلقة' : maintenance.status}</td>
              <td>KWD ${(maintenance.estimated_cost || 0).toFixed(3)}</td>
              <td>${maintenance.description || 'لا يوجد وصف'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    createHTMLReport(content, "تحليل تكاليف الصيانة");
  };

  // Function to generate financial performance report
  const generateFinancialPerformanceReport = () => {
    const monthlyRevenue = safeAnalytics.vehicles.reduce((sum, v) => sum + (v.monthly_rate || 0), 0);
    
    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">KWD ${safeAnalytics.totalBookValue.toFixed(3)}</div>
          <div class="stat-label">قيمة الأسطول</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${monthlyRevenue.toFixed(3)}</div>
          <div class="stat-label">الإيرادات الشهرية المحتملة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${safeAnalytics.totalDepreciation.toFixed(3)}</div>
          <div class="stat-label">إجمالي الإهلاك</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${safeAnalytics.monthlyMaintenanceCost.toFixed(3)}</div>
          <div class="stat-label">تكلفة الصيانة الشهرية</div>
        </div>
      </div>

      <div class="analysis-section">
        <h3>تحليل الأداء المالي</h3>
        <p><strong>معدل الاستخدام:</strong> ${safeAnalytics.utilizationRate.toFixed(1)}%</p>
        <p><strong>الإيرادات الفعلية:</strong> KWD ${(monthlyRevenue * safeAnalytics.utilizationRate / 100).toFixed(3)}</p>
        <p><strong>صافي الإيرادات (بعد الصيانة):</strong> KWD ${((monthlyRevenue * safeAnalytics.utilizationRate / 100) - safeAnalytics.monthlyMaintenanceCost).toFixed(3)}</p>
      </div>
    `;

    createHTMLReport(content, "تقرير الأداء المالي");
  };

  // Function to generate operational efficiency report
  const generateOperationalEfficiencyReport = () => {
    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.utilizationRate.toFixed(1)}%</div>
          <div class="stat-label">معدل الاستخدام</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.maintenanceRate.toFixed(1)}%</div>
          <div class="stat-label">معدل الصيانة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${((safeAnalytics.availableVehicles / safeAnalytics.totalVehicles) * 100).toFixed(1)}%</div>
          <div class="stat-label">معدل التوفر</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.totalVehicles}</div>
          <div class="stat-label">حجم الأسطول</div>
        </div>
      </div>

      <div class="analysis-section">
        <h3>تحليل الكفاءة التشغيلية</h3>
        <p><strong>المركبات المتاحة:</strong> ${safeAnalytics.availableVehicles} مركبة</p>
        <p><strong>المركبات المؤجرة:</strong> ${safeAnalytics.rentedVehicles} مركبة</p>
        <p><strong>المركبات في الصيانة:</strong> ${safeAnalytics.maintenanceVehicles} مركبة</p>
        <p><strong>توصيات:</strong></p>
        <ul>
          ${safeAnalytics.utilizationRate < 70 ? '<li>معدل الاستخدام منخفض - يُنصح بتحسين استراتيجيات التسويق</li>' : ''}
          ${safeAnalytics.maintenanceRate > 20 ? '<li>معدل الصيانة مرتفع - يُنصح بمراجعة خطة الصيانة الوقائية</li>' : ''}
          ${safeAnalytics.availableVehicles > safeAnalytics.totalVehicles * 0.5 ? '<li>نسبة عالية من المركبات المتاحة - فرصة لزيادة الإيجارات</li>' : ''}
        </ul>
      </div>
    `;

    createHTMLReport(content, "تقرير الكفاءة التشغيلية");
  };

  // Function to generate profitability analysis report
  const generateProfitabilityAnalysisReport = () => {
    const monthlyRevenue = safeAnalytics.vehicles.reduce((sum, v) => sum + (v.monthly_rate || 0), 0);
    const actualRevenue = monthlyRevenue * safeAnalytics.utilizationRate / 100;
    const netProfit = actualRevenue - safeAnalytics.monthlyMaintenanceCost;
    
    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">KWD ${actualRevenue.toFixed(3)}</div>
          <div class="stat-label">الإيرادات الفعلية</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${safeAnalytics.monthlyMaintenanceCost.toFixed(3)}</div>
          <div class="stat-label">تكاليف الصيانة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${netProfit.toFixed(3)}</div>
          <div class="stat-label">صافي الربح</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${((netProfit / actualRevenue) * 100).toFixed(1)}%</div>
          <div class="stat-label">هامش الربح</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>السعر الشهري</th>
            <th>معدل الاستخدام المقدر</th>
            <th>الإيرادات المتوقعة</th>
            <th>الربحية</th>
          </tr>
        </thead>
        <tbody>
          ${safeAnalytics.vehicles.map(vehicle => {
            const vehicleRevenue = (vehicle.monthly_rate || 0) * (safeAnalytics.utilizationRate / 100);
            const profitability = vehicleRevenue > 0 ? 'مربحة' : 'غير مربحة';
            return `
              <tr>
                <td>${vehicle.plate_number}</td>
                <td>KWD ${(vehicle.monthly_rate || 0).toFixed(3)}</td>
                <td>${safeAnalytics.utilizationRate.toFixed(1)}%</td>
                <td>KWD ${vehicleRevenue.toFixed(3)}</td>
                <td>${profitability}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    createHTMLReport(content, "تحليل الربحية");
  };

  // Function to generate forecasting report
  const generateForecastingReport = () => {
    const monthlyRevenue = safeAnalytics.vehicles.reduce((sum, v) => sum + (v.monthly_rate || 0), 0);
    const actualRevenue = monthlyRevenue * safeAnalytics.utilizationRate / 100;
    const projectedRevenue3Months = actualRevenue * 3;
    const projectedRevenue6Months = actualRevenue * 6;
    const projectedRevenue12Months = actualRevenue * 12;
    
    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">KWD ${projectedRevenue3Months.toFixed(3)}</div>
          <div class="stat-label">توقعات 3 أشهر</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${projectedRevenue6Months.toFixed(3)}</div>
          <div class="stat-label">توقعات 6 أشهر</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${projectedRevenue12Months.toFixed(3)}</div>
          <div class="stat-label">توقعات سنوية</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${safeAnalytics.utilizationRate.toFixed(1)}%</div>
          <div class="stat-label">معدل الاستخدام الحالي</div>
        </div>
      </div>

      <div class="analysis-section">
        <h3>تحليل التوقعات</h3>
        <p><strong>الإيرادات الشهرية الحالية:</strong> KWD ${actualRevenue.toFixed(3)}</p>
        <p><strong>معدل النمو المتوقع:</strong> 5% شهرياً (افتراضي)</p>
        <p><strong>توقعات محسنة بمعدل نمو 5%:</strong></p>
        <ul>
          <li>3 أشهر: KWD ${(projectedRevenue3Months * 1.05).toFixed(3)}</li>
          <li>6 أشهر: KWD ${(projectedRevenue6Months * 1.10).toFixed(3)}</li>
          <li>12 شهر: KWD ${(projectedRevenue12Months * 1.20).toFixed(3)}</li>
        </ul>
        <p><strong>توصيات لتحسين التوقعات:</strong></p>
        <ul>
          <li>زيادة معدل الاستخدام إلى 85%</li>
          <li>تحسين استراتيجيات التسعير</li>
          <li>تطوير خدمات إضافية</li>
        </ul>
      </div>
    `;

    createHTMLReport(content, "تقرير التوقعات");
  };

  // Helper function to create HTML reports
  const createHTMLReport = (content: string, title: string) => {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        @media print { 
            body { margin: 0; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; color: #333; background: white; padding: 20px; 
        }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e9ecef; }
        .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
        .report-title { font-size: 20px; color: #34495e; margin-bottom: 5px; }
        .report-date { font-size: 14px; color: #7f8c8d; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
        .stat-label { font-size: 14px; color: #7f8c8d; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: right; border: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .analysis-section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .analysis-section h3 { color: #2c3e50; margin-bottom: 15px; }
        .analysis-section p { margin-bottom: 10px; }
        .analysis-section ul { margin: 10px 0; padding-right: 20px; }
        .controls { margin: 20px 0; text-align: center; }
        .btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 0 10px; }
        .btn:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">Fleetify</div>
        <div class="report-title">${title}</div>
        <div class="report-date">تاريخ التقرير: ${currentDate}</div>
    </div>
    
    ${content}
    
    <div class="controls no-print">
        <button class="btn" onclick="window.print()">طباعة التقرير</button>
        <button class="btn" onclick="window.close()">إغلاق</button>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      newWindow.focus();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      // Fallback for blocked popups
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
            <div className="text-2xl font-bold">{safeAnalytics.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {safeAnalytics.availableVehicles} متاحة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيمة الأسطول</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeAnalytics.totalBookValue)}</div>
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
            <div className="text-2xl font-bold">{safeAnalytics.utilizationRate.toFixed(1)}%</div>
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
            <div className="text-2xl font-bold">{formatCurrency(safeAnalytics.monthlyMaintenanceCost)}</div>
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
                إجمالي الإهلاك المتراكم: {formatCurrency(safeAnalytics.totalDepreciation)}
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

      {/* Traffic Violation Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>تقارير المخالفات المرورية</span>
          </CardTitle>
          <CardDescription>
            إنشاء وتصدير تقارير شاملة عن المخالفات المرورية ومدفوعاتها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrafficViolationReports />
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
                <Button variant="outline" className="w-full" onClick={generateVehicleUsageReport}>
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
                <Button variant="outline" className="w-full" onClick={generateMaintenanceCostReport}>
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
                <Button variant="outline" className="w-full" onClick={generateFinancialPerformanceReport}>
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
                <Button variant="outline" className="w-full" onClick={generateOperationalEfficiencyReport}>
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
                <Button variant="outline" className="w-full" onClick={generateProfitabilityAnalysisReport}>
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
                <Button variant="outline" className="w-full" onClick={generateForecastingReport}>
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
            {safeAnalytics.maintenance.slice(0, 5).map((maintenance: any) => (
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
            {safeAnalytics.maintenance.length === 0 && (
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