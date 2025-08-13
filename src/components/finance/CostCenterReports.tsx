import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCostCenters } from '@/hooks/useFinance'
import { useCostCenterFinancialData } from '@/hooks/useCostCenterReports'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Target, DollarSign, AlertTriangle, Download } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter'

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted))', 'hsl(var(--accent))']

interface CostCenterReportsProps {
  className?: string
}

export const CostCenterReports: React.FC<CostCenterReportsProps> = ({ className }) => {
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current-month')
  
  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters()
  const { data: financialData, isLoading: dataLoading } = useCostCenterFinancialData(selectedCostCenter, selectedPeriod)
  const { formatCurrency, currency } = useCurrencyFormatter()

  if (costCentersLoading || dataLoading) {
    return <LoadingSpinner />
  }

  const selectedCenter = costCenters?.find(cc => cc.id === selectedCostCenter)

  const getVarianceColor = (variance: number) => {
    if (variance > 10) return 'text-red-600'
    if (variance > 5) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'destructive'
    if (utilization > 90) return 'secondary'
    return 'default'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">تقارير مراكز التكلفة</h2>
          <p className="text-muted-foreground">تحليل الأداء المالي لمراكز التكلفة</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="اختر مركز التكلفة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع مراكز التكلفة</SelectItem>
              {costCenters?.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  {center.center_code} - {center.center_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">الشهر الحالي</SelectItem>
              <SelectItem value="last-month">الشهر الماضي</SelectItem>
              <SelectItem value="current-quarter">الربع الحالي</SelectItem>
              <SelectItem value="current-year">السنة الحالية</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الميزانية</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialData?.totalBudget || 0)}</div>
            <p className="text-xs text-muted-foreground">
              للفترة المحددة
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialData?.totalActual || 0)}</div>
            <p className="text-xs text-muted-foreground">
              من إجمالي الميزانية
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الاستغلال</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialData?.utilizationRate?.toFixed(1) || '0'}%</div>
            <p className="text-xs text-muted-foreground">
              من إجمالي الميزانية
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الانحراف</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(financialData?.variance || 0)}`}>
              {financialData?.variance?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              عن الميزانية المخططة
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="performance">تحليل الأداء</TabsTrigger>
          <TabsTrigger value="variance">تحليل الانحراف</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Center Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع مراكز التكلفة</CardTitle>
                <CardDescription>توزيع المصروفات حسب مراكز التكلفة</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={financialData?.costCenterDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {financialData?.costCenterDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle>الميزانية مقابل الفعلي</CardTitle>
                <CardDescription>مقارنة المصروفات المخططة والفعلية</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialData?.budgetVsActual || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="budget" fill="hsl(var(--primary))" name="الميزانية" />
                    <Bar dataKey="actual" fill="hsl(var(--secondary))" name="الفعلي" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أداء مراكز التكلفة</CardTitle>
              <CardDescription>تحليل مفصل لأداء كل مركز تكلفة</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>مركز التكلفة</TableHead>
                    <TableHead>الميزانية ({currency})</TableHead>
                    <TableHead>الفعلي ({currency})</TableHead>
                    <TableHead>المتبقي ({currency})</TableHead>
                    <TableHead>الاستغلال</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialData?.performanceData?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.budget)}</TableCell>
                      <TableCell>{formatCurrency(item.actual)}</TableCell>
                      <TableCell>
                        <span className={item.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.remaining)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={item.utilization} className="w-16" />
                          <span className="text-sm">{item.utilization.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getUtilizationColor(item.utilization)}>
                          {item.utilization > 100 ? 'تجاوز' : item.utilization > 90 ? 'تحذير' : 'جيد'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="variance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليل الانحراف</CardTitle>
              <CardDescription>تحليل مفصل للانحرافات عن الميزانية المخططة</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={financialData?.varianceAnalysis || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="variance" fill="hsl(var(--primary))" name="الانحراف %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الاتجاهات الشهرية</CardTitle>
              <CardDescription>تتبع اتجاهات المصروفات على مدار الأشهر</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={financialData?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" name="المبلغ" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}