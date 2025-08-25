import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Download,
  Printer,
  Filter,
  Search,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Eye,
  RefreshCw,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Transaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'debit' | 'credit';
}

interface AccountStatementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  balanceType?: 'debit' | 'credit';
}

export const ProfessionalAccountStatement: React.FC<AccountStatementProps> = ({
  open,
  onOpenChange,
  accountId,
  accountCode,
  accountName,
  accountType,
  balanceType = 'debit'
}) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'رصيد افتتاحي',
      reference: 'OP-001',
      debit: 50000,
      credit: 0,
      balance: 50000,
      type: 'debit'
    },
    {
      id: '2',
      date: '2024-01-16',
      description: 'إيداع نقدي من العميل أحمد محمد',
      reference: 'REC-001',
      debit: 15000,
      credit: 0,
      balance: 65000,
      type: 'debit'
    },
    {
      id: '3',
      date: '2024-01-17',
      description: 'دفع فاتورة كهرباء',
      reference: 'PAY-001',
      debit: 0,
      credit: 2500,
      balance: 62500,
      type: 'credit'
    },
    {
      id: '4',
      date: '2024-01-18',
      description: 'تحويل بنكي من حساب التوفير',
      reference: 'TRF-001',
      debit: 25000,
      credit: 0,
      balance: 87500,
      type: 'debit'
    },
    {
      id: '5',
      date: '2024-01-19',
      description: 'دفع راتب موظف',
      reference: 'SAL-001',
      debit: 0,
      credit: 8000,
      balance: 79500,
      type: 'credit'
    }
  ];

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || transaction.type === filterType;
      
      const matchesDate = (!dateFrom || transaction.date >= dateFrom) &&
                         (!dateTo || transaction.date <= dateTo);
      
      return matchesSearch && matchesType && matchesDate;
    });
  }, [mockTransactions, searchTerm, filterType, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totalDebits = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);
    const finalBalance = filteredTransactions.length > 0 ? 
      filteredTransactions[filteredTransactions.length - 1].balance : 0;
    
    return {
      totalDebits,
      totalCredits,
      finalBalance,
      transactionCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // تصدير إلى CSV
    const headers = ['التاريخ', 'البيان', 'المرجع', 'مدين', 'دائن', 'الرصيد'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        t.date,
        `"${t.description}"`,
        t.reference,
        t.debit.toFixed(3),
        t.credit.toFixed(3),
        t.balance.toFixed(3)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_حساب_${accountCode}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ar });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden" dir="rtl">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6" />
            كشف حساب احترافي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Header Section - للطباعة */}
          <div className="hidden print:block text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold mb-2">شركة المثال للتجارة</h1>
            <p className="text-gray-600">كشف حساب تفصيلي</p>
            <p className="text-sm text-gray-500">تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">رقم الحساب</Label>
                  <p className="font-mono text-lg font-bold">{accountCode}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">اسم الحساب</Label>
                  <p className="text-lg font-semibold">{accountName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">نوع الحساب</Label>
                  <Badge variant="outline" className="mt-1">
                    {accountType === 'assets' ? 'الأصول' : 
                     accountType === 'liabilities' ? 'الالتزامات' :
                     accountType === 'equity' ? 'حقوق الملكية' :
                     accountType === 'revenue' ? 'الإيرادات' : 'المصروفات'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">طبيعة الرصيد</Label>
                  <Badge variant={balanceType === 'debit' ? 'default' : 'secondary'} className="mt-1">
                    {balanceType === 'debit' ? 'مدين' : 'دائن'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters - مخفي في الطباعة */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                عوامل التصفية والبحث
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>نوع الحركة</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحركات</SelectItem>
                      <SelectItem value="debit">مدين فقط</SelectItem>
                      <SelectItem value="credit">دائن فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>البحث</Label>
                  <div className="relative">
                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="بحث في البيان أو المرجع..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي المدين</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalDebits)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي الدائن</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalCredits)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">الرصيد النهائي</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.finalBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">عدد الحركات</p>
                    <p className="text-lg font-bold text-purple-600">{summary.transactionCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions - مخفي في الطباعة */}
          <div className="flex justify-between items-center print:hidden">
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                تصدير CSV
              </Button>
              <Button onClick={() => setIsLoading(true)} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
            </div>
            <Badge variant="secondary">
              {filteredTransactions.length} من {mockTransactions.length} حركة
            </Badge>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                حركات الحساب
              </CardTitle>
              <CardDescription>
                تفاصيل جميع الحركات المالية للحساب
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3 font-semibold">التاريخ</th>
                      <th className="text-right p-3 font-semibold">البيان</th>
                      <th className="text-center p-3 font-semibold">المرجع</th>
                      <th className="text-center p-3 font-semibold">مدين</th>
                      <th className="text-center p-3 font-semibold">دائن</th>
                      <th className="text-center p-3 font-semibold">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction, index) => (
                      <tr 
                        key={transaction.id} 
                        className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-25' : ''}`}
                      >
                        <td className="p-3 font-mono text-sm">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-xs">
                          <Badge variant="outline" className="text-xs">
                            {transaction.reference}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {transaction.debit > 0 ? (
                            <span className="text-green-600 font-semibold">
                              {formatCurrency(transaction.debit)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {transaction.credit > 0 ? (
                            <span className="text-red-600 font-semibold">
                              {formatCurrency(transaction.credit)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={transaction.balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                            {formatCurrency(Math.abs(transaction.balance))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-gray-100 font-bold">
                      <td colSpan={3} className="p-3 text-right">الإجمالي:</td>
                      <td className="p-3 text-center font-mono text-green-600">
                        {formatCurrency(summary.totalDebits)}
                      </td>
                      <td className="p-3 text-center font-mono text-red-600">
                        {formatCurrency(summary.totalCredits)}
                      </td>
                      <td className="p-3 text-center font-mono text-blue-600">
                        {formatCurrency(summary.finalBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Footer - للطباعة فقط */}
          <div className="hidden print:block text-center text-sm text-gray-500 border-t pt-4">
            <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الحسابات</p>
            <p>جميع المبالغ بالدينار الكويتي (د.ك)</p>
          </div>
        </div>

        {/* Close Button - مخفي في الطباعة */}
        <div className="flex justify-end mt-4 print:hidden">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
