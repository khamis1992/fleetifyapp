
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Calculator, Plus, TrendingUp, TrendingDown, Target, Search } from "lucide-react"
import { useBudgets, useCreateBudget, Budget } from "@/hooks/useFinance"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const Budgets = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data: budgets, isLoading, error } = useBudgets()
  const createBudget = useCreateBudget()

  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    budget_name: '',
    budget_year: new Date().getFullYear(),
    total_revenue: 0,
    total_expenses: 0,
    notes: ''
  })

  const handleCreateBudget = async () => {
    if (!newBudget.budget_name || !newBudget.budget_year) return

    await createBudget.mutateAsync({
      budget_name: newBudget.budget_name!,
      budget_year: newBudget.budget_year!,
      total_revenue: newBudget.total_revenue,
      total_expenses: newBudget.total_expenses,
      notes: newBudget.notes
    })

    setNewBudget({
      budget_name: '',
      budget_year: new Date().getFullYear(),
      total_revenue: 0,
      total_expenses: 0,
      notes: ''
    })
    setIsCreateDialogOpen(false)
  }

  const filteredBudgets = budgets?.filter(budget => {
    const matchesSearch = budget.budget_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         budget.budget_year.toString().includes(searchTerm)
    const matchesStatus = filterStatus === "all" || budget.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalBudgetsCount = budgets?.length || 0
  const totalBudgetedRevenue = budgets?.reduce((sum, budget) => sum + (budget.total_revenue || 0), 0) || 0
  const totalBudgetedExpenses = budgets?.reduce((sum, budget) => sum + (budget.total_expenses || 0), 0) || 0
  const totalNetIncome = totalBudgetedRevenue - totalBudgetedExpenses

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary'
      case 'approved': return 'default'
      case 'active': return 'default'
      case 'closed': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'مسودة'
      case 'approved': return 'معتمدة'
      case 'active': return 'نشطة'
      case 'closed': return 'مغلقة'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        حدث خطأ في تحميل البيانات
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">النظام المالي</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>الموازنات</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الموازنات</h1>
          <p className="text-muted-foreground">إدارة الموازنات والتخطيط المالي</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              موازنة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء موازنة جديدة</DialogTitle>
              <DialogDescription>أدخل تفاصيل الموازنة الجديدة</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budgetName">اسم الموازنة *</Label>
                <Input
                  id="budgetName"
                  value={newBudget.budget_name}
                  onChange={(e) => setNewBudget({ ...newBudget, budget_name: e.target.value })}
                  placeholder="موازنة 2024"
                />
              </div>
              <div>
                <Label htmlFor="budgetYear">السنة المالية *</Label>
                <Input
                  id="budgetYear"
                  type="number"
                  value={newBudget.budget_year}
                  onChange={(e) => setNewBudget({ ...newBudget, budget_year: Number(e.target.value) })}
                  placeholder="2024"
                />
              </div>
              <div>
                <Label htmlFor="totalRevenue">إجمالي الإيرادات المتوقعة</Label>
                <Input
                  id="totalRevenue"
                  type="number"
                  value={newBudget.total_revenue}
                  onChange={(e) => setNewBudget({ ...newBudget, total_revenue: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div>
                <Label htmlFor="totalExpenses">إجمالي المصروفات المتوقعة</Label>
                <Input
                  id="totalExpenses"
                  type="number"
                  value={newBudget.total_expenses}
                  onChange={(e) => setNewBudget({ ...newBudget, total_expenses: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={newBudget.notes}
                  onChange={(e) => setNewBudget({ ...newBudget, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                />
              </div>
              <Button onClick={handleCreateBudget} className="w-full" disabled={createBudget.isPending}>
                {createBudget.isPending ? "جاري الإنشاء..." : "إنشاء الموازنة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الموازنات</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBudgetsCount}</div>
            <p className="text-xs text-muted-foreground">موازنة مسجلة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات المتوقعة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalBudgetedRevenue.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروفات المتوقعة</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalBudgetedExpenses.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الدخل المتوقع</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNetIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalNetIncome.toFixed(3)} د.ك
            </div>
            <p className="text-xs text-muted-foreground">الربح المتوقع</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الموازنات</CardTitle>
              <CardDescription>جميع الموازنات المسجلة في النظام</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الموازنات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="approved">معتمدة</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الموازنة</TableHead>
                <TableHead>السنة المالية</TableHead>
                <TableHead>الإيرادات المتوقعة</TableHead>
                <TableHead>المصروفات المتوقعة</TableHead>
                <TableHead>صافي الدخل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets?.map((budget) => {
                const netIncome = (budget.total_revenue || 0) - (budget.total_expenses || 0)
                return (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">{budget.budget_name}</TableCell>
                    <TableCell>{budget.budget_year}</TableCell>
                    <TableCell className="text-green-600">
                      {(budget.total_revenue || 0).toFixed(3)} د.ك
                    </TableCell>
                    <TableCell className="text-red-600">
                      {(budget.total_expenses || 0).toFixed(3)} د.ك
                    </TableCell>
                    <TableCell className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {netIncome.toFixed(3)} د.ك
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(budget.status)}>
                        {getStatusLabel(budget.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(budget.created_at).toLocaleDateString('ar-KW')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">عرض</Button>
                      <Button variant="ghost" size="sm">تعديل</Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {filteredBudgets?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد موازنات
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Budgets
