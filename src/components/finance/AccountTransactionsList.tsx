import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Calendar as CalendarIcon, X } from "lucide-react"
import { useAccountTransactions } from "@/hooks/useLedgerEnhancements"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface AccountTransactionsListProps {
  accountId: string
  accountName: string
  onClose?: () => void
}

export function AccountTransactionsList({ accountId, accountName, onClose }: AccountTransactionsListProps) {
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [statusFilter, setStatusFilter] = useState("all")

  const { data: transactions, isLoading, error } = useAccountTransactions(accountId, {
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    status: statusFilter
  })

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'posted':
        return 'default'
      case 'draft':
        return 'secondary'
      case 'reversed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted':
        return 'مرحل'
      case 'draft':
        return 'مسودة'
      case 'reversed':
        return 'ملغي'
      default:
        return status
    }
  }

  const getBalanceColor = (balance: number) => {
    return balance >= 0 ? "text-green-600" : "text-red-600"
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
        حدث خطأ في تحميل معاملات الحساب
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              معاملات الحساب: {accountName}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              جميع المعاملات المالية لهذا الحساب مع الرصيد الجاري
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  من تاريخ
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  إلى تاريخ
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  locale={ar}
                />
              </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="تصفية بالحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="posted">مرحل</SelectItem>
                <SelectItem value="reversed">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>رقم القيد</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>مدين</TableHead>
              <TableHead>دائن</TableHead>
              <TableHead>الرصيد الجاري</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.entry_date), 'dd/MM/yyyy', { locale: ar })}
                </TableCell>
                <TableCell className="font-medium">
                  {transaction.entry_number}
                </TableCell>
                <TableCell>
                  {transaction.line_description || '-'}
                </TableCell>
                <TableCell className="text-green-600 font-medium">
                  {transaction.debit_amount > 0 ? `${transaction.debit_amount.toFixed(3)} د.ك` : '-'}
                </TableCell>
                <TableCell className="text-red-600 font-medium">
                  {transaction.credit_amount > 0 ? `${transaction.credit_amount.toFixed(3)} د.ك` : '-'}
                </TableCell>
                <TableCell className={`font-bold ${getBalanceColor(transaction.running_balance)}`}>
                  {transaction.running_balance.toFixed(3)} د.ك
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(transaction.status)}>
                    {getStatusLabel(transaction.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {transactions?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد معاملات لهذا الحساب في الفترة المحددة
          </div>
        )}
      </CardContent>
    </Card>
  )
}