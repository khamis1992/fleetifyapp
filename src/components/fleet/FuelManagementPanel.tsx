import { useState } from "react"
import { Plus, Fuel, TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FuelRecordForm } from "./FuelRecordForm"
import { FuelRecordsList } from "./FuelRecordsList"
import { FuelAnalytics } from "./FuelAnalytics"
import { useFuelRecords } from "@/hooks/useFuelManagement"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function FuelManagementPanel() {
  const [showFuelForm, setShowFuelForm] = useState(false)
  const { data: fuelRecords, isLoading } = useFuelRecords()

  // حساب الإحصائيات الأساسية
  const totalFuelCost = fuelRecords?.reduce((total, record) => total + record.total_cost, 0) || 0
  const totalLiters = fuelRecords?.reduce((total, record) => total + record.quantity_liters, 0) || 0
  const averageCostPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0

  // إحصائيات الشهر الحالي
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyRecords = fuelRecords?.filter(record => {
    const recordDate = new Date(record.fuel_date)
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
  }) || []

  const monthlyCost = monthlyRecords.reduce((total, record) => total + record.total_cost, 0)
  const monthlyLiters = monthlyRecords.reduce((total, record) => total + record.quantity_liters, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة الوقود</h2>
          <p className="text-muted-foreground">
            متابعة استهلاك الوقود وتكاليف التشغيل
          </p>
        </div>
        <Button onClick={() => setShowFuelForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة سجل وقود
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التكلفة</CardTitle>
            <Fuel className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFuelCost.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              جميع سجلات الوقود
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الكمية</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiters.toFixed(1)} لتر</div>
            <p className="text-xs text-muted-foreground">
              إجمالي الوقود المستهلك
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط السعر</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCostPerLiter.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              سعر اللتر الواحد
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">هذا الشهر</CardTitle>
            <Fuel className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCost.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              {monthlyLiters.toFixed(1)} لتر
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs للمحتوى */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records">سجلات الوقود</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="efficiency">كفاءة الاستهلاك</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <FuelRecordsList fuelRecords={fuelRecords || []} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <FuelAnalytics fuelRecords={fuelRecords || []} />
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>كفاءة استهلاك الوقود</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                سيتم إضافة تحليلات كفاءة الاستهلاك قريباً
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* نموذج إضافة سجل وقود */}
      {showFuelForm && (
        <FuelRecordForm 
          open={showFuelForm}
          onOpenChange={setShowFuelForm}
        />
      )}
    </div>
  )
}