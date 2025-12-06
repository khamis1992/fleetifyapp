/**
 * مركز الفواتير والمدفوعات الموحد
 * تصميم بسيط ومتوافق مع الداشبورد
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { usePayments } from "@/hooks/useFinance";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { InvoiceForm } from "@/components/finance/InvoiceForm";
import { InvoicePreviewDialog } from "@/components/finance/InvoicePreviewDialog";
import { InvoiceEditDialog } from "@/components/finance/InvoiceEditDialog";
import { PayInvoiceDialog } from "@/components/finance/PayInvoiceDialog";
import { UnifiedPaymentForm } from "@/components/finance/UnifiedPaymentForm";
import { PaymentPreviewDialog } from "@/components/finance/PaymentPreviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Receipt, 
  CreditCard,
  Plus, 
  Search,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  trend = 'neutral',
  change,
}) => (
  <motion.div 
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
        <Icon className="w-5 h-5" />
      </div>
      {change && (
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
          trend === 'up' ? 'bg-green-100 text-green-600' : 
          trend === 'down' ? 'bg-red-100 text-red-600' : 
          'bg-neutral-100 text-neutral-600'
        )}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
           trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          {change}
        </span>
      )}
    </div>
    <p className="text-xs text-neutral-500 font-medium mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

// ===== Main Component =====
const BillingCenter = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  
  // State
  const [activeTab, setActiveTab] = useState("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Invoice states
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  
  // Payment states
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false);

  // Data fetching
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ pageSize: 100 });
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments();

  // Extract data
  const invoices = useMemo(() => {
    if (Array.isArray(invoicesData)) return invoicesData;
    if (invoicesData?.data) return invoicesData.data;
    return [];
  }, [invoicesData]);

  const payments = useMemo(() => {
    if (Array.isArray(paymentsData)) return paymentsData;
    return [];
  }, [paymentsData]);

  // Statistics
  const stats = useMemo(() => {
    const totalInvoices = invoices.reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);
    const paidInvoices = invoices.filter(inv => inv?.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv?.payment_status === 'pending' || inv?.payment_status === 'partial')
      .reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);
    const totalPayments = payments.reduce((sum, pmt) => sum + (Number(pmt?.amount) || 0), 0);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalPayments,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
    };
  }, [invoices, payments]);

  // Filtered data
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv?.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv?.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || inv?.payment_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  const filteredPayments = useMemo(() => {
    return payments.filter(pmt => {
      const matchesSearch = pmt?.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pmt?.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || pmt?.payment_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, filterStatus]);

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('invoice_id', invoiceId)
        .limit(1);

      if (payments && payments.length > 0) {
        throw new Error('لا يمكن حذف الفاتورة لأنها مرتبطة بدفعات');
      }

      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الفاتورة بنجاح');
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل حذف الفاتورة');
    }
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      paid: { label: 'مدفوعة', className: 'bg-green-100 text-green-700' },
      pending: { label: 'معلقة', className: 'bg-yellow-100 text-yellow-700' },
      partial: { label: 'جزئية', className: 'bg-blue-100 text-blue-700' },
      overdue: { label: 'متأخرة', className: 'bg-red-100 text-red-700' },
      cancelled: { label: 'ملغاة', className: 'bg-gray-100 text-gray-700' },
      completed: { label: 'مكتملة', className: 'bg-green-100 text-green-700' },
      confirmed: { label: 'مؤكدة', className: 'bg-green-100 text-green-700' },
    };
    const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd MMM yyyy', { locale: ar });
    } catch {
      return date;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">مركز الفواتير والمدفوعات</h1>
              <p className="text-neutral-500">إدارة الفواتير والمدفوعات في مكان واحد</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="bg-gradient-to-r from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              فاتورة جديدة
            </Button>
            <Button 
              onClick={() => setIsCreatePaymentOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              تسجيل دفعة
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إجمالي الفواتير"
          value={formatCurrency(stats.totalInvoices)}
          subtitle={`${stats.invoiceCount} فاتورة`}
          icon={Receipt}
          iconBg="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="المدفوع"
          value={formatCurrency(stats.paidInvoices)}
          icon={CheckCircle}
          iconBg="bg-green-100 text-green-600"
          trend="up"
          change="+12%"
        />
        <StatCard
          title="المستحق"
          value={formatCurrency(stats.pendingInvoices)}
          icon={Clock}
          iconBg="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="المدفوعات"
          value={formatCurrency(stats.totalPayments)}
          subtitle={`${stats.paymentCount} دفعة`}
          icon={CreditCard}
          iconBg="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger 
              value="invoices" 
              className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg px-6"
            >
              <Receipt className="w-4 h-4 ml-2" />
              الفواتير
            </TabsTrigger>
            <TabsTrigger 
              value="payments"
              className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg px-6"
            >
              <CreditCard className="w-4 h-4 ml-2" />
              المدفوعات
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 w-64 bg-white rounded-xl border-0 shadow-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-white rounded-xl border-0 shadow-sm">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="partial">جزئية</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <motion.div 
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-20">
                <Receipt className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
                <p className="text-neutral-500">لا توجد فواتير</p>
                <Button 
                  onClick={() => setIsCreateInvoiceOpen(true)}
                  className="mt-4 bg-coral-500 hover:bg-coral-600"
                >
                  إنشاء فاتورة جديدة
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.slice(0, 20).map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-neutral-50">
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {invoice.customers?.company_name || 
                         `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingInvoice(invoice)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {invoice.payment_status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => { setSelectedInvoice(invoice); setShowPayDialog(true); }}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => { setInvoiceToDelete(invoice); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <motion.div 
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-20">
                <CreditCard className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
                <p className="text-neutral-500">لا توجد مدفوعات</p>
                <Button 
                  onClick={() => setIsCreatePaymentOpen(true)}
                  className="mt-4 bg-coral-500 hover:bg-coral-600"
                >
                  تسجيل دفعة جديدة
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="text-right">رقم الدفعة</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">طريقة الدفع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.slice(0, 20).map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-neutral-50">
                      <TableCell className="font-medium">{payment.payment_number || '-'}</TableCell>
                      <TableCell>
                        {payment.customers?.company_name || 
                         `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`}
                      </TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method === 'cash' ? 'نقدي' :
                           payment.payment_method === 'card' ? 'بطاقة' :
                           payment.payment_method === 'bank_transfer' ? 'تحويل' :
                           payment.payment_method === 'cheque' ? 'شيك' : payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedPayment(payment); setIsPaymentPreviewOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Create Invoice Dialog */}
      <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          </DialogHeader>
          <InvoiceForm 
            onSuccess={() => {
              setIsCreateInvoiceOpen(false);
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
            }}
            onCancel={() => setIsCreateInvoiceOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      <Dialog open={isCreatePaymentOpen} onOpenChange={setIsCreatePaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
          </DialogHeader>
          <UnifiedPaymentForm
            onSuccess={() => {
              setIsCreatePaymentOpen(false);
              queryClient.invalidateQueries({ queryKey: ['payments'] });
            }}
            onCancel={() => setIsCreatePaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Invoice Preview */}
      {selectedInvoice && isPreviewOpen && (
        <InvoicePreviewDialog
          invoice={selectedInvoice}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
        />
      )}

      {/* Invoice Edit */}
      {editingInvoice && (
        <InvoiceEditDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSuccess={() => {
            setEditingInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}

      {/* Pay Invoice */}
      {selectedInvoice && showPayDialog && (
        <PayInvoiceDialog
          invoice={selectedInvoice}
          open={showPayDialog}
          onOpenChange={setShowPayDialog}
          onSuccess={() => {
            setShowPayDialog(false);
            setSelectedInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
          }}
        />
      )}

      {/* Payment Preview */}
      {selectedPayment && isPaymentPreviewOpen && (
        <PaymentPreviewDialog
          payment={selectedPayment}
          open={isPaymentPreviewOpen}
          onOpenChange={setIsPaymentPreviewOpen}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفاتورة رقم {invoiceToDelete?.invoice_number}؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteInvoiceMutation.mutate(invoiceToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingCenter;

