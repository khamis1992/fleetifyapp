import { useState } from "react"
import { FileText, Download, Calendar, BarChart3, PieChart, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useFleetAnalytics } from "@/hooks/useFleetAnalytics"
import { useFuelRecords } from "@/hooks/useFuelManagement"
import { useOdometerReadings } from "@/hooks/useOdometerReadings"
import { VehicleUtilizationReport } from "./VehicleUtilizationReport"
import { CostAnalysisReport } from "./CostAnalysisReport"

export function AdvancedFleetReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('all')
  
  const { data: fleetAnalytics } = useFleetAnalytics()
  const { data: fuelRecords } = useFuelRecords()
  const { data: odometerReadings } = useOdometerReadings()

  const reportTypes = [
    {
      id: 'utilization',
      name: 'تقرير الاستخدام',
      description: 'تحليل معدلات استخدام المركبات',
      icon: BarChart3,
      color: 'blue'
    },
    {
      id: 'cost-analysis',
      name: 'تحليل التكاليف',
      description: 'تفصيل جميع التكاليف التشغيلية',
      icon: PieChart,
      color: 'green'
    },
    {
      id: 'fuel-efficiency',
      name: 'كفاءة الوقود',
      description: 'تحليل استهلاك الوقود وكفاءة المركبات',
      icon: TrendingUp,
      color: 'orange'
    },
    {
      id: 'maintenance',
      name: 'تقرير الصيانة',
      description: 'حالة الصيانة وجدولة الأعمال القادمة',
      icon: FileText,
      color: 'purple'
    }
  ]

  const handleGenerateReport = (reportType: string) => {
    // هنا سيتم تنفيذ توليد التقرير
    console.log(`Generating ${reportType} report for period ${selectedPeriod}`)
  }

  const handleExportReport = (reportType: string, format: string) => {
    // هنا سيتم تنفيذ تصدير التقرير
    console.log(`Exporting ${reportType} report as ${format}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">التقارير المتقدمة</h2>
          <p className="text-muted-foreground">
            تقارير شاملة وتحليلات متقدمة لأداء الأسطول
          </p>
        </div>
      </div>

      {/* فلاتر التقارير */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>الفترة الزمنية</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                  <SelectItem value="quarterly">ربع سنوي</SelectItem>
                  <SelectItem value="yearly">سنوي</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>المركبة</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المركبات</SelectItem>
                  {/* سيتم إضافة المركبات هنا */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أنواع التقارير */}
      <div className="grid gap-6 md:grid-cols-2">
        {reportTypes.map((report) => {
          const IconComponent = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${report.color}-100`}>
                    <IconComponent className={`h-5 w-5 text-${report.color}-600`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleGenerateReport(report.id)}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    عرض التقرير
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportReport(report.id, 'pdf')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* التقارير التفصيلية */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="utilization">الاستخدام</TabsTrigger>
          <TabsTrigger value="costs">التكاليف</TabsTrigger>
          <TabsTrigger value="efficiency">الكفاءة</TabsTrigger>
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization">
          <VehicleUtilizationReport
            analytics={fleetAnalytics}
            period={selectedPeriod}
          />
        </TabsContent>

        <TabsContent value="costs">
          <CostAnalysisReport
            analytics={fleetAnalytics}
            fuelRecords={fuelRecords || []}
            period={selectedPeriod}
          />
        </TabsContent>

        <TabsContent value="efficiency">
          <Card>
            <CardHeader>
              <CardTitle>تقرير كفاءة الوقود</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                سيتم إضافة تقرير كفاءة الوقود قريباً
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>تقرير الصيانة المتقدم</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                سيتم إضافة تقرير الصيانة المتقدم قريباً
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">آخر تحديث</span>
            </div>
            <div className="text-lg font-semibold mt-1">
              {new Date().toLocaleDateString('ar-SA')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">سجلات الوقود</span>
            </div>
            <div className="text-lg font-semibold mt-1">
              {fuelRecords?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">قراءات العداد</span>
            </div>
            <div className="text-lg font-semibold mt-1">
              {odometerReadings?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">متوسط الاستخدام</span>
            </div>
            <div className="text-lg font-semibold mt-1">
              {fleetAnalytics?.averageUtilization.toFixed(1) || '0.0'}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}