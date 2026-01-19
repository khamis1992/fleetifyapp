import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Search, Download, Filter, CreditCard, DollarSign, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface PaymentTransaction {
  id: string;
  company_id: string;
  company_name: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  payment_method: 'credit_card' | 'bank_transfer' | 'paypal';
  transaction_date: string;
  description: string;
  reference_number: string;
  subscription_plan: string;
}

export const PaymentTransactionsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30days');
  const { formatCurrency } = useCurrencyFormatter();

  // Mock data - in real app this would come from usePaymentTransactions hook
  const transactions: PaymentTransaction[] = [
    {
      id: '1',
      company_id: '1',
      company_name: 'شركة الخليج للتجارة',
      amount: 50,
      currency: 'KWD',
      status: 'completed',
      payment_method: 'credit_card',
      transaction_date: '2024-01-15T10:30:00Z',
      description: 'اشتراك شهري - خطة مميز',
      reference_number: 'TXN-2024-001',
      subscription_plan: 'premium'
    },
    {
      id: '2',
      company_id: '2',
      company_name: 'مؤسسة التقنية المتقدمة',
      amount: 100,
      currency: 'KWD',
      status: 'completed',
      payment_method: 'bank_transfer',
      transaction_date: '2024-01-14T14:20:00Z',
      description: 'اشتراك شهري - خطة مؤسسي',
      reference_number: 'TXN-2024-002',
      subscription_plan: 'enterprise'
    },
    {
      id: '3',
      company_id: '3',
      company_name: 'شركة النور للخدمات',
      amount: 25,
      currency: 'KWD',
      status: 'pending',
      payment_method: 'credit_card',
      transaction_date: '2024-01-13T09:15:00Z',
      description: 'اشتراك شهري - خطة أساسي',
      reference_number: 'TXN-2024-003',
      subscription_plan: 'basic'
    },
    {
      id: '4',
      company_id: '4',
      company_name: 'مجموعة الأعمال الرقمية',
      amount: 500,
      currency: 'KWD',
      status: 'completed',
      payment_method: 'bank_transfer',
      transaction_date: '2024-01-12T16:45:00Z',
      description: 'اشتراك سنوي - خطة مميز',
      reference_number: 'TXN-2024-004',
      subscription_plan: 'premium'
    },
    {
      id: '5',
      company_id: '5',
      company_name: 'شركة الابتكار التجاري',
      amount: 50,
      currency: 'KWD',
      status: 'failed',
      payment_method: 'credit_card',
      transaction_date: '2024-01-11T11:30:00Z',
      description: 'اشتراك شهري - خطة مميز',
      reference_number: 'TXN-2024-005',
      subscription_plan: 'premium'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      'completed': { variant: 'default' as const, text: 'مكتمل', class: 'bg-green-100 text-green-800' },
      'pending': { variant: 'secondary' as const, text: 'معلق', class: 'bg-yellow-100 text-yellow-800' },
      'failed': { variant: 'destructive' as const, text: 'فاشل', class: 'bg-red-100 text-red-800' },
      'refunded': { variant: 'outline' as const, text: 'مسترد', class: 'bg-slate-100 text-slate-800' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.completed;
    return (
      <Badge variant={config.variant} className={config.class}>
        {config.text}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />;
      case 'paypal':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    const methods = {
      'credit_card': 'بطاقة ائتمان',
      'bank_transfer': 'تحويل بنكي',
      'paypal': 'باي بال'
    };
    return methods[method as keyof typeof methods] || method;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || transaction.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalAmount = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المعاملات</p>
                <p className="text-2xl font-bold">{filteredTransactions.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المعاملات المكتملة</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredTransactions.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المعاملات المعلقة</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredTransactions.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>سجل المعاملات المالية</CardTitle>
              <CardDescription>
                تتبع جميع المدفوعات والمعاملات المالية
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                فلترة متقدمة
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المعاملات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="حالة المعاملة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="failed">فاشل</SelectItem>
                <SelectItem value="refunded">مسترد</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="paypal">باي بال</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">آخر 7 أيام</SelectItem>
                <SelectItem value="30days">آخر 30 يوم</SelectItem>
                <SelectItem value="90days">آخر 90 يوم</SelectItem>
                <SelectItem value="year">السنة الحالية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المرجع</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>نوع الخطة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {transaction.reference_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.company_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(transaction.amount, { currency: transaction.currency })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(transaction.payment_method)}
                        <span className="text-sm">
                          {getPaymentMethodText(transaction.payment_method)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.subscription_plan === 'basic' ? 'أساسي' :
                         transaction.subscription_plan === 'premium' ? 'مميز' : 'مؤسسي'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(transaction.transaction_date), { 
                          addSuffix: true, 
                          locale: ar 
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {transaction.description}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لم يتم العثور على معاملات</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};