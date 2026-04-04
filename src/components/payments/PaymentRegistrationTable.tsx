import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Receipt,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentRecord {
  id: string;
  customer_name: string;
  phone: string;
  invoice_number: string;
  contract_number: string;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  created_at: string;
  notes?: string;
}

interface PaymentRegistrationTableProps {
  searchTerm: string;
  showFilters: boolean;
}

const paymentMethods = {
  cash: { label: 'نقدي', icon: '💵', color: 'bg-green-100 text-green-800' },
  bank_transfer: { label: 'تحويل بنكي', icon: '🏦', color: 'bg-blue-100 text-blue-800' },
  check: { label: 'شيك', icon: '📄', color: 'bg-purple-100 text-purple-800' },
  credit_card: { label: 'بطاقة ائتمان', icon: '💳', color: 'bg-orange-100 text-orange-800' },
  other: { label: 'أخرى', icon: '💰', color: 'bg-slate-100 text-slate-800' }
};

const statusConfig = {
  completed: { label: 'مكتمل', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  pending: { label: 'قيد الانتظار', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'فشل', icon: XCircle, color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مسترد', icon: AlertCircle, color: 'bg-blue-100 text-blue-800' }
};

export function PaymentRegistrationTable({ searchTerm, showFilters }: PaymentRegistrationTableProps) {
  const { companyId } = useUnifiedCompanyAccess();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchPayments();
  }, [companyId, debouncedSearchTerm, statusFilter, methodFilter, dateFilter, refreshKey]);

  const fetchPayments = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          status,
          created_at,
          notes,
          customer_id,
          invoice_id,
          contract_id,
          customers!inner(first_name, last_name, phone),
          invoices!inner(invoice_number),
          contracts!inner(contract_number)
        `)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter);
      }

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData: PaymentRecord[] = (data || []).map(payment => ({
        id: payment.id,
        customer_name: `${payment.customers.first_name} ${payment.customers.last_name}`,
        phone: payment.customers.phone,
        invoice_number: payment.invoices.invoice_number,
        contract_number: payment.contracts.contract_number,
        payment_amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        status: payment.status as any,
        created_at: payment.created_at,
        notes: payment.notes
      }));

      setPayments(formattedData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('فشل في تحميل بيانات الدفعات');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    if (!debouncedSearchTerm) return payments;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return payments.filter(payment =>
      payment.customer_name.toLowerCase().includes(searchLower) ||
      payment.phone.includes(searchLower) ||
      payment.invoice_number.toLowerCase().includes(searchLower) ||
      payment.contract_number.toLowerCase().includes(searchLower) ||
      payment.notes?.toLowerCase().includes(searchLower)
    );
  }, [payments, debouncedSearchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    // Export functionality
    toast.success('جاري تصدير البيانات...');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const config = paymentMethods[method as keyof typeof paymentMethods];
    if (!config) return null;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <span>{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-4 bg-slate-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-muted/30 rounded-lg border"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الحالة</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">طريقة الدفع</label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطرق</SelectItem>
                  {Object.entries(paymentMethods).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الفترة</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الوقت</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">آخر 7 أيام</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>عرض {filteredPayments.length} من {payments.length} دفعة</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 ml-1" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الفاتورة</TableHead>
                  <TableHead className="text-right">العقد</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="h-8 w-8" />
                        <span>لا توجد دفعات مطابقة للبحث</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment, index) => (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{payment.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{payment.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{payment.invoice_number}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{payment.contract_number}</span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.payment_amount)}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(payment.payment_method)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(payment.payment_date).toLocaleDateString('en-US')}</div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(payment.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => { setSelectedPayment(payment); setIsDetailOpen(true); }}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info('يمكنك تعديل الدفعة من صفحة الفاتورة المرتبطة')}>
                              <Edit className="h-4 w-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedPayment(payment); setIsDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الدفعة</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">العميل:</span><p className="font-medium">{selectedPayment.customer_name}</p></div>
                <div><span className="text-slate-500">المبلغ:</span><p className="font-bold text-teal-600">{selectedPayment.payment_amount?.toLocaleString()} ر.ق</p></div>
                <div><span className="text-slate-500">رقم الفاتورة:</span><p className="font-medium">{selectedPayment.invoice_number}</p></div>
                <div><span className="text-slate-500">التاريخ:</span><p className="font-medium">{selectedPayment.payment_date}</p></div>
                <div><span className="text-slate-500">طريقة الدفع:</span><p className="font-medium">{selectedPayment.payment_method}</p></div>
                <div><span className="text-slate-500">الحالة:</span><p className="font-medium">{selectedPayment.status}</p></div>
              </div>
              {selectedPayment.notes && <div><span className="text-slate-500">ملاحظات:</span><p>{selectedPayment.notes}</p></div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsDetailOpen(false)}>إغلاق</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!selectedPayment) return;
              try {
                const { error } = await supabase.from('payments').delete().eq('id', selectedPayment.id);
                if (error) throw error;
                toast.success('تم حذف الدفعة');
                setIsDeleteOpen(false);
                setRefreshKey(k => k + 1);
              } catch { toast.error('فشل الحذف'); }
            }} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}