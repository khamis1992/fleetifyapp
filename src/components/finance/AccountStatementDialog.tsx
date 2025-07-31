import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Download, Printer, Calendar, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAccountStatement } from "@/hooks/useAccountStatement";
import { useToast } from "@/hooks/use-toast";

interface AccountStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
}

export const AccountStatementDialog = ({
  open,
  onOpenChange,
  accountId = "",
  accountCode = "",
  accountName = "",
}: AccountStatementDialogProps) => {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState(accountId);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return format(date, 'yyyy-MM-dd');
  });
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [statementType, setStatementType] = useState<'detailed' | 'summary'>('detailed');

  const {
    data: statementData,
    isLoading,
    error,
    refetch
  } = useAccountStatement({
    accountId: selectedAccountId,
    dateFrom,
    dateTo,
    statementType,
    enabled: !!selectedAccountId && !!dateFrom && !!dateTo
  });

  const handleGenerateStatement = () => {
    if (!selectedAccountId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار حساب لإنشاء الكشف",
        variant: "destructive",
      });
      return;
    }
    refetch();
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!statementData) return;
    
    // TODO: Implement export functionality
    toast({
      title: "قيد التطوير",
      description: `سيتم إضافة تصدير ${format === 'pdf' ? 'PDF' : 'Excel'} قريباً`,
    });
  };

  const handlePrint = () => {
    if (!statementData) return;
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
    }).format(Math.abs(amount));
  };

  const formatBalance = (balance: number, balanceType: string) => {
    const isDebit = (balanceType === 'debit' && balance > 0) || (balanceType === 'credit' && balance < 0);
    return {
      amount: formatCurrency(balance),
      type: isDebit ? 'مدين' : 'دائن',
      className: isDebit ? 'text-blue-600' : 'text-green-600'
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            كشف حساب
          </DialogTitle>
          <DialogDescription>
            إنشاء كشف حساب مفصل أو موجز لفترة زمنية محددة
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Filters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-4 w-4" />
                إعدادات الكشف
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="account">الحساب</Label>
                <Input
                  id="account"
                  value={accountCode ? `${accountCode} - ${accountName}` : ''}
                  readOnly
                  placeholder="اختر حساب"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom">من تاريخ</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">إلى تاريخ</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statementType">نوع الكشف</Label>
                <Select value={statementType} onValueChange={(value: 'detailed' | 'summary') => setStatementType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">مفصل</SelectItem>
                    <SelectItem value="summary">موجز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button onClick={handleGenerateStatement} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              إنشاء الكشف
            </Button>
            
            {statementData && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  طباعة
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={() => handleExport('excel')}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-destructive">
              خطأ في تحميل البيانات: {error.message}
            </div>
          )}

          {/* Statement Content */}
          {statementData && (
            <div className="space-y-6 print:text-black">
              {/* Statement Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    كشف حساب - {statementData.statement_type === 'detailed' ? 'مفصل' : 'موجز'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">رمز الحساب:</span>
                      <div>{statementData.account_code}</div>
                    </div>
                    <div>
                      <span className="font-medium">اسم الحساب:</span>
                      <div>{statementData.account_name_ar || statementData.account_name}</div>
                    </div>
                    <div>
                      <span className="font-medium">الفترة:</span>
                      <div>
                        {format(new Date(statementData.period_from), 'dd/MM/yyyy', { locale: ar })} - {' '}
                        {format(new Date(statementData.period_to), 'dd/MM/yyyy', { locale: ar })}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">تاريخ الإنشاء:</span>
                      <div>{format(new Date(), 'dd/MM/yyyy', { locale: ar })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(statementData.opening_balance)}
                      </div>
                      <div className="text-sm text-muted-foreground">الرصيد الافتتاحي</div>
                      <Badge variant="outline" className="mt-1">
                        {formatBalance(statementData.opening_balance, statementData.balance_type).type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(statementData.total_debits)}
                      </div>
                      <div className="text-sm text-muted-foreground">إجمالي المدين</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(statementData.total_credits)}
                      </div>
                      <div className="text-sm text-muted-foreground">إجمالي الدائن</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${formatBalance(statementData.closing_balance, statementData.balance_type).className}`}>
                        {formatCurrency(statementData.closing_balance)}
                      </div>
                      <div className="text-sm text-muted-foreground">الرصيد الختامي</div>
                      <Badge variant="outline" className="mt-1">
                        {formatBalance(statementData.closing_balance, statementData.balance_type).type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الحركات ({statementData.transactions.length} حركة)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>رقم القيد</TableHead>
                          <TableHead>البيان</TableHead>
                          {statementData.statement_type === 'detailed' && <TableHead>مركز التكلفة</TableHead>}
                          <TableHead className="text-right">مدين</TableHead>
                          <TableHead className="text-right">دائن</TableHead>
                          <TableHead className="text-right">الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementData.transactions.length === 0 ? (
                          <TableRow>
                            <TableCell 
                              colSpan={statementData.statement_type === 'detailed' ? 7 : 6} 
                              className="text-center py-8 text-muted-foreground"
                            >
                              لا توجد حركات في هذه الفترة
                            </TableCell>
                          </TableRow>
                        ) : (
                          statementData.transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {format(new Date(transaction.entry_date), 'dd/MM/yyyy', { locale: ar })}
                              </TableCell>
                              <TableCell className="font-mono">{transaction.entry_number}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              {statementData.statement_type === 'detailed' && (
                                <TableCell>{transaction.cost_center_name || '-'}</TableCell>
                              )}
                              <TableCell className="text-right text-blue-600">
                                {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : '-'}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${formatBalance(transaction.running_balance, statementData.balance_type).className}`}>
                                {formatCurrency(transaction.running_balance)}
                                <Badge variant="outline" className="mr-1 text-xs">
                                  {formatBalance(transaction.running_balance, statementData.balance_type).type}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};