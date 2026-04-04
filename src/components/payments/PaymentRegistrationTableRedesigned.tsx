import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Receipt,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  Phone,
  FileText,
  Car,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  cash: { label: 'نقدي', icon: '💵', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  bank_transfer: { label: 'تحويل بنكي', icon: '🏦', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  check: { label: 'شيك', icon: '📄', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  credit_card: { label: 'بطاقة ائتمان', icon: '💳', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  other: { label: 'أخرى', icon: '💰', color: 'bg-slate-100 text-slate-800 border-slate-200' }
};

const statusConfig = {
  completed: {
    label: 'مكتمل',
    icon: CheckCircle,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bgColor: 'bg-emerald-500/10'
  },
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    bgColor: 'bg-amber-500/10'
  },
  failed: {
    label: 'فشل',
    icon: XCircle,
    color: 'bg-red-50 text-red-800 border-red-200',
    bgColor: 'bg-red-500/10'
  },
  refunded: {
    label: 'مسترد',
    icon: AlertCircle,
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    bgColor: 'bg-blue-500/10'
  }
};

export function PaymentRegistrationTableRedesigned({ searchTerm, showFilters }: PaymentRegistrationTableProps) {
  const { companyId } = useUnifiedCompanyAccess();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
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
          payment_status,
          created_at,
          notes,
          customer_id,
          invoice_id,
          contract_id,
          customers!inner(first_name, last_name, phone),
          invoices!payments_invoice_id_fkey(invoice_number),
          contracts!inner(contract_number)
        `)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
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
        invoice_number: payment.invoices?.invoice_number || '-',
        contract_number: payment.contracts.contract_number,
        payment_amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        status: payment.payment_status as any,
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
    toast.success('جاري تصدير البيانات...');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1.5 px-3 py-1 rounded-full`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const config = paymentMethods[method as keyof typeof paymentMethods];
    if (!config) return null;

    return (
      <Badge className={`${config.color} flex items-center gap-1.5 px-3 py-1 rounded-full`}>
        <span>{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
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
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-6 bg-gradient-to-br from-white/80 to-blue-50/50 backdrop-blur-sm rounded-2xl border border-blue-200/50 shadow-lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                الحالة
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/50">
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
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                طريقة الدفع
              </label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="bg-white/50">
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
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                الفترة
              </label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-white/50">
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">
          عرض <span className="font-bold text-neutral-900">{filteredPayments.length}</span> من{' '}
          <span className="font-bold text-neutral-900">{payments.length}</span> دفعة
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 hover:bg-emerald-50 hover:border-emerald-500/50 hover:text-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2 hover:bg-blue-50 hover:border-blue-500/50 hover:text-blue-700"
          >
            <Download className="h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-2 border-neutral-200/50 shadow-xl shadow-neutral-200/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-neutral-50 to-neutral-100/50 hover:bg-neutral-100">
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      العميل
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      الفاتورة
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      العقد
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      المبلغ
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      طريقة الدفع
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      الحالة
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      التاريخ
                    </div>
                  </TableHead>
                  <TableHead className="text-left font-bold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center space-y-4 text-neutral-500"
                      >
                        <div className="p-4 bg-neutral-100 rounded-full">
                          <Receipt className="h-12 w-12" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">لا توجد دفعات مطابقة للبحث</p>
                          <p className="text-sm">جرب تغيير معايير البحث أو الفلاتر</p>
                        </div>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment, index) => {
                    const statusBg = statusConfig[payment.status]?.bgColor || '';
                    return (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`border-b border-neutral-100 hover:bg-neutral-50/80 transition-colors ${statusBg}`}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-neutral-900">{payment.customer_name}</div>
                            <div className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {payment.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-neutral-100 px-2 py-1 rounded">
                            {payment.invoice_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-neutral-100 px-2 py-1 rounded">
                            {payment.contract_number}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-700">
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
                            <div className="font-medium">{new Date(payment.payment_date).toLocaleDateString('en-US')}</div>
                            <div className="text-neutral-500 text-xs">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-neutral-100"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuItem className="gap-2" onClick={() => { setSelectedPayment(payment); setIsDetailOpen(true); }}>
                                <Eye className="h-4 w-4 text-blue-500" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => { setSelectedPayment(payment); setIsEditOpen(true); }}>
                                <Edit className="h-4 w-4 text-amber-500" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-red-600" onClick={() => { setSelectedPayment(payment); setIsDeleteOpen(true); }}>
                                <Trash2 className="h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">العميل:</span><p className="font-medium">{selectedPayment.customer_name}</p></div>
                <div><span className="text-slate-500">الهاتف:</span><p className="font-medium" dir="ltr">{selectedPayment.phone}</p></div>
                <div><span className="text-slate-500">رقم الفاتورة:</span><p className="font-medium">{selectedPayment.invoice_number}</p></div>
                <div><span className="text-slate-500">رقم العقد:</span><p className="font-medium">{selectedPayment.contract_number}</p></div>
                <div><span className="text-slate-500">المبلغ:</span><p className="font-bold text-teal-600">{selectedPayment.payment_amount.toLocaleString()} ر.ق</p></div>
                <div><span className="text-slate-500">التاريخ:</span><p className="font-medium">{selectedPayment.payment_date}</p></div>
                <div><span className="text-slate-500">طريقة الدفع:</span><p className="font-medium">{paymentMethods[selectedPayment.payment_method as keyof typeof paymentMethods]?.label || selectedPayment.payment_method}</p></div>
                <div><span className="text-slate-500">الحالة:</span><Badge className={statusConfig[selectedPayment.status]?.color}>{statusConfig[selectedPayment.status]?.label}</Badge></div>
              </div>
              {selectedPayment.notes && (
                <div><span className="text-slate-500 text-sm">ملاحظات:</span><p className="text-sm mt-1">{selectedPayment.notes}</p></div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الدفعة</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <EditPaymentForm 
              payment={selectedPayment} 
              onSave={() => { setIsEditOpen(false); setRefreshKey(k => k + 1); toast.success('تم تعديل الدفعة بنجاح'); }}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف دفعة "{selectedPayment?.customer_name}" بمبلغ {selectedPayment?.payment_amount.toLocaleString()} ر.ق؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Inline edit form component
function EditPaymentForm({ payment, onSave, onCancel }: { payment: PaymentRecord; onSave: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(String(payment.payment_amount));
  const [notes, setNotes] = useState(payment.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('payments').update({ 
        amount: parseFloat(amount), 
        notes 
      }).eq('id', payment.id);
      if (error) throw error;
      onSave();
    } catch (err: any) {
      toast.error('فشل التعديل: ' + (err.message || 'خطأ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>المبلغ (ر.ق)</Label>
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>ملاحظات</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" placeholder="ملاحظات إضافية..." />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button onClick={handleSave} disabled={loading} className="bg-teal-500 hover:bg-teal-600">
          {loading ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </DialogFooter>
    </div>
  );
}
