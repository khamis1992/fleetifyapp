import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Download, FileText, AlertCircle } from "lucide-react"
import { useTrialBalance } from "@/hooks/useLedgerEnhancements"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface TrialBalanceReportProps {
  onClose?: () => void
}

export function TrialBalanceReport({ onClose }: TrialBalanceReportProps) {
  const [asOfDate, setAsOfDate] = useState<Date>(new Date())

  const { data: trialBalance, isLoading, error } = useTrialBalance(
    asOfDate ? format(asOfDate, 'yyyy-MM-dd') : undefined
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

  const getAccountTypeColor = (type: string) => {
    const colors = {
      'assets': 'bg-blue-50 text-blue-700',
      'liabilities': 'bg-red-50 text-red-700',
      'equity': 'bg-purple-50 text-purple-700',
      'revenue': 'bg-green-50 text-green-700',
      'expenses': 'bg-orange-50 text-orange-700'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-50 text-gray-700'
  }

  const groupedItems = trialBalance?.items.reduce((groups, item) => {
    if (!groups[item.account_type]) {
      groups[item.account_type] = []
    }
    groups[item.account_type].push(item)
    return groups
  }, {} as Record<string, typeof trialBalance.items>)

  const accountTypeOrder = ['assets', 'liabilities', 'equity', 'revenue', 'expenses']

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
        حدث خطأ في تحميل ميزان المراجعة
      </div>
    )
  }

  const isBalanced = Math.abs(trialBalance?.totals.difference || 0) < 0.01

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ميزان المراجعة
            </CardTitle>
            <CardDescription>
              ميزان المراجعة كما في {asOfDate ? format(asOfDate, 'dd MMMM yyyy', { locale: ar }) : 'اليوم'}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  كما في تاريخ
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={asOfDate}
                  onSelect={(date) => date && setAsOfDate(date)}
                  initialFocus
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              تصدير PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Status Alert */}
        {!isBalanced && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ميزان المراجعة غير متوازن! الفرق: {trialBalance?.totals.difference.toFixed(3)} د.ك
              يرجى مراجعة القيود المحاسبية.
            </AlertDescription>
          </Alert>
        )}

        {/* Trial Balance Table */}
        <div className="space-y-6">
          {accountTypeOrder.map(accountType => {
            const items = groupedItems?.[accountType]
            if (!items || items.length === 0) return null

            const typeDebits = items.reduce((sum, item) => sum + item.debit_balance, 0)
            const typeCredits = items.reduce((sum, item) => sum + item.credit_balance, 0)

            return (
              <div key={accountType} className="space-y-2">
                <div className={`p-3 rounded-lg ${getAccountTypeColor(accountType)}`}>
                  <h3 className="font-bold text-lg">
                    {getAccountTypeLabel(accountType)}
                  </h3>
                  <div className="text-sm flex justify-between mt-1">
                    <span>مدين: {typeDebits.toFixed(3)} د.ك</span>
                    <span>دائن: {typeCredits.toFixed(3)} د.ك</span>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">رصيد مدين</TableHead>
                      <TableHead className="text-right">رصيد دائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.account_id}>
                        <TableCell className="font-medium">
                          {item.account_code}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.account_name}</div>
                            {item.account_name_ar && (
                              <div className="text-sm text-muted-foreground">
                                {item.account_name_ar}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.debit_balance > 0 ? (
                            <span className="text-green-600">
                              {item.debit_balance.toFixed(3)} د.ك
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.credit_balance > 0 ? (
                            <span className="text-red-600">
                              {item.credit_balance.toFixed(3)} د.ك
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })}
        </div>

        {/* Totals Summary */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {trialBalance?.totals.total_debits.toFixed(3)} د.ك
                </div>
                <div className="text-sm text-muted-foreground">إجمالي المدين</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {trialBalance?.totals.total_credits.toFixed(3)} د.ك
                </div>
                <div className="text-sm text-muted-foreground">إجمالي الدائن</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {trialBalance?.totals.difference.toFixed(3)} د.ك
                </div>
                <div className="text-sm text-muted-foreground">الفرق</div>
                {isBalanced && (
                  <Badge variant="default" className="mt-1">
                    متوازن ✓
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {trialBalance?.items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد بيانات لإنشاء ميزان المراجعة
          </div>
        )}
      </CardContent>
    </Card>
  )
}