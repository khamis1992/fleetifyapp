import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import type { FuelRecord } from "@/hooks/useFuelManagement"

interface FuelAnalyticsProps {
  fuelRecords: FuelRecord[]
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00']

export function FuelAnalytics({ fuelRecords }: FuelAnalyticsProps) {
  // تحليل البيانات الشهرية
  const monthlyData = useMemo(() => {
    const monthlyStats: Record<string, { cost: number; liters: number; count: number }> = {}
    
    fuelRecords.forEach(record => {
      const date = new Date(record.fuel_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { cost: 0, liters: 0, count: 0 }
      }
      
      monthlyStats[monthKey].cost += record.total_cost
      monthlyStats[monthKey].liters += record.quantity_liters
      monthlyStats[monthKey].count += 1
    })
    
    return Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month: new Date(month + '-01').toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
        cost: Number(stats.cost.toFixed(2)),
        liters: Number(stats.liters.toFixed(1)),
        count: stats.count,
        avgCostPerLiter: Number((stats.cost / stats.liters).toFixed(3))
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6) // آخر 6 أشهر
  }, [fuelRecords])

  // تحليل أنواع الوقود
  const fuelTypeData = useMemo(() => {
    const typeStats: Record<string, { cost: number; liters: number }> = {}
    const typeLabels = {
      gasoline: 'بنزين',
      diesel: 'ديزل',
      lpg: 'غاز'
    }
    
    fuelRecords.forEach(record => {
      const type = record.fuel_type
      if (!typeStats[type]) {
        typeStats[type] = { cost: 0, liters: 0 }
      }
      typeStats[type].cost += record.total_cost
      typeStats[type].liters += record.quantity_liters
    })
    
    return Object.entries(typeStats).map(([type, stats]) => ({
      name: typeLabels[type as keyof typeof typeLabels] || type,
      value: Number(stats.cost.toFixed(2)),
      liters: Number(stats.liters.toFixed(1))
    }))
  }, [fuelRecords])

  // تحليل اتجاه الأسعار
  const priceData = useMemo(() => {
    return fuelRecords
      .slice(-30) // آخر 30 سجل
      .map(record => ({
        date: new Date(record.fuel_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        price: Number(record.cost_per_liter.toFixed(3)),
        station: record.fuel_station || 'غير محدد'
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [fuelRecords])

  return (
    <div className="space-y-6">
      {/* الإحصائيات الشهرية */}
      <Card>
        <CardHeader>
          <CardTitle>التكاليف والاستهلاك الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'cost' ? `${value} د.ك` : `${value} لتر`,
                  name === 'cost' ? 'التكلفة' : 'الكمية'
                ]}
              />
              <Bar yAxisId="left" dataKey="cost" fill="#8884d8" name="التكلفة" />
              <Bar yAxisId="right" dataKey="liters" fill="#82ca9d" name="الكمية" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* توزيع أنواع الوقود */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع استهلاك أنواع الوقود</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={fuelTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value} د.ك`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fuelTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} د.ك`, 'التكلفة']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* اتجاه الأسعار */}
        <Card>
          <CardHeader>
            <CardTitle>اتجاه أسعار الوقود</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} د.ك`, 'سعر اللتر']}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات مفصلة */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">معدل التكلفة الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyData.length > 0 
                ? (monthlyData.reduce((sum, month) => sum + month.cost, 0) / monthlyData.length).toFixed(3)
                : '0.000'
              } د.ك
            </div>
            <p className="text-sm text-muted-foreground">متوسط آخر {monthlyData.length} أشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">معدل الاستهلاك الشهري</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyData.length > 0 
                ? (monthlyData.reduce((sum, month) => sum + month.liters, 0) / monthlyData.length).toFixed(1)
                : '0.0'
              } لتر
            </div>
            <p className="text-sm text-muted-foreground">متوسط آخر {monthlyData.length} أشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">متوسط سعر اللتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fuelRecords.length > 0 
                ? (fuelRecords.reduce((sum, record) => sum + record.cost_per_liter, 0) / fuelRecords.length).toFixed(3)
                : '0.000'
              } د.ك
            </div>
            <p className="text-sm text-muted-foreground">لجميع السجلات</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}