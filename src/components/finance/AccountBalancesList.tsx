import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, TrendingUp, TrendingDown, Eye } from "lucide-react"
import { useAccountBalances } from "@/hooks/useLedgerEnhancements"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface AccountBalancesListProps {
  onAccountSelect?: (accountId: string, accountName: string) => void
}

export function AccountBalancesList({ onAccountSelect }: AccountBalancesListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [accountTypeFilter, setAccountTypeFilter] = useState("all")

  const { data: balances, isLoading, error } = useAccountBalances({
    account_type: accountTypeFilter === "all" ? undefined : accountTypeFilter
  })

  const filteredBalances = balances?.filter(balance =>
    balance.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (balance.account_name_ar && balance.account_name_ar.includes(searchTerm))
  )

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      'assets': 'الأصول',
      'liabilities': 'الخصوم',
      'equity': 'حقوق الملكية',
      'revenue': 'الإيرادات',
      'expenses': 'المصروفات'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getBalanceColor = (balance: number, type: string) => {
    if (balance === 0) return "text-muted-foreground"
    
    // For assets and expenses, positive balances are normal (green)
    // For liabilities, equity, and revenue, positive balances are normal (green)
    return balance > 0 ? "text-green-600" : "text-red-600"
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
        حدث خطأ في تحميل أرصدة الحسابات
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>أرصدة الحسابات</CardTitle>
            <CardDescription>أرصدة جميع الحسابات مع تفاصيل المعاملات</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الحسابات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية بنوع الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="assets">الأصول</SelectItem>
                <SelectItem value="liabilities">الخصوم</SelectItem>
                <SelectItem value="equity">حقوق الملكية</SelectItem>
                <SelectItem value="revenue">الإيرادات</SelectItem>
                <SelectItem value="expenses">المصروفات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رمز الحساب</TableHead>
              <TableHead>اسم الحساب</TableHead>
              <TableHead>نوع الحساب</TableHead>
              <TableHead>إجمالي المدين</TableHead>
              <TableHead>إجمالي الدائن</TableHead>
              <TableHead>الرصيد الصافي</TableHead>
              <TableHead>عدد المعاملات</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBalances?.map((balance) => (
              <TableRow key={balance.account_id}>
                <TableCell className="font-medium">{balance.account_code}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{balance.account_name}</div>
                    {balance.account_name_ar && (
                      <div className="text-sm text-muted-foreground">
                        {balance.account_name_ar}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getAccountTypeLabel(balance.account_type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-green-600 font-medium">
                  {balance.debit_total.toFixed(3)} د.ك
                </TableCell>
                <TableCell className="text-red-600 font-medium">
                  {balance.credit_total.toFixed(3)} د.ك
                </TableCell>
                <TableCell className={`font-bold ${getBalanceColor(balance.net_balance, balance.account_type)}`}>
                  {balance.net_balance.toFixed(3)} د.ك
                  {balance.net_balance > 0 ? (
                    <TrendingUp className="h-4 w-4 inline ml-1" />
                  ) : balance.net_balance < 0 ? (
                    <TrendingDown className="h-4 w-4 inline ml-1" />
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {balance.transaction_count} معاملة
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAccountSelect?.(balance.account_id, balance.account_name)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    عرض المعاملات
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredBalances?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد حسابات تطابق معايير البحث
          </div>
        )}
      </CardContent>
    </Card>
  )
}