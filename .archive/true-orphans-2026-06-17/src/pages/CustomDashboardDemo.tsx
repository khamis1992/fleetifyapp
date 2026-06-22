import React from 'react'
import { CustomizableDashboard, DashboardWidget } from '@/components/dashboard/CustomizableDashboard'
import { StatsWidget } from '@/components/dashboard/example-widgets/StatsWidget'
import { Car, Users, DollarSign, TrendingUp, Calendar, AlertCircle, FileText, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Example widget components
function TotalVehiclesWidget() {
  return (
    <StatsWidget
      title="إجمالي المركبات"
      value="125"
      icon={Car}
      trend={{ value: 5, isPositive: true }}
      description="إجمالي المركبات في الأسطول"
    />
  )
}

function TotalCustomersWidget() {
  return (
    <StatsWidget
      title="إجمالي العملاء"
      value="450"
      icon={Users}
      trend={{ value: 12, isPositive: true }}
      description="عملاء نشطون"
    />
  )
}

function MonthlyRevenueWidget() {
  return (
    <StatsWidget
      title="الإيرادات الشهرية"
      value="125,000 ر.ع"
      icon={DollarSign}
      trend={{ value: 8, isPositive: true }}
      description="إيرادات هذا الشهر"
    />
  )
}

function ActiveContractsWidget() {
  return (
    <StatsWidget
      title="العقود النشطة"
      value="89"
      icon={FileText}
      trend={{ value: -3, isPositive: false }}
      description="عقود قيد التنفيذ"
    />
  )
}

function UpcomingRentalsWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          الحجوزات القادمة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm">أحمد محمد</span>
            <span className="text-xs text-muted-foreground">اليوم</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm">سارة علي</span>
            <span className="text-xs text-muted-foreground">غداً</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm">محمد خالد</span>
            <span className="text-xs text-muted-foreground">بعد يومين</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PendingPaymentsWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          المدفوعات المعلقة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-yellow-600">15,500 ر.ع</div>
        <p className="text-xs text-muted-foreground mt-1">12 دفعة متأخرة</p>
        <Button size="sm" className="mt-3 w-full">عرض التفاصيل</Button>
      </CardContent>
    </Card>
  )
}

function RevenueChartWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          الإيرادات الشهرية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-end justify-around gap-2">
          {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 92].map((height, idx) => (
            <div
              key={idx}
              className="flex-1 bg-primary rounded-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>يناير</span>
          <span>ديسمبر</span>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionsWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          إجراءات سريعة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" className="w-full" variant="outline">
          <Car className="h-4 w-4 ml-2" />
          إضافة مركبة
        </Button>
        <Button size="sm" className="w-full" variant="outline">
          <Users className="h-4 w-4 ml-2" />
          إضافة عميل
        </Button>
        <Button size="sm" className="w-full" variant="outline">
          <FileText className="h-4 w-4 ml-2" />
          عقد جديد
        </Button>
      </CardContent>
    </Card>
  )
}

export default function CustomDashboardDemo() {
  const dashboardWidgets: DashboardWidget[] = [
    {
      id: 'total-vehicles',
      title: 'Total Vehicles',
      titleAr: 'إجمالي المركبات',
      component: TotalVehiclesWidget,
      defaultVisible: true,
      defaultSize: 'small',
      category: 'stats',
    },
    {
      id: 'total-customers',
      title: 'Total Customers',
      titleAr: 'إجمالي العملاء',
      component: TotalCustomersWidget,
      defaultVisible: true,
      defaultSize: 'small',
      category: 'stats',
    },
    {
      id: 'monthly-revenue',
      title: 'Monthly Revenue',
      titleAr: 'الإيرادات الشهرية',
      component: MonthlyRevenueWidget,
      defaultVisible: true,
      defaultSize: 'small',
      category: 'stats',
    },
    {
      id: 'active-contracts',
      title: 'Active Contracts',
      titleAr: 'العقود النشطة',
      component: ActiveContractsWidget,
      defaultVisible: true,
      defaultSize: 'small',
      category: 'stats',
    },
    {
      id: 'upcoming-rentals',
      title: 'Upcoming Rentals',
      titleAr: 'الحجوزات القادمة',
      component: UpcomingRentalsWidget,
      defaultVisible: true,
      defaultSize: 'medium',
      category: 'lists',
    },
    {
      id: 'pending-payments',
      title: 'Pending Payments',
      titleAr: 'المدفوعات المعلقة',
      component: PendingPaymentsWidget,
      defaultVisible: true,
      defaultSize: 'medium',
      category: 'lists',
    },
    {
      id: 'revenue-chart',
      title: 'Revenue Chart',
      titleAr: 'رسم بياني للإيرادات',
      component: RevenueChartWidget,
      defaultVisible: true,
      defaultSize: 'large',
      category: 'charts',
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      titleAr: 'إجراءات سريعة',
      component: QuickActionsWidget,
      defaultVisible: false,
      defaultSize: 'small',
      category: 'actions',
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">لوحة التحكم القابلة للتخصيص</h1>
        <p className="text-muted-foreground">
          قم بسحب وإفلات العناصر لإعادة ترتيبها، أو إخفاء/إظهار العناصر حسب تفضيلاتك
        </p>
      </div>

      <CustomizableDashboard
        widgets={dashboardWidgets}
        dashboardId="main"
      />
    </div>
  )
}
