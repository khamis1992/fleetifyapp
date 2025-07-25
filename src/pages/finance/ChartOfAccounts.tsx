import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useChartOfAccounts, useCreateAccount } from "@/hooks/useFinance"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Plus, Search, Calculator } from "lucide-react"
import { toast } from "sonner"

const ChartOfAccounts = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  
  const { data: accounts, isLoading, error } = useChartOfAccounts()
  const createAccount = useCreateAccount()
  
  const [newAccount, setNewAccount] = useState({
    account_code: "",
    account_name: "",
    account_name_ar: "",
    account_type: "" as "asset" | "liability" | "equity" | "revenue" | "expense",
    balance_type: "" as "debit" | "credit",
    account_subtype: "",
    description: "",
    current_balance: 0
  })

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAccount.account_code || !newAccount.account_name || !newAccount.account_type || !newAccount.balance_type) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      await createAccount.mutateAsync(newAccount)
      setIsCreateDialogOpen(false)
      setNewAccount({
        account_code: "",
        account_name: "",
        account_name_ar: "",
        account_type: "" as "asset" | "liability" | "equity" | "revenue" | "expense",
        balance_type: "" as "debit" | "credit",
        account_subtype: "",
        description: "",
        current_balance: 0
      })
    } catch (error) {
      console.error("Error creating account:", error)
    }
  }

  const filteredAccounts = accounts?.filter(account => {
    const matchesSearch = account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (account.account_name_ar && account.account_name_ar.includes(searchTerm))
    
    const matchesType = filterType === "all" || account.account_type === filterType
    
    return matchesSearch && matchesType
  })

  const getAccountTypeLabel = (type: string) => {
    const types = {
      asset: "أصول",
      liability: "خصوم",
      equity: "حقوق الملكية",
      revenue: "إيرادات",
      expense: "مصروفات"
    }
    return types[type as keyof typeof types] || type
  }

  const getAccountTypeColor = (type: string) => {
    const colors = {
      asset: "bg-blue-100 text-blue-800",
      liability: "bg-red-100 text-red-800",
      equity: "bg-green-100 text-green-800",
      revenue: "bg-purple-100 text-purple-800",
      expense: "bg-orange-100 text-orange-800"
    }
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">خطأ في تحميل دليل الحسابات: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-primary p-8 rounded-2xl text-primary-foreground shadow-elevated">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Calculator className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">دليل الحسابات</h1>
            <p className="text-primary-foreground/80">
              إدارة جميع حسابات النظام المحاسبي
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="البحث في الحسابات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="نوع الحساب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="asset">أصول</SelectItem>
              <SelectItem value="liability">خصوم</SelectItem>
              <SelectItem value="equity">حقوق الملكية</SelectItem>
              <SelectItem value="revenue">إيرادات</SelectItem>
              <SelectItem value="expense">مصروفات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إضافة حساب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>إنشاء حساب جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الحساب الجديد في النظام المحاسبي
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_code">رمز الحساب *</Label>
                  <Input
                    id="account_code"
                    value={newAccount.account_code}
                    onChange={(e) => setNewAccount({...newAccount, account_code: e.target.value})}
                    placeholder="1001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">نوع الحساب *</Label>
                  <Select 
                    value={newAccount.account_type} 
                    onValueChange={(value: "asset" | "liability" | "equity" | "revenue" | "expense") => 
                      setNewAccount({...newAccount, account_type: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">أصول</SelectItem>
                      <SelectItem value="liability">خصوم</SelectItem>
                      <SelectItem value="equity">حقوق الملكية</SelectItem>
                      <SelectItem value="revenue">إيرادات</SelectItem>
                      <SelectItem value="expense">مصروفات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name">اسم الحساب *</Label>
                <Input
                  id="account_name"
                  value={newAccount.account_name}
                  onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                  placeholder="النقدية"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name_ar">اسم الحساب بالعربية</Label>
                <Input
                  id="account_name_ar"
                  value={newAccount.account_name_ar}
                  onChange={(e) => setNewAccount({...newAccount, account_name_ar: e.target.value})}
                  placeholder="النقدية"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance_type">طبيعة الرصيد *</Label>
                <Select 
                  value={newAccount.balance_type} 
                  onValueChange={(value: "debit" | "credit") => 
                    setNewAccount({...newAccount, balance_type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطبيعة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">مدين</SelectItem>
                    <SelectItem value="credit">دائن</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Input
                  id="description"
                  value={newAccount.description}
                  onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                  placeholder="وصف الحساب..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createAccount.isPending}>
                  {createAccount.isPending ? <LoadingSpinner size="sm" /> : "إنشاء الحساب"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>دليل الحسابات</CardTitle>
          <CardDescription>
            جميع الحسابات المسجلة في النظام المحاسبي
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رمز الحساب</TableHead>
                    <TableHead>اسم الحساب</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>طبيعة الرصيد</TableHead>
                    <TableHead>الرصيد الحالي</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد حسابات متاحة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts?.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.account_code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{account.account_name}</div>
                            {account.account_name_ar && (
                              <div className="text-sm text-muted-foreground">{account.account_name_ar}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAccountTypeColor(account.account_type)}>
                            {getAccountTypeLabel(account.account_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.balance_type === 'debit' ? 'default' : 'secondary'}>
                            {account.balance_type === 'debit' ? 'مدين' : 'دائن'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {account.current_balance?.toFixed(3)} د.ك
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ChartOfAccounts