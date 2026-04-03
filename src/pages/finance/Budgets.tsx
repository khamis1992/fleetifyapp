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
import { Progress } from "@/components/ui/progress"
import { Calculator, Plus, TrendingUp, TrendingDown, Target, Search, Eye, Edit, DollarSign } from "lucide-react"
import { useBudgets, useCreateBudget, useUpdateBudget, Budget } from "@/hooks/useFinance"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter'
import { StatCard } from "@/components/ui/StatCard"
import { FinancePageHeader } from "@/components/ui/FinancePageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { motion } from "framer-motion"

const Budgets = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<Partial<Budget>>({})

  const { data: budgets, isLoading, error } = useBudgets()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const { formatCurrency } = useCurrencyFormatter()

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

  const handleEditBudget = (budget: Budget) => {
    setEditBudget({
      id: budget.id,
      budget_name: budget.budget_name,
      budget_year: budget.budget_year,
      total_revenue: budget.total_revenue || 0,
      total_expenses: budget.total_expenses || 0,
      notes: budget.notes || '',
      status: budget.status
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateBudget = async () => {
    if (!editBudget.id || !editBudget.budget_name || !editBudget.budget_year) return

    await updateBudget.mutateAsync({
      id: editBudget.id,
      budget_name: editBudget.budget_name,
      budget_year: editBudget.budget_year,
      total_revenue: editBudget.total_revenue,
      total_expenses: editBudget.total_expenses,
      notes: editBudget.notes,
      status: editBudget.status
    })

    setIsEditDialogOpen(false)
    setEditBudget({})
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
    <div className="space-y-6 p-6" dir="rtl">
      <FinancePageHeader
        title="الموازنات"
        description="إدارة الموازنات والتخطيط المالي"
        icon={Calculator}
        breadcrumbs={[{ label: "النظام المالي" }, { label: "الموازنات" }]}
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
             <DialogTrigger asChild>
               <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg">
                 <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
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
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            title="إجمالي الموازنات"
            value={totalBudgetsCount}
            subtitle="موازنة مسجلة"
            icon={Target}
            variant="coral"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard
            title="الإيرادات المتوقعة"
            value={formatCurrency(totalBudgetedRevenue)}
            subtitle="إجمالي الإيرادات"
            icon={TrendingUp}
            variant="success"
            trend="up"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard
            title="المصروفات المتوقعة"
            value={formatCurrency(totalBudgetedExpenses)}
            subtitle="إجمالي المصروفات"
            icon={TrendingDown}
            variant="danger"
            trend="down"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <StatCard
            title="صافي الدخل المتوقع"
            value={formatCurrency(totalNetIncome)}
            subtitle="الربح المتوقع"
            icon={Calculator}
            variant={totalNetIncome >= 0 ? 'success' : 'danger'}
          />
        </motion.div>
      </div>

      {/* Budget Execution Overview */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle>نظرة عامة على تنفيذ الموازنة</CardTitle>
          <CardDescription>مقارنة المخطط بالفعلي</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">الإيرادات</span>
                <span className="text-sm text-muted-foreground">65% من المخطط</span>
              </div>
              <Progress value={65} className="h-3" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">{formatCurrency(totalBudgetedRevenue * 0.65)} فعلي</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(totalBudgetedRevenue)} مخطط</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">المصروفات</span>
                <span className="text-sm text-muted-foreground">45% من المخطط</span>
              </div>
              <Progress value={45} className="h-3" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">{formatCurrency(totalBudgetedExpenses * 0.45)} فعلي</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(totalBudgetedExpenses)} مخطط</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الموازنات</CardTitle>
              <CardDescription>جميع الموازنات المسجلة في النظام</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الموازنات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pr-9"
                />
              </div>
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
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <Table className="min-w-[600px]" aria-label="جدول الموازنات">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">اسم الموازنة</TableHead>
                      <TableHead scope="col">السنة المالية</TableHead>
                      <TableHead scope="col">الإيرادات المتوقعة</TableHead>
                      <TableHead scope="col">المصروفات المتوقعة</TableHead>
                      <TableHead scope="col">صافي الدخل</TableHead>
                      <TableHead scope="col">الحالة</TableHead>
                      <TableHead scope="col">تاريخ الإنشاء</TableHead>
                      <TableHead scope="col">الإجراءات</TableHead>
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
                        {formatCurrency(budget.total_revenue || 0)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(budget.total_expenses || 0)}
                      </TableCell>
                      <TableCell className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(netIncome)}
                      </TableCell>
                       <TableCell>
                         <Badge variant={getStatusColor(budget.status)} aria-label={`الحالة: ${getStatusLabel(budget.status)}`}>
                           {getStatusLabel(budget.status)}
                         </Badge>
                       </TableCell>
                      <TableCell>
                        {new Date(budget.created_at).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedBudget(budget)
                              setIsViewDialogOpen(true)
                            }}
                            aria-label="عرض"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditBudget(budget)}
                            aria-label="تعديل"
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {filteredBudgets?.length === 0 && (
            <div className="p-6">
              <EmptyState
                icon={DollarSign}
                title="لا توجد موازنات"
                description="لم يتم إنشاء أي موازنات بعد. ابدأ بإنشاء موازنة جديدة للتخطيط المالي"
                onAction={() => setIsCreateDialogOpen(true)}
                actionLabel="موازنة جديدة"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Budget Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الموازنة</DialogTitle>
            <DialogDescription>
              عرض تفاصيل الموازنة المالية
            </DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">اسم الموازنة</Label>
                  <p className="text-lg font-semibold">{selectedBudget.budget_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">السنة المالية</Label>
                  <p className="text-lg font-semibold">{selectedBudget.budget_year}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">الإيرادات المتوقعة</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedBudget.total_revenue || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">المصروفات المتوقعة</Label>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(selectedBudget.total_expenses || 0)}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">صافي الدخل المتوقع</Label>
                <p className={`text-xl font-bold ${((selectedBudget.total_revenue || 0) - (selectedBudget.total_expenses || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency((selectedBudget.total_revenue || 0) - (selectedBudget.total_expenses || 0))}
                </p>
              </div>

               <div>
                 <Label className="text-sm font-medium text-muted-foreground">الحالة</Label>
                 <div className="mt-1">
                   <Badge variant={getStatusColor(selectedBudget.status)} aria-label={`الحالة: ${getStatusLabel(selectedBudget.status)}`}>
                     {getStatusLabel(selectedBudget.status)}
                   </Badge>
                 </div>
               </div>

              {selectedBudget.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">الملاحظات</Label>
                  <p className="mt-1 text-sm">{selectedBudget.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</Label>
                <p className="text-sm">{new Date(selectedBudget.created_at).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الموازنة</DialogTitle>
            <DialogDescription>تعديل تفاصيل الموازنة المالية</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editBudgetName">اسم الموازنة *</Label>
              <Input
                id="editBudgetName"
                value={editBudget.budget_name || ''}
                onChange={(e) => setEditBudget({ ...editBudget, budget_name: e.target.value })}
                placeholder="موازنة 2024"
              />
            </div>
            <div>
              <Label htmlFor="editBudgetYear">السنة المالية *</Label>
              <Input
                id="editBudgetYear"
                type="number"
                value={editBudget.budget_year || ''}
                onChange={(e) => setEditBudget({ ...editBudget, budget_year: Number(e.target.value) })}
                placeholder="2024"
              />
            </div>
            <div>
              <Label htmlFor="editTotalRevenue">إجمالي الإيرادات المتوقعة</Label>
              <Input
                id="editTotalRevenue"
                type="number"
                value={editBudget.total_revenue || 0}
                onChange={(e) => setEditBudget({ ...editBudget, total_revenue: Number(e.target.value) })}
                placeholder="0.000"
              />
            </div>
            <div>
              <Label htmlFor="editTotalExpenses">إجمالي المصروفات المتوقعة</Label>
              <Input
                id="editTotalExpenses"
                type="number"
                value={editBudget.total_expenses || 0}
                onChange={(e) => setEditBudget({ ...editBudget, total_expenses: Number(e.target.value) })}
                placeholder="0.000"
              />
            </div>
            <div>
              <Label htmlFor="editStatus">الحالة</Label>
              <Select value={editBudget.status} onValueChange={(value: 'draft' | 'approved' | 'active' | 'closed') => setEditBudget({ ...editBudget, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="approved">معتمدة</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editNotes">ملاحظات</Label>
              <Textarea
                id="editNotes"
                value={editBudget.notes || ''}
                onChange={(e) => setEditBudget({ ...editBudget, notes: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>
            <Button onClick={handleUpdateBudget} className="w-full h-11" disabled={updateBudget.isPending}>
              {updateBudget.isPending ? "جاري التحديث..." : "تحديث الموازنة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Budgets