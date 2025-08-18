
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Printer, Calendar, Filter } from "lucide-react";
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
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

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

  // Sync selectedAccountId with accountId prop
  useEffect(() => {
    setSelectedAccountId(accountId);
  }, [accountId]);

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

  const handlePrint = () => {
    if (!statementData) return;
    window.print();
  };

  const { formatCurrency } = useCurrencyFormatter();

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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col bg-gradient-card shadow-elevated" dir="rtl">
        <DialogHeader className="border-b border-border/50 pb-6">
          <DialogTitle className="arabic-heading-sm text-right flex items-center gap-3 text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            كشف حساب
          </DialogTitle>
          <DialogDescription className="arabic-body text-muted-foreground text-right">
            إنشاء كشف حساب مفصل أو موجز لفترة زمنية محددة
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 mt-6">
          {/* Filters Section */}
          <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
            <CardHeader className="pb-4">
              <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                إعدادات الكشف
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="account" className="arabic-body text-foreground font-medium">الحساب</Label>
                <Input
                  id="account"
                  value={accountCode ? `${accountCode} - ${accountName}` : ''}
                  readOnly
                  placeholder="اختر حساب"
                  className="arabic-body text-right border-input-border bg-input/80 backdrop-blur-sm h-11"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="arabic-body text-foreground font-medium">من تاريخ</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="arabic-body text-right border-input-border bg-input/80 backdrop-blur-sm h-11"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo" className="arabic-body text-foreground font-medium">إلى تاريخ</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="arabic-body text-right border-input-border bg-input/80 backdrop-blur-sm h-11"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statementType" className="arabic-body text-foreground font-medium">نوع الكشف</Label>
                <Select value={statementType} onValueChange={(value: 'detailed' | 'summary') => setStatementType(value)}>
                  <SelectTrigger className="arabic-body text-right border-input-border bg-input/80 backdrop-blur-sm h-11" dir="rtl">
                    <SelectValue placeholder="اختر نوع الكشف" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border shadow-elevated">
                    <SelectItem value="detailed" className="arabic-body text-right">مفصل</SelectItem>
                    <SelectItem value="summary" className="arabic-body text-right">موجز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center py-4">
            <Button 
              onClick={handleGenerateStatement} 
              className="arabic-body flex items-center gap-2 bg-gradient-primary hover:shadow-glow transition-smooth px-6 h-11"
            >
              <Calendar className="h-4 w-4" />
              إنشاء الكشف
            </Button>
            
            {statementData && (
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handlePrint}
                  className="arabic-body flex items-center gap-2 border-border/50 hover:bg-background/80 transition-smooth px-6 h-11"
                >
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <LoadingSpinner />
                <p className="arabic-body text-muted-foreground mt-4">جاري تحميل كشف الحساب...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="arabic-body text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <FileText className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="font-medium mb-2">خطأ في تحميل البيانات</p>
                <p className="arabic-body-sm text-destructive/80">{error.message}</p>
              </div>
            </div>
          )}

          {/* Statement Content */}
          {statementData && (
            <div className="space-y-6 print:text-black">
              {/* Statement Header */}
              <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="arabic-heading-sm text-center text-foreground">
                    كشف حساب - {statementData.statement_type === 'detailed' ? 'مفصل' : 'موجز'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-accent/10 rounded-lg border border-border/30">
                      <span className="arabic-body font-medium text-muted-foreground block mb-2">رمز الحساب</span>
                      <div className="arabic-body font-bold text-foreground">{statementData.account_code}</div>
                    </div>
                    <div className="text-center p-4 bg-accent/10 rounded-lg border border-border/30">
                      <span className="arabic-body font-medium text-muted-foreground block mb-2">اسم الحساب</span>
                      <div className="arabic-body font-bold text-foreground">{statementData.account_name_ar || statementData.account_name}</div>
                    </div>
                    <div className="text-center p-4 bg-accent/10 rounded-lg border border-border/30">
                      <span className="arabic-body font-medium text-muted-foreground block mb-2">الفترة</span>
                      <div className="arabic-body-sm font-bold text-foreground">
                        {format(new Date(statementData.period_from), 'dd/MM/yyyy', { locale: ar })} - {' '}
                        {format(new Date(statementData.period_to), 'dd/MM/yyyy', { locale: ar })}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-accent/10 rounded-lg border border-border/30">
                      <span className="arabic-body font-medium text-muted-foreground block mb-2">تاريخ الإنشاء</span>
                      <div className="arabic-body font-bold text-foreground">{format(new Date(), 'dd/MM/yyyy', { locale: ar })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                  <CardContent className="pt-6 text-center">
                    <div className="arabic-heading-sm font-bold text-primary mb-2">
                      {formatCurrency(statementData.opening_balance)}
                    </div>
                    <div className="arabic-body-sm text-muted-foreground mb-3">الرصيد الافتتاحي</div>
                    <Badge variant="outline" className="arabic-body-sm bg-primary/10 text-primary border-primary/20">
                      {formatBalance(statementData.opening_balance, statementData.balance_type).type}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                  <CardContent className="pt-6 text-center">
                    <div className="arabic-heading-sm font-bold text-success mb-2">
                      {formatCurrency(statementData.total_debits)}
                    </div>
                    <div className="arabic-body-sm text-muted-foreground mb-3">إجمالي المدين</div>
                    <Badge variant="outline" className="arabic-body-sm bg-success/10 text-success border-success/20">
                      مدين
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                  <CardContent className="pt-6 text-center">
                    <div className="arabic-heading-sm font-bold text-destructive mb-2">
                      {formatCurrency(statementData.total_credits)}
                    </div>
                    <div className="arabic-body-sm text-muted-foreground mb-3">إجمالي الدائن</div>
                    <Badge variant="outline" className="arabic-body-sm bg-destructive/10 text-destructive border-destructive/20">
                      دائن
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                  <CardContent className="pt-6 text-center">
                    <div className={`arabic-heading-sm font-bold mb-2 ${formatBalance(statementData.closing_balance, statementData.balance_type).className}`}>
                      {formatCurrency(statementData.closing_balance)}
                    </div>
                    <div className="arabic-body-sm text-muted-foreground mb-3">الرصيد الختامي</div>
                    <Badge 
                      variant="outline" 
                      className={`arabic-body-sm ${formatBalance(statementData.closing_balance, statementData.balance_type).type === 'مدين' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'}`}
                    >
                      {formatBalance(statementData.closing_balance, statementData.balance_type).type}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    تفاصيل الحركات ({statementData.transactions.length} حركة)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-border/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-accent/10">
                          <TableHead className="arabic-body font-semibold text-right">التاريخ</TableHead>
                          <TableHead className="arabic-body font-semibold text-right">رقم القيد</TableHead>
                          <TableHead className="arabic-body font-semibold text-right">البيان</TableHead>
                          {statementData.statement_type === 'detailed' && <TableHead className="arabic-body font-semibold text-right">مركز التكلفة</TableHead>}
                          <TableHead className="arabic-body font-semibold text-right">مدين</TableHead>
                          <TableHead className="arabic-body font-semibold text-right">دائن</TableHead>
                          <TableHead className="arabic-body font-semibold text-right">الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementData.transactions.length === 0 ? (
                          <TableRow>
                            <TableCell 
                              colSpan={statementData.statement_type === 'detailed' ? 7 : 6} 
                              className="text-center py-12 arabic-body text-muted-foreground"
                            >
                              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                              لا توجد حركات في هذه الفترة
                            </TableCell>
                          </TableRow>
                        ) : (
                          statementData.transactions.map((transaction) => (
                            <TableRow key={transaction.id} className="hover:bg-accent/5 transition-smooth">
                              <TableCell className="arabic-body text-right">
                                {format(new Date(transaction.entry_date), 'dd/MM/yyyy', { locale: ar })}
                              </TableCell>
                              <TableCell className="font-mono arabic-body text-right font-medium text-primary">
                                {transaction.entry_number}
                              </TableCell>
                              <TableCell className="arabic-body text-right">{transaction.description}</TableCell>
                              {statementData.statement_type === 'detailed' && (
                                <TableCell className="arabic-body text-right text-muted-foreground">
                                  {transaction.cost_center_name || '-'}
                                </TableCell>
                              )}
                              <TableCell className="text-right arabic-body font-medium">
                                {transaction.debit_amount > 0 ? (
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                    {formatCurrency(transaction.debit_amount)}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-right arabic-body font-medium">
                                {transaction.credit_amount > 0 ? (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                    {formatCurrency(transaction.credit_amount)}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell className={`text-right arabic-body font-bold ${formatBalance(transaction.running_balance, statementData.balance_type).className}`}>
                                {formatCurrency(transaction.running_balance)}
                                <Badge 
                                  variant="outline" 
                                  className={`mr-2 arabic-body-sm ${formatBalance(transaction.running_balance, statementData.balance_type).type === 'مدين' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'}`}
                                >
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
