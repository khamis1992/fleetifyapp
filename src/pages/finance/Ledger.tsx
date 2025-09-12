import React, { useState } from 'react';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useEnhancedJournalEntries } from '@/hooks/useGeneralLedger';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  CalendarDays,
  Receipt,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Ledger = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  // Fetch journal entries from database
  const { 
    data: journalEntries, 
    isLoading: isLoadingEntries, 
    error: entriesError,
    refetch: refetchEntries
  } = useEnhancedJournalEntries({
    searchTerm: searchTerm || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    accountId: selectedAccount !== 'all' ? selectedAccount : undefined
  });

  // Fetch chart of accounts for filtering
  const { 
    data: accounts, 
    isLoading: isLoadingAccounts 
  } = useChartOfAccounts();

  const getStatusText = (status: string) => {
    switch (status) {
      case 'posted': return 'مؤكد';
      case 'draft': return 'مسودة';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'posted': return 'default';
      case 'draft': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <FinanceErrorBoundary
      error={entriesError}
      isLoading={isLoadingEntries}
      onRetry={refetchEntries}
      title="خطأ في دفتر الأستاذ"
      context="صفحة دفتر الأستاذ"
    >
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
              <p className="text-muted-foreground">إنشاء وإدارة القيود المحاسبية والحركات المالية</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="lg" className="bg-gradient-primary hover:bg-gradient-primary/90">
              <Link to="/finance/new-entry" className="flex items-center">
                <Plus className="h-5 w-5 ml-2" />
                إنشاء قيد جديد
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/finance/chart-of-accounts">
                <FileText className="h-4 w-4 ml-2" />
                دليل الحسابات
              </Link>
            </Button>
          </div>
        </div>


        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              <Filter className="h-5 w-5" />
              البحث والفلتر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث في القيود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
              
              <Input
                type="date"
                placeholder="من تاريخ"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-right"
              />
              
              <Input
                type="date"
                placeholder="إلى تاريخ"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-right"
              />

              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 ml-2" />
                تطبيق الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries */}
        <div className="space-y-4">
          {isLoadingEntries ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">جاري تحميل القيود المحاسبية...</p>
              </CardContent>
            </Card>
          ) : !journalEntries || journalEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">لا توجد قيود محاسبية</h3>
                <p className="text-muted-foreground mb-4">لم يتم العثور على قيود محاسبية تطابق معايير البحث</p>
                <Button asChild>
                  <Link to="/finance/new-entry">
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء قيد جديد
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            journalEntries.map((entry) => (
              <Card key={entry.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Receipt className="h-5 w-5" />
                          سند قيد رقم {entry.entry_number || entry.id}
                        </h3>
                        <Badge variant={getStatusVariant(entry.status)}>
                          {getStatusText(entry.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          التاريخ: {new Date(entry.entry_date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                        </span>
                        {entry.reference_type && (
                          <span>المرجع: {entry.reference_type}</span>
                        )}
                      </div>
                    </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
                <CardContent className="p-0">
                  <div className="bg-blue-50 px-6 py-3 border-b">
                    <p className="text-sm text-right font-medium text-blue-800">
                      البيان: {entry.description}
                    </p>
                  </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-right font-semibold">رمز الحساب</TableHead>
                      <TableHead className="text-right font-semibold">اسم الحساب</TableHead>
                      <TableHead className="text-center font-semibold">البيان</TableHead>
                      <TableHead className="text-center font-semibold text-green-700">مدين</TableHead>
                      <TableHead className="text-center font-semibold text-red-700">دائن</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                      {entry.journal_entry_lines?.map((line, index) => (
                        <TableRow key={line.id || index} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-center font-medium">
                            {line.chart_of_accounts?.account_code}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <div className="font-medium">{line.chart_of_accounts?.account_name}</div>
                              {line.chart_of_accounts?.account_name_ar && (
                                <div className="text-xs text-muted-foreground">{line.chart_of_accounts?.account_name_ar}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {line.line_description || entry.description}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {line.debit_amount > 0 ? (
                              <span className="text-green-700 font-semibold">
                                {formatCurrency(line.debit_amount, { minimumFractionDigits: 3 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {line.credit_amount > 0 ? (
                              <span className="text-red-700 font-semibold">
                                {formatCurrency(line.credit_amount, { minimumFractionDigits: 3 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
                
                {/* Totals */}
                <div className="bg-muted/20 border-t">
                  <Table>
                    <TableBody>
                      <TableRow className="border-0">
                        <TableCell className="font-bold text-right" colSpan={3}>
                          المجموع
                        </TableCell>
                          <TableCell className="text-center font-mono font-bold text-green-700">
                            {formatCurrency(entry.total_debit || 0, { minimumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-red-700">
                            {formatCurrency(entry.total_credit || 0, { minimumFractionDigits: 3 })}
                          </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </FinanceErrorBoundary>
  );
};

export default Ledger;