import React, { useState, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Printer, 
  Save, 
  ArrowRight,
  Trash2, 
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  FileText,
  Package,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { usePurchaseOrders, useDeletePurchaseOrder, useUpdatePurchaseOrder, useCreatePurchaseOrder, PurchaseOrder, CreatePurchaseOrderData } from '@/hooks/usePurchaseOrders';
import { useVendors, Vendor } from '@/hooks/useVendors';
import { PurchaseOrderForm } from '@/components/finance/PurchaseOrderForm';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';

// --- Status Badge Component ---
const StatusBadge = ({ status }: { status: PurchaseOrder['status'] }) => {
  const styles: Record<string, string> = {
    'draft': "bg-slate-100 text-slate-700 border-slate-200",
    'pending_approval': "bg-amber-50 text-amber-700 border-amber-200",
    'approved': "bg-blue-50 text-blue-700 border-blue-200",
    'sent_to_vendor': "bg-indigo-50 text-indigo-700 border-indigo-200",
    'received': "bg-emerald-50 text-emerald-700 border-emerald-200",
    'partially_received': "bg-orange-50 text-orange-700 border-orange-200",
    'cancelled': "bg-red-50 text-red-700 border-red-200",
  };
  
  const icons: Record<string, React.ComponentType<{ size?: number }>> = {
    'draft': FileText,
    'pending_approval': Clock,
    'approved': CheckCircle2,
    'sent_to_vendor': Send,
    'received': CheckCircle2,
    'partially_received': Clock,
    'cancelled': AlertCircle
  };

  const labels: Record<string, string> = {
    'draft': 'مسودة',
    'pending_approval': 'في انتظار الموافقة',
    'approved': 'موافق عليه',
    'sent_to_vendor': 'مرسل للمورد',
    'received': 'مستلم',
    'partially_received': 'مستلم جزئياً',
    'cancelled': 'ملغي'
  };

  const Icon = icons[status] || FileText;

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 w-fit",
      styles[status] || styles['draft']
    )}>
      <Icon size={12} />
      {labels[status] || status}
    </span>
  );
};

// --- Stats Card Component ---
const StatsCard = ({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  colorClass 
}: { 
  title: string; 
  value: string | number; 
  subtext?: string; 
  icon: React.ComponentType<{ size?: number; className?: string }>; 
  colorClass: string;
}) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
    <div className={cn("p-3 rounded-lg", colorClass)}>
      <Icon size={20} className="text-white" />
    </div>
  </div>
);

// --- Items Catalog (for autocomplete) ---
interface CatalogItem {
  sku: string;
  description: string;
  price: number;
}

const ITEMS_CATALOG: CatalogItem[] = [
  { sku: 'AUTO-001', description: 'زيت محرك سنتيتيك 5W-30', price: 150.00 },
  { sku: 'AUTO-002', description: 'فلتر زيت أصلي', price: 45.00 },
  { sku: 'AUTO-003', description: 'فلتر هواء', price: 35.00 },
  { sku: 'TIRE-001', description: 'إطار ميشلان 205/55R16', price: 450.00 },
  { sku: 'PART-001', description: 'بطارية سيارة 12V', price: 350.00 },
];

// --- Form Item Interface ---
interface FormItem {
  id: number;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// --- Form Data Interface ---
interface FormData {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  status: PurchaseOrder['status'];
  date: string;
  expectedDate: string;
  items: FormItem[];
  notes: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  grandTotal: number;
  history: Array<{ date: string; action: string; user: string }>;
  // Database fields
  dbId?: string;
  terms_and_conditions?: string;
  delivery_address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

const INITIAL_FORM_STATE: FormData = {
  id: '',
  poNumber: '',
  vendorId: '',
  vendorName: '',
  vendorAddress: '',
  status: 'draft',
  date: new Date().toISOString().split('T')[0],
  expectedDate: '',
  items: [
    { id: 1, sku: '', description: '', quantity: 1, unitPrice: 0, total: 0 }
  ],
  notes: '',
  subtotal: 0,
  taxRate: 15,
  taxAmount: 0,
  shippingCost: 0,
  grandTotal: 0,
  history: [
    { date: new Date().toISOString(), action: 'تم الإنشاء', user: 'النظام' }
  ]
};

export default function PurchaseOrders() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('الكل');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Hooks
  const { data: purchaseOrders, isLoading, error } = usePurchaseOrders();
  const { data: vendors } = useVendors();
  const deletePurchaseOrder = useDeletePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();
  const createPurchaseOrder = useCreatePurchaseOrder();
  const { formatCurrency } = useCurrencyFormatter();

  // Generate a new PO number
  const generatePONumber = useCallback(() => {
    const num = (purchaseOrders?.length || 0) + 1;
    return `PO-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`;
  }, [purchaseOrders?.length]);

  // Handle creating a new order
  const handleCreateNew = () => {
    setFormData({
      ...INITIAL_FORM_STATE,
      poNumber: generatePONumber(),
      id: Date.now().toString(),
      history: [{ date: new Date().toISOString(), action: 'تم إنشاء المسودة', user: 'أنت' }]
    });
    setView('form');
  };

  // Handle editing an order
  const handleEdit = (order: PurchaseOrder) => {
    setFormData({
      ...INITIAL_FORM_STATE,
      id: order.id,
      dbId: order.id,
      poNumber: order.order_number,
      vendorId: order.vendor_id,
      vendorName: order.vendor?.vendor_name || '',
      vendorAddress: order.delivery_address || '',
      status: order.status,
      date: order.order_date,
      expectedDate: order.expected_delivery_date || '',
      notes: order.notes || '',
      subtotal: order.subtotal,
      taxAmount: order.tax_amount,
      grandTotal: order.total_amount,
      terms_and_conditions: order.terms_and_conditions,
      delivery_address: order.delivery_address,
      contact_person: order.contact_person,
      phone: order.phone,
      email: order.email,
      items: [{ id: 1, sku: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      history: [
        { date: order.created_at, action: 'تم الإنشاء', user: 'النظام' }
      ]
    });
    setView('form');
  };

  // Handle saving (via existing form component for new, or update for existing)
  const handleSave = async () => {
    if (formData.dbId) {
      // Update existing order
      try {
        await updatePurchaseOrder.mutateAsync({
          id: formData.dbId,
          data: {
            notes: formData.notes,
            expected_delivery_date: formData.expectedDate || undefined,
            delivery_address: formData.delivery_address,
            contact_person: formData.contact_person,
            phone: formData.phone,
            email: formData.email,
            terms_and_conditions: formData.terms_and_conditions,
          }
        });
        setView('list');
      } catch (error) {
        console.error('Error updating order:', error);
      }
    } else {
      // For new orders, use the dialog form
      setShowCreateDialog(true);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: PurchaseOrder['status']) => {
    if (!formData.dbId) {
      toast.error('يجب حفظ أمر الشراء أولاً');
      return;
    }

    const actionMap: Record<string, string> = {
      'sent_to_vendor': 'تم إرسال الطلب للمورد',
      'received': 'تم استلام البضائع',
      'cancelled': 'تم إلغاء الطلب',
      'approved': 'تمت الموافقة على الطلب'
    };

    try {
      await updatePurchaseOrder.mutateAsync({
        id: formData.dbId,
        data: { status: newStatus }
      });
      
      setFormData(prev => ({
        ...prev,
        status: newStatus,
        history: [
          { date: new Date().toISOString(), action: actionMap[newStatus] || 'تم تحديث الحالة', user: 'أنت' },
          ...prev.history
        ]
      }));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deletePurchaseOrder.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // --- List View Component ---
  const ListView = () => {
    // Map status to tab labels
    const statusToTab: Record<string, string> = {
      'draft': 'مسودة',
      'pending_approval': 'في انتظار الموافقة',
      'approved': 'موافق عليه',
      'sent_to_vendor': 'مرسل',
      'received': 'مستلم',
      'partially_received': 'مستلم جزئياً',
      'cancelled': 'ملغي'
    };

    const tabToStatuses: Record<string, PurchaseOrder['status'][]> = {
      'الكل': ['draft', 'pending_approval', 'approved', 'sent_to_vendor', 'received', 'partially_received', 'cancelled'],
      'مسودة': ['draft'],
      'مرسل': ['sent_to_vendor', 'approved'],
      'مستلم': ['received', 'partially_received']
    };

    const filteredOrders = purchaseOrders?.filter(o => {
      const matchesSearch = 
        o.vendor?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'الكل' || tabToStatuses[activeTab]?.includes(o.status);
      return matchesSearch && matchesTab;
    }) || [];

    const stats = {
      totalSpend: purchaseOrders?.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total_amount, 0) || 0,
      openOrders: purchaseOrders?.filter(o => ['sent_to_vendor', 'approved'].includes(o.status)).length || 0,
      drafts: purchaseOrders?.filter(o => o.status === 'draft').length || 0,
    };

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري تحميل أوامر الشراء...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-red-600">
          خطأ في تحميل أوامر الشراء
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 space-y-6" dir="rtl">
        <Breadcrumbs />
        
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">أوامر الشراء</h1>
            <p className="text-slate-500 mt-1">إدارة المشتريات ومتابعة الشحنات والتحكم في الإنفاق.</p>
          </div>
          <Button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus size={20} />
            طلب جديد
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            title="إجمالي الإنفاق (سنوي)" 
            value={formatCurrency(stats.totalSpend)} 
            subtext="+١٢٪ عن الشهر الماضي"
            icon={LayoutDashboard}
            colorClass="bg-primary"
          />
          <StatsCard 
            title="توصيلات معلقة" 
            value={stats.openOrders} 
            subtext="طلبات قيد الانتظار"
            icon={Clock}
            colorClass="bg-amber-500"
          />
          <StatsCard 
            title="المسودات" 
            value={stats.drafts} 
            subtext="قيد العمل"
            icon={FileText}
            colorClass="bg-slate-500"
          />
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-200/60 rounded-lg w-full sm:w-auto">
              {['الكل', 'مسودة', 'مرسل', 'مستلم'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                    activeTab === tab 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                type="text" 
                placeholder="بحث في الطلبات..." 
                className="pr-10 pl-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">المورد</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">الإجمالي</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-primary/5 transition-colors cursor-pointer group" 
                    onClick={() => handleEdit(order)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <FileText size={16} />
                        </div>
                        <span className="font-medium text-slate-700">{order.order_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{order.vendor?.vendor_name}</div>
                      <div className="text-xs text-slate-400">مورد</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {format(new Date(order.order_date), 'PPP', { locale: ar })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف أمر الشراء رقم {order.order_number}؟ 
                              هذا الإجراء لا يمكن التراجع عنه.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(order.id)}>
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 bg-slate-50/30">
                      <div className="flex flex-col items-center gap-3">
                        <Search size={32} className="opacity-20" />
                        <p>لا توجد طلبات تطابق بحثك.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- Form View Component ---
  const FormView = () => {
    // Form Logic
    const calculateTotals = (items: FormItem[], tax: number, shipping: number) => {
      const sub = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      const taxAmt = sub * (tax / 100);
      const total = sub + taxAmt + (shipping || 0);
      return { subtotal: sub, taxAmount: taxAmt, grandTotal: total };
    };

    const handleVendorChange = (vendorId: string) => {
      const vendor = vendors?.find(v => v.id === vendorId);
      if (vendor) {
        setFormData(prev => ({
          ...prev,
          vendorId: vendor.id,
          vendorName: vendor.vendor_name,
          vendorAddress: vendor.address || ''
        }));
      }
    };

    const handleItemChange = (index: number, field: keyof FormItem, value: string | number) => {
      const newItems = [...formData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-populate from SKU catalog
      if (field === 'sku') {
        const catalogItem = ITEMS_CATALOG.find(i => i.sku === value);
        if (catalogItem) {
          newItems[index].description = catalogItem.description;
          newItems[index].unitPrice = catalogItem.price;
          newItems[index].total = newItems[index].quantity * catalogItem.price;
        }
      }

      // Calculate line total
      if (['quantity', 'unitPrice'].includes(field as string) || field === 'sku') {
        const qty = field === 'quantity' ? Number(value) : newItems[index].quantity;
        const price = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice;
        newItems[index].total = qty * price;
      }

      const { subtotal, taxAmount, grandTotal } = calculateTotals(newItems, formData.taxRate, formData.shippingCost);
      setFormData(prev => ({ ...prev, items: newItems, subtotal, taxAmount, grandTotal }));
    };

    const addItem = () => {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { id: Date.now(), sku: '', description: '', quantity: 1, unitPrice: 0, total: 0 }]
      }));
    };

    const removeItem = (index: number) => {
      if (formData.items.length <= 1) {
        toast.error('يجب أن يحتوي أمر الشراء على عنصر واحد على الأقل');
        return;
      }
      const newItems = formData.items.filter((_, i) => i !== index);
      const { subtotal, taxAmount, grandTotal } = calculateTotals(newItems, formData.taxRate, formData.shippingCost);
      setFormData(prev => ({ ...prev, items: newItems, subtotal, taxAmount, grandTotal }));
    };

    return (
      <div className="bg-slate-50 min-h-screen pb-20 print:bg-white print:pb-0" dir="rtl">
        
        {/* Top Toolbar (Hidden on Print) */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <ArrowRight size={20} />
              </button>
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {formData.poNumber || 'أمر شراء جديد'}
                  <StatusBadge status={formData.status} />
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
                <Printer size={18} />
              </button>
              
              {/* Workflow Actions */}
              {formData.dbId && formData.status === 'draft' && (
                <button 
                  onClick={() => handleStatusChange('sent_to_vendor')}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold border border-blue-200"
                >
                  <Send size={16} /> إرسال للمورد
                </button>
              )}
              {formData.dbId && formData.status === 'sent_to_vendor' && (
                <button 
                  onClick={() => handleStatusChange('received')}
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-semibold border border-emerald-200"
                >
                  <CheckCircle2 size={16} /> استلام البضائع
                </button>
              )}
              
              <Button 
                onClick={handleSave}
                className="flex items-center gap-2"
                disabled={updatePurchaseOrder.isPending}
              >
                {updatePurchaseOrder.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                حفظ
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-4 gap-6 print:block print:mt-0 print:px-0">
          
          {/* Main Document Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[800px] p-8 md:p-12 relative print:shadow-none print:border-none print:p-0">
              
              {/* Branding Header */}
              <div className="flex justify-between items-start mb-12">
                <div>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Package size={32} />
                    <span className="font-bold text-2xl text-slate-900">نظام المشتريات</span>
                  </div>
                  <div className="text-slate-500 text-sm mt-4">
                    الإدارة العامة<br/>
                    شارع المؤسسة<br/>
                    الدوحة، قطر
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-light text-slate-900 mb-2 uppercase tracking-wide">أمر شراء</h1>
                  <p className="text-slate-400 text-sm">نسخة أصلية</p>
                </div>
              </div>

              {/* Vendor & Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                {/* Vendor Section */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 print:bg-transparent print:border-0 print:p-0">
                  <label className="block text-xs uppercase font-bold text-slate-400 mb-3">بيانات المورد</label>
                  <Select 
                    value={formData.vendorId}
                    onValueChange={handleVendorChange}
                  >
                    <SelectTrigger className="w-full mb-2 print:hidden">
                      <SelectValue placeholder="اختر المورد..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Print only view for vendor */}
                  <div className="hidden print:block text-lg font-bold text-slate-800 mb-1">{formData.vendorName}</div>
                  
                  {formData.vendorAddress && (
                    <div className="text-sm text-slate-500 leading-relaxed">
                      {formData.vendorAddress}<br/>
                      {vendors?.find(v => v.id === formData.vendorId)?.email}
                    </div>
                  )}
                </div>

                {/* PO Details */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 text-sm font-medium">رقم الطلب</span>
                    <span className="font-mono font-bold text-slate-800">{formData.poNumber}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 text-sm font-medium">تاريخ الإصدار</span>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="text-left bg-transparent outline-none font-medium text-slate-800 print:hidden"
                    />
                    <span className="hidden print:block font-medium text-slate-800">
                      {formData.date && format(new Date(formData.date), 'PPP', { locale: ar })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 text-sm font-medium">تاريخ التوصيل المتوقع</span>
                    <input 
                      type="date" 
                      value={formData.expectedDate}
                      onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                      className="text-left bg-transparent outline-none font-medium text-slate-800 print:hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Items Table */}
              <div className="mb-8">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-800">
                      <th className="py-3 text-xs font-bold uppercase w-16">#</th>
                      <th className="py-3 text-xs font-bold uppercase w-32">كود الصنف</th>
                      <th className="py-3 text-xs font-bold uppercase">الوصف</th>
                      <th className="py-3 text-xs font-bold uppercase w-20">الكمية</th>
                      <th className="py-3 text-xs font-bold uppercase w-32">السعر</th>
                      <th className="py-3 text-xs font-bold uppercase w-32">الإجمالي</th>
                      <th className="w-8 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, index) => (
                      <tr key={item.id} className="group">
                        <td className="py-4 text-sm text-slate-500">{index + 1}</td>
                        <td className="py-4">
                          <input 
                            type="text" 
                            list="sku-options"
                            placeholder="SKU..."
                            className="w-full bg-transparent border-none p-0 text-sm font-mono text-slate-600 focus:ring-0 placeholder-slate-300 uppercase text-right"
                            value={item.sku}
                            onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                          />
                          <datalist id="sku-options">
                            {ITEMS_CATALOG.map(cat => (
                              <option key={cat.sku} value={cat.sku}>{cat.description}</option>
                            ))}
                          </datalist>
                        </td>
                        <td className="py-4">
                          <input 
                            type="text" 
                            className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 focus:ring-0 placeholder-slate-300"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="وصف المنتج"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            className="w-full bg-transparent border-none p-0 text-sm text-slate-600 focus:ring-0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            className="w-full bg-transparent border-none p-0 text-sm text-slate-600 focus:ring-0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-4 font-bold text-slate-800">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-4 print:hidden">
                          <button onClick={() => removeItem(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button 
                  onClick={addItem}
                  className="mt-4 flex items-center gap-2 text-primary text-sm font-semibold hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors print:hidden"
                >
                  <Plus size={16} /> إضافة صنف جديد
                </button>
              </div>

              {/* Financial Summary */}
              <div className="flex flex-col md:flex-row justify-end border-t-2 border-slate-100 pt-8">
                <div className="w-full md:w-80 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="font-medium">المجموع الفرعي</span>
                    <span>{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="font-medium">الضريبة ({formData.taxRate}%)</span>
                    <span>{formatCurrency(formData.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="font-medium">الشحن</span>
                    <span>{formatCurrency(formData.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-lg font-bold text-slate-900">الإجمالي</span>
                    <span className="text-2xl font-bold text-slate-900">{formatCurrency(formData.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="mt-16 pt-8 border-t border-slate-100 text-slate-400 text-xs text-center">
                <p>١. الدفع مستحق خلال ٣٠ يوماً من تاريخ الفاتورة.</p>
                <p>٢. يرجى ذكر رقم أمر الشراء في جميع المراسلات.</p>
                <p className="mt-2">التوقيع المعتمد: _______________________</p>
              </div>

            </div>
          </div>

          {/* Sidebar (Audit Log & Notes) - Hidden on Print */}
          <div className="lg:col-span-1 space-y-6 print:hidden">
            {/* Quick Notes Card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3">
                <FileText size={14} /> ملاحظات داخلية
              </label>
              <Textarea 
                className="w-full text-sm bg-slate-50 border-0 rounded-lg p-3 text-slate-700 h-32 focus:ring-2 focus:ring-primary resize-none"
                placeholder="أضف ملاحظات داخلية حول هذا الطلب..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            {/* Audit Log Card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-4">
                <History size={14} /> سجل النشاط
              </label>
              <div className="space-y-4">
                {formData.history.map((event, i) => (
                  <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
                    {/* Timeline connector */}
                    {i !== formData.history.length - 1 && (
                      <div className="absolute right-[9px] top-6 bottom-0 w-px bg-slate-100"></div>
                    )}
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{event.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {format(new Date(event.date), 'PPP', { locale: ar })}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(event.date), 'HH:mm', { locale: ar })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">بواسطة {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments Placeholder */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center border-dashed min-h-[100px] cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="text-center">
                <div className="mx-auto w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Plus size={16} />
                </div>
                <p className="text-xs font-medium text-slate-500">إرفاق ملفات</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-slate-50 min-h-screen text-slate-900 font-sans" dir="rtl">
        {view === 'list' ? <ListView /> : <FormView />}
      </div>

      {/* Create Dialog using existing PurchaseOrderForm */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء أمر شراء جديد</DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm onSuccess={() => {
            setShowCreateDialog(false);
            setView('list');
          }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
