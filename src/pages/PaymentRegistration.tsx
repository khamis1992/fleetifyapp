/**
 * Payment Registration Page
 * صفحة تسجيل الدفعات للعقود النشطة
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Receipt, 
  Save, 
  FileSpreadsheet, 
  Search, 
  Users, 
  CheckCircle, 
  Clock,
  Sparkles,
  DollarSign,
  User,
  Car,
  CreditCard,
  Calendar,
  AlertCircle,
  X,
  Trash2,
  Download
} from 'lucide-react';
import { PageHelp } from "@/components/help";
import { PaymentRegistrationPageHelpContent } from "@/components/help/content";

interface ActiveContract {
  contractId: string;
  customerId: string;
  customerName: string;
  phone: string;
  vehicleNumber: string;
  color: string;
  monthlyPayment: number; // القسط الشهري المستحق
  amountPaid: number; // المبلغ المدفوع فعلياً
  remainingAmount: number; // المبلغ المتبقي
  daysOverdue: number; // عدد أيام التأخير
  lateFeeAmount: number; // مبلغ الغرامة
  notes: string;
  status: 'pending' | 'paid';
  paymentMonth: string; // Format: YYYY-MM
  paymentMethod: string; // cash, bank_transfer, check, etc.
}

interface PaymentAnalysis {
  amount: number;
  paymentMethod: string;
  operationType: string;
  lateFee: number;
}

const PaymentRegistration = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const [contracts, setContracts] = useState<ActiveContract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState({
    minAmount: '',
    maxAmount: '',
    dateFrom: '',
    dateTo: ''
  });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('paymentRegistrationColumns');
    return saved ? JSON.parse(saved) : {
      customer: true,
      monthlyAmount: true,
      amountPaid: true,
      month: true,
      paymentMethod: true,
      status: true,
      actions: true
    };
  });

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('paymentRegistrationColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Export function
  const exportToCSV = (data: ActiveContract[], filename: string) => {
    const headers = [
      'اسم العميل',
      'رقم المركبة',
      'رقم الجوال',
      'رقم العقد',
      'القسط الشهري',
      'المبلغ المدفوع',
      'المتبقي',
      'أيام التأخير',
      'الغرامة',
      'الشهر',
      'طريقة الدفع',
      'الحالة',
      'الملاحظات'
    ];

    const rows = data.map(contract => [
      contract.customerName,
      contract.vehicleNumber,
      contract.phone,
      contract.contractNumber,
      contract.monthlyPayment,
      contract.amountPaid,
      contract.remainingAmount,
      contract.daysOverdue,
      contract.lateFeeAmount,
      contract.paymentMonth,
      contract.paymentMethod === 'cash' ? 'نقدي' :
        contract.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
        contract.paymentMethod === 'check' ? 'شيك' :
        contract.paymentMethod === 'credit_card' ? 'بطاقة ائتمان' : 'أخرى',
      contract.status === 'paid' ? 'مسددة' : 'معلقة',
      contract.notes
    ]);

    const csvContent = [
      '\uFEFF' + headers.join(','), // Add BOM for Excel Arabic support
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }; // تحسين الأداء
  const [loading, setLoading] = useState(true);
  const [aiModalData, setAiModalData] = useState<{
    contract: ActiveContract;
    analysis: PaymentAnalysis;
  } | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout>(); // إصلاح memory leak

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtering state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Bulk actions state
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentData, setBulkPaymentData] = useState({
    paymentMethod: 'cash',
    paymentMonth: new Date().toISOString().slice(0, 7),
    notes: ''
  });

  // Filter presets
  const filterPresets = [
    {
      name: 'المتأخرات فقط',
      filters: { statusFilter: 'late', paymentMethodFilter: 'all', monthFilter: 'all', sortField: 'daysOverdue', sortOrder: 'desc' as const }
    },
    {
      name: 'النقدية هذا الشهر',
      filters: { statusFilter: 'all', paymentMethodFilter: 'cash', monthFilter: new Date().toISOString().slice(0, 7).split('-')[1], sortField: '', sortOrder: 'asc' as const }
    },
    {
      name: 'المعلقة - أعلى مبلغ',
      filters: { statusFilter: 'pending', paymentMethodFilter: 'all', monthFilter: 'all', sortField: 'monthlyAmount', sortOrder: 'desc' as const }
    }
  ];

  const applyPreset = (preset: typeof filterPresets[0]) => {
    setStatusFilter(preset.filters.statusFilter);
    setPaymentMethodFilter(preset.filters.paymentMethodFilter);
    setMonthFilter(preset.filters.monthFilter);
    setSortField(preset.filters.sortField);
    setSortOrder(preset.filters.sortOrder);
    setPage(1);
    toast.success(`تم تطبيق فلتر: ${preset.name}`);
  };

  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // جلب العقود النشطة
  useEffect(() => {
    fetchActiveContracts();
  }, [companyId]);

  const fetchActiveContracts = async () => {
    if (!companyId) {
      console.warn('⚠️ [PaymentRegistration] No company ID - skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          monthly_amount,
          customers (
            id,
            first_name_ar,
            last_name_ar,
            first_name,
            last_name,
            company_name_ar,
            company_name,
            customer_type,
            phone
          ),
          vehicle:vehicles (
            plate_number,
            color
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get current month in YYYY-MM format
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const formattedContracts: ActiveContract[] = (data || []).map((contract: any) => {
        const monthlyPayment = contract.monthly_amount || 0;
        
        return {
          contractId: contract.contract_number || contract.id,
          customerId: contract.customer_id,
          customerName: contract.customers?.customer_type === 'corporate'
            ? (contract.customers?.company_name_ar || contract.customers?.company_name || '')
            : `${contract.customers?.first_name_ar || contract.customers?.first_name || ''} ${contract.customers?.last_name_ar || contract.customers?.last_name || ''}`.trim(),
          phone: contract.customers?.phone || '',
          vehicleNumber: contract.vehicle?.plate_number || 'غير محدد',
          color: contract.vehicle?.color || 'white',
          monthlyPayment: monthlyPayment,
          amountPaid: monthlyPayment, // Default to full amount
          remainingAmount: 0, // Will be calculated
          daysOverdue: 0, // Will be calculated
          lateFeeAmount: 0, // Will be calculated
          notes: '',
          status: 'pending',
          paymentMonth: currentMonth, // Default to current month
          paymentMethod: 'cash' // Default payment method
        };
      });

      setContracts(formattedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('فشل في جلب العقود النشطة');
    } finally {
      setLoading(false);
    }
  };

  // Calculate late fee: 120 SAR/day, max 3000 SAR/month
  const calculateLateFee = (paymentMonth: string): { daysOverdue: number; lateFeeAmount: number } => {
    const dueDate = new Date(`${paymentMonth}-01`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (daysOverdue === 0) {
      return { daysOverdue: 0, lateFeeAmount: 0 };
    }
    
    // 120 SAR per day
    const dailyFee = 120;
    let lateFeeAmount = daysOverdue * dailyFee;
    
    // Max 3000 SAR per month
    const maxFee = 3000;
    if (lateFeeAmount > maxFee) {
      lateFeeAmount = maxFee;
    }
    
    return { daysOverdue, lateFeeAmount };
  };

  // Update payment calculations when amount or month changes
  const updatePaymentCalculations = (contractId: string, updates: Partial<ActiveContract>) => {
    setContracts(prev =>
      prev.map(c => {
        if (c.contractId !== contractId) return c;
        
        const updated = { ...c, ...updates };
        
        // Recalculate late fee if month changed
        if (updates.paymentMonth) {
          const { daysOverdue, lateFeeAmount } = calculateLateFee(updates.paymentMonth);
          updated.daysOverdue = daysOverdue;
          updated.lateFeeAmount = lateFeeAmount;
        }
        
        // Recalculate remaining amount if amount paid changed
        if (updates.amountPaid !== undefined) {
          updated.remainingAmount = updated.monthlyPayment - updated.amountPaid;
        }
        
        return updated;
      })
    );
  };

  // تحليل النص بالذكاء الاصطناعي
  const analyzePaymentNotes = (text: string): PaymentAnalysis => {
    const analysis: PaymentAnalysis = {
      amount: 0,
      paymentMethod: 'غير محدد',
      operationType: 'سداد',
      lateFee: 0
    };

    // استخراج المبلغ
    const amountPatterns = [
      /(\d+)\s*ريال/,
      /مبلغ\s*(\d+)/,
      /دفع\s*(\d+)/,
      /سداد\s*(\d+)/,
      /تحويل\s*(\d+)/,
      /(\d{3,})/
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        analysis.amount = parseFloat(match[1]);
        break;
      }
    }

    // تحديد طريقة الدفع
    if (text.includes('نقد') || text.includes('كاش')) {
      analysis.paymentMethod = 'نقدي';
    } else if (text.includes('بنك') || text.includes('تحويل')) {
      analysis.paymentMethod = 'تحويل بنكي';
    } else if (text.includes('بطاقة') || text.includes('فيزا') || text.includes('مدى')) {
      analysis.paymentMethod = 'بطاقة';
    }

    // البحث عن غرامة
    const feePattern = /غرامة\s*(\d+)/;
    const feeMatch = text.match(feePattern);
    if (feeMatch) {
      analysis.lateFee = parseFloat(feeMatch[1]);
    }

    return analysis;
  };

  // معالجة الملاحظات - محسّن لمنع memory leaks
  const handleNotesChange = (contractId: string, notes: string) => {
    setContracts(prev =>
      prev.map(c =>
        c.contractId === contractId ? { ...c, notes } : c
      )
    );

    // تحليل بعد 1.5 ثانية من التوقف عن الكتابة
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    if (notes.trim().length > 5) {
      analysisTimeoutRef.current = setTimeout(() => {
        const contract = contracts.find(c => c.contractId === contractId);
        if (!contract) return;

        const analysis = analyzePaymentNotes(notes);
        if (analysis.amount > 0) {
          setAiModalData({ contract, analysis });
        }
      }, 1500);
    }
  };
  
  // تنظيف timeout عند unmount
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  // تأكيد الدفعة
  const confirmPayment = (contractId: string) => {
    const contract = contracts.find(c => c.contractId === contractId);
    if (!contract || !contract.notes.trim()) return;

    setContracts(prev =>
      prev.map(c =>
        c.contractId === contractId ? { ...c, status: 'paid' } : c
      )
    );

    toast.success(`تم تسجيل الدفعة للعميل: ${contract.customerName}`);
  };

  // حذف الدفعة
  const deletePayment = (contractId: string) => {
    const contract = contracts.find(c => c.contractId === contractId);
    if (!contract) return;

    setContracts(prev =>
      prev.map(c =>
        c.contractId === contractId ? { ...c, notes: '', status: 'pending' } : c
      )
    );

    toast.success(`تم حذف الملاحظة للعميل: ${contract.customerName}`);
  };

  // حفظ جميع الدفعات
  const saveAllPayments = async () => {
    const paymentsToSave = contracts.filter(c => c.status === 'paid' && c.notes);

    if (paymentsToSave.length === 0) {
      toast.error('لا توجد دفعات لحفظها!');
      return;
    }

    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return;
    }

    try {
      // Prepare payment records for database
      const today = new Date().toISOString().split('T')[0]; // Actual payment date (today)
      
      const paymentRecords = paymentsToSave.map(payment => ({
        company_id: companyId,
        contract_id: payment.contractId,
        customer_id: payment.customerId,
        amount: payment.amountPaid + payment.lateFeeAmount, // Total amount including late fee
        monthly_amount: payment.monthlyPayment, // ✅ Monthly installment due
        amount_paid: payment.amountPaid, // ✅ Actual amount paid
        remaining_amount: payment.remainingAmount, // ✅ Remaining balance
        payment_date: today, // ✅ Actual date the payment was made
        payment_month: payment.paymentMonth, // ✅ Accounting month (YYYY-MM)
        due_date: `${payment.paymentMonth}-01`, // ✅ Due date (first of month)
        days_overdue: payment.daysOverdue, // ✅ Days overdue
        late_fee_amount: payment.lateFeeAmount, // ✅ Late fee charged
        payment_method: payment.paymentMethod,
        payment_type: 'rental_payment',
        notes: payment.notes,
        transaction_type: 'inflow' as const
        // payment_completion_status will be auto-calculated by trigger
      }));

      // Insert payments into database
      const { data, error } = await supabase
        .from('payments')
        .insert(paymentRecords)
        .select();

      if (error) throw error;

      toast.success(`تم حفظ ${paymentsToSave.length} دفعة بنجاح!`);
      
      // Reset saved payments
      setContracts(prev =>
        prev.map(c =>
          c.status === 'paid' ? { ...c, status: 'pending' as const, notes: '' } : c
        )
      );
    } catch (error) {
      console.error('Error saving payments:', error);
      toast.error('فشل في حفظ بعض الدفعات');
    }
  };

  // تصفية وترتيب وترقيم العقود - محسّن بـ useMemo
  const { filteredAndSortedContracts, paginatedContracts, statistics, totalPages } = useMemo(() => {
    // 1. Search filtering
    let filtered = contracts;
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(contract => (
        contract.customerName.toLowerCase().includes(searchLower) ||
        contract.vehicleNumber.toLowerCase().includes(searchLower) ||
        contract.phone.includes(searchLower)
      ));
    }

    // 2. Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // 3. Payment method filtering
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(c => c.paymentMethod === paymentMethodFilter);
    }

    // 4. Month filtering
    if (monthFilter !== 'all') {
      filtered = filtered.filter(c => c.paymentMonth === monthFilter);
    }

    // 5. Sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.customerName.localeCompare(b.customerName, 'ar');
          break;
        case 'amount':
        case 'monthlyAmount':
          comparison = a.monthlyPayment - b.monthlyPayment;
          break;
        case 'overdue':
        case 'daysOverdue':
          comparison = a.daysOverdue - b.daysOverdue;
          break;
        case 'date':
        case 'month':
          comparison = a.paymentMonth.localeCompare(b.paymentMonth);
          break;
        case 'amountPaid':
          comparison = a.amountPaid - b.amountPaid;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // 6. Calculate statistics
    const stats = {
      total: contracts.length,
      paid: contracts.filter(c => c.status === 'paid').length,
      pending: contracts.filter(c => c.status === 'pending').length,
      overdue: contracts.filter(c => c.daysOverdue > 0).length,
      totalAmount: contracts.reduce((sum, c) => sum + c.monthlyPayment, 0),
      totalPaid: contracts.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amountPaid, 0),
      totalLateFees: contracts.reduce((sum, c) => sum + c.lateFeeAmount, 0),
    };

    // 7. Pagination
    const pages = Math.ceil(sorted.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = sorted.slice(startIndex, startIndex + itemsPerPage);

    return {
      filteredAndSortedContracts: sorted,
      paginatedContracts: paginated,
      statistics: stats,
      totalPages: pages
    };
  }, [contracts, debouncedSearchTerm, statusFilter, paymentMethodFilter, monthFilter, sortField, sortOrder, currentPage, itemsPerPage]);

  // For backward compatibility
  const filteredContracts = paginatedContracts;
  const paidCount = statistics.paid;
  const pendingCount = statistics.pending;

  // Keyboard shortcuts (must be after paginatedContracts is defined)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toast.info('تم حفظ جميع التغييرات');
      }
      if (e.ctrlKey && e.key === 'a' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSelectedContracts(new Set(paginatedContracts.map(c => c.contractId)));
        toast.info(`تم تحديد ${paginatedContracts.length} عقد`);
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setSelectedContracts(new Set());
        toast.info('تم إلغاء التحديد');
      }
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (selectedContracts.size > 0) {
          const selectedData = paginatedContracts.filter(c => selectedContracts.has(c.contractId));
          exportToCSV(selectedData, 'تسجيل_الدفعات_المختارة');
          toast.success(`تم تصدير ${selectedData.length} عقد`);
        } else {
          toast.error('يرجى اختيار عقود للتصدير');
        }
      }
      if (e.key === 'Escape') {
        setShowBulkPaymentModal(false);
        setAiModalData(null);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="بحث"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [paginatedContracts, selectedContracts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Header Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-64 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted animate-pulse rounded-lg"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Skeleton */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b space-y-4">
                <div className="h-10 w-full max-w-md bg-muted animate-pulse rounded"></div>
                <div className="flex gap-3">
                  <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
                  <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
                  <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // معالجة حالة عدم وجود معرف الشركة
  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="p-4 bg-destructive/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">لا يوجد ارتباط بشركة</h2>
            <p className="text-muted-foreground mb-6">
              حسابك غير مرتبط بأي شركة. يرجى التواصل مع المسؤول لإضافتك إلى شركة.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
              العودة إلى لوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">تسجيل الدفعات</h1>
                  <p className="text-sm text-muted-foreground">
                    نظام ذكي لتسجيل ومتابعة الدفعات
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveAllPayments} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  حفظ الدفعات
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info('جاري التصدير...')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  تصدير Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono">{statistics.total}</div>
                  <div className="text-xs text-muted-foreground">عقود نشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono">{statistics.paid}</div>
                  <div className="text-xs text-muted-foreground">مسددة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono">{statistics.pending}</div>
                  <div className="text-xs text-muted-foreground">معلقة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-xl font-bold font-mono">{statistics.overdue}</div>
                  <div className="text-xs text-muted-foreground">متأخرة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-lg font-bold font-mono">{statistics.totalAmount.toLocaleString('en-US')}</div>
                  <div className="text-xs text-muted-foreground">إجمالي المبالغ</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-lg font-bold font-mono">{statistics.totalLateFees.toLocaleString('en-US')}</div>
                  <div className="text-xs text-muted-foreground">غرامات</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {/* Search and Filters */}
            <div className="p-4 border-b space-y-4">
              {/* Filter Presets */}
              <div className="flex flex-wrap gap-2">
                {filterPresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="🔍 بحث عن عميل، مركبة، أو رقم جوال..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-10"
                />
                {searchTerm && searchTerm !== debouncedSearchTerm && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Filters and Controls */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="pending">معلقة</option>
                  <option value="completed">مسددة كاملة</option>
                  <option value="partial">مسددة جزئياً</option>
                  <option value="late">متأخرة</option>
                  <option value="partial_late">متأخرة جزئياً</option>
                  <option value="overpaid">مدفوعة زائدة</option>
                </select>

                {/* Payment Method Filter */}
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">جميع طرق الدفع</option>
                  <option value="cash">نقدي</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="credit_card">بطاقة ائتمان</option>
                  <option value="check">شيك</option>
                </select>

                {/* Month Filter */}
                <select
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">جميع الأشهر</option>
                  <option value="01">يناير</option>
                  <option value="02">فبراير</option>
                  <option value="03">مارس</option>
                  <option value="04">أبريل</option>
                  <option value="05">مايو</option>
                  <option value="06">يونيو</option>
                  <option value="07">يوليو</option>
                  <option value="08">أغسطس</option>
                  <option value="09">سبتمبر</option>
                  <option value="10">أكتوبر</option>
                  <option value="11">نوفمبر</option>
                  <option value="12">ديسمبر</option>
                </select>

                {/* Results count */}
                <div className="text-sm text-muted-foreground mr-auto">
                  عرض {paginatedContracts.length} من {filteredContracts.length}
                </div>

                {/* Bulk actions */}
                {selectedContracts.size > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <Badge variant="secondary" className="font-bold">
                      {selectedContracts.size} مختار
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkPaymentModal(true)}
                    >
                      <DollarSign className="w-4 h-4 ml-1" />
                      تسجيل دفعة جماعية
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selectedData = paginatedContracts.filter(c => selectedContracts.has(c.contractId));
                        exportToCSV(selectedData, 'تسجيل_الدفعات_المختارة');
                        toast.success(`تم تصدير ${selectedData.length} عقد`);
                      }}
                    >
                      <Download className="w-4 h-4 ml-1" />
                      تصدير
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContracts(new Set())}
                    >
                      <X className="w-4 h-4 ml-1" />
                      إلغاء التحديد
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {paginatedContracts.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد عقود نشطة'}
                  </p>
                </div>
              ) : (
                paginatedContracts.map((contract) => (
                  <Card key={contract.contractId} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="bg-muted/30 p-4 flex items-center justify-between border-b">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedContracts.has(contract.contractId)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedContracts);
                              if (e.target.checked) {
                                newSelected.add(contract.contractId);
                              } else {
                                newSelected.delete(contract.contractId);
                              }
                              setSelectedContracts(newSelected);
                            }}
                            className="w-5 h-5"
                          />
                          <div>
                            <div className="font-bold text-primary">{contract.customerName}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <Car className="w-3 h-3 inline ml-1" />
                              {contract.vehicleNumber}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={contract.status === 'paid' ? 'default' : 'secondary'}
                          className={contract.status === 'paid' ? 'bg-success hover:bg-success' : ''}
                        >
                          {contract.status === 'paid' ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              مسددة
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              معلقة
                            </>
                          )}
                        </Badge>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        {/* Phone */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">رقم الجوال</span>
                          <span className="font-mono font-semibold">{contract.phone}</span>
                        </div>

                        {/* Monthly Amount */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">القسط المستحق</span>
                          <div className="text-left">
                            <div className="font-mono font-bold text-success">
                              {contract.monthlyPayment.toLocaleString('en-US')} ر.س
                            </div>
                            {contract.daysOverdue > 0 && (
                              <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3" />
                                غرامة {contract.daysOverdue} يوم: {contract.lateFeeAmount.toLocaleString('en-US')} ر.س
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Amount Paid */}
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">المبلغ المدفوع</label>
                          <Input
                            type="number"
                            value={contract.amountPaid}
                            onChange={(e) => updatePaymentCalculations(contract.contractId, {
                              amountPaid: parseFloat(e.target.value) || 0
                            })}
                            className="text-sm font-mono"
                            min="0"
                            step="0.01"
                          />
                          {contract.remainingAmount !== 0 && (
                            <div className="text-xs mt-1 text-muted-foreground">
                              متبقي: {contract.remainingAmount.toLocaleString('en-US')} ر.س
                            </div>
                          )}
                        </div>

                        {/* Month */}
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">الشهر</label>
                          <input
                            type="month"
                            value={contract.paymentMonth}
                            onChange={(e) => updatePaymentCalculations(contract.contractId, {
                              paymentMonth: e.target.value
                            })}
                            className="w-full p-2 border rounded-md text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        {/* Payment Method */}
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">طريقة الدفع</label>
                          <select
                            value={contract.paymentMethod}
                            onChange={(e) => setContracts(prev =>
                              prev.map(c =>
                                c.contractId === contract.contractId
                                  ? { ...c, paymentMethod: e.target.value }
                                  : c
                              )
                            )}
                            className="w-full p-2 border rounded-md text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="cash">نقدي</option>
                            <option value="bank_transfer">تحويل بنكي</option>
                            <option value="check">شيك</option>
                            <option value="credit_card">بطاقة ائتمان</option>
                            <option value="other">أخرى</option>
                          </select>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-sm text-muted-foreground block mb-2">ملاحظات</label>
                          <textarea
                            placeholder="مثال: تم سداد مبلغ 1500"
                            value={contract.notes}
                            onChange={(e) => handleNotesChange(contract.contractId, e.target.value)}
                            className="w-full min-h-[60px] p-2 border rounded-md text-sm focus:border-warning focus:ring-2 focus:ring-warning/20 transition-all"
                            style={{
                              borderColor: contract.notes ? 'hsl(25, 90%, 55%)' : undefined,
                              backgroundColor: contract.notes ? 'hsl(25, 90%, 98%)' : undefined
                            }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => confirmPayment(contract.contractId)}
                            disabled={!contract.notes.trim() || contract.status === 'paid'}
                            className="flex-1 bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            تأكيد
                          </Button>
                          {contract.notes.trim() && (
                            <Button
                              size="sm"
                              onClick={() => deletePayment(contract.contractId)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b-2">
                  <tr>
                    <th className="p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedContracts.size === filteredContracts.length && filteredContracts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContracts(new Set(filteredContracts.map(c => c.contractId)));
                          } else {
                            setSelectedContracts(new Set());
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </th>
                    <th 
                      className="p-4 text-right text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (sortField === 'customerName') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('customerName');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        معلومات العميل
                        {sortField === 'customerName' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-right text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (sortField === 'monthlyAmount') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('monthlyAmount');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        القسط المستحق
                        {sortField === 'monthlyAmount' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-right text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (sortField === 'amountPaid') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('amountPaid');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        المبلغ المدفوع
                        {sortField === 'amountPaid' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-4 text-right text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (sortField === 'month') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('month');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        الشهر
                        {sortField === 'month' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right text-sm font-semibold">طريقة الدفع</th>
                    <th 
                      className="p-4 text-right text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (sortField === 'status') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('status');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        الحالة
                        {sortField === 'status' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right text-sm font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد عقود نشطة'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((contract) => (
                      <tr key={contract.contractId} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedContracts.has(contract.contractId)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedContracts);
                              if (e.target.checked) {
                                newSelected.add(contract.contractId);
                              } else {
                                newSelected.delete(contract.contractId);
                              }
                              setSelectedContracts(newSelected);
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-right hover:bg-muted/50 p-2 rounded-md transition-colors">
                                <div className="font-semibold text-primary">{contract.customerName}</div>
                                <div className="text-xs text-muted-foreground mt-1">انقر للتفاصيل</div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="start">
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">اسم العميل</div>
                                  <div className="font-semibold">{contract.customerName}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">رقم المركبة</div>
                                  <div className="font-mono text-primary font-semibold">{contract.vehicleNumber}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">رقم الجوال</div>
                                  <div className="font-mono">{contract.phone}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">رقم العقد</div>
                                  <div className="font-mono text-sm">{contract.contractNumber}</div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-mono font-semibold text-success">
                              {contract.monthlyPayment.toLocaleString('en-US')} ر.ق
                            </div>
                            {contract.daysOverdue > 0 && (
                              <div className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                غرامة {contract.daysOverdue} يوم: {contract.lateFeeAmount.toLocaleString('en-US')} ر.ق
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Input
                            type="number"
                            value={contract.amountPaid}
                            onChange={(e) => updatePaymentCalculations(contract.contractId, {
                              amountPaid: parseFloat(e.target.value) || 0
                            })}
                            className="w-32 text-sm font-mono"
                            min="0"
                            step="0.01"
                          />
                          {contract.remainingAmount !== 0 && (
                            <div className="text-xs mt-1 text-muted-foreground">
                              متبقي: {contract.remainingAmount.toLocaleString('en-US')} ر.ق
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <input
                            type="month"
                            value={contract.paymentMonth}
                            onChange={(e) => updatePaymentCalculations(contract.contractId, {
                              paymentMonth: e.target.value
                            })}
                            className="w-full p-2 border rounded-md text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={contract.paymentMethod}
                            onChange={(e) => setContracts(prev =>
                              prev.map(c =>
                                c.contractId === contract.contractId
                                  ? { ...c, paymentMethod: e.target.value }
                                  : c
                              )
                            )}
                            className="w-full p-2 border rounded-md text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="cash">نقدي</option>
                            <option value="bank_transfer">تحويل بنكي</option>
                            <option value="check">شيك</option>
                            <option value="credit_card">بطاقة ائتمان</option>
                            <option value="other">أخرى</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <textarea
                            placeholder="مثال: تم سداد مبلغ 1500"
                            value={contract.notes}
                            onChange={(e) => handleNotesChange(contract.contractId, e.target.value)}
                            className="w-full min-w-[250px] min-h-[60px] p-2 border rounded-md text-sm focus:border-warning focus:ring-2 focus:ring-warning/20 transition-all"
                            style={{
                              borderColor: contract.notes ? 'hsl(25, 90%, 55%)' : undefined,
                              backgroundColor: contract.notes ? 'hsl(25, 90%, 98%)' : undefined
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={contract.status === 'paid' ? 'default' : 'secondary'}
                            className={contract.status === 'paid' ? 'bg-success hover:bg-success' : ''}
                          >
                            {contract.status === 'paid' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                مسددة
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                في الانتظار
                              </>
                            )}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => confirmPayment(contract.contractId)}
                              disabled={!contract.notes.trim() || contract.status === 'paid'}
                              className="bg-success hover:bg-success/90"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              تأكيد
                            </Button>
                            {contract.notes.trim() && (
                              <Button
                                size="sm"
                                onClick={() => deletePayment(contract.contractId)}
                                className="bg-destructive hover:bg-destructive/90"
                                title="حذف الملاحظة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredContracts.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>عرض</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border rounded-md px-2 py-1 bg-background"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>من {filteredContracts.length} عقد</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    صفحة {page} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Detection Modal */}
        {aiModalData && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md border-warning border-2 animate-in slide-in-from-bottom duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-warning">
                    <div className="p-2 bg-warning/10 rounded-full animate-pulse">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg">تم اكتشاف دفعة</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAiModalData(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg">
                    <User className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-warning font-semibold mb-1">العميل</div>
                      <div className="font-semibold">{aiModalData.contract.customerName}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg">
                    <DollarSign className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-warning font-semibold mb-1">المبلغ المستخرج</div>
                      <div className="font-semibold font-mono">
                        {aiModalData.analysis.amount.toLocaleString('en-US')} ر.ق
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg">
                    <CreditCard className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-warning font-semibold mb-1">طريقة الدفع</div>
                      <div className="font-semibold">{aiModalData.analysis.paymentMethod}</div>
                    </div>
                  </div>

                  {aiModalData.analysis.lateFee > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs text-warning font-semibold mb-1">غرامة تأخير</div>
                        <div className="font-semibold font-mono">
                          {aiModalData.analysis.lateFee.toLocaleString('en-US')} ر.ق
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full mt-4 bg-success hover:bg-success/90"
                  onClick={() => setAiModalData(null)}
                >
                  فهمت
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Bulk Payment Modal */}
        {showBulkPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">تسجيل دفعة جماعية</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      تسجيل دفعة لـ {selectedContracts.size} عقد
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkPaymentModal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Selected Contracts Summary */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-3">العقود المختارة:</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {paginatedContracts
                      .filter(c => selectedContracts.has(c.contractId))
                      .map(contract => (
                        <div key={contract.contractId} className="flex justify-between items-center text-sm p-2 bg-background rounded">
                          <span className="font-semibold">{contract.customerName}</span>
                          <span className="text-muted-foreground">{contract.vehicleNumber}</span>
                          <span className="font-mono">{contract.monthlyPayment.toLocaleString('en-US')} ر.س</span>
                        </div>
                      ))
                    }
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center font-bold">
                    <span>الإجمالي:</span>
                    <span className="text-lg text-success">
                      {paginatedContracts
                        .filter(c => selectedContracts.has(c.contractId))
                        .reduce((sum, c) => sum + c.monthlyPayment, 0)
                        .toLocaleString('en-US')} ر.س
                    </span>
                  </div>
                </div>

                {/* Payment Details Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">الشهر</label>
                    <input
                      type="month"
                      value={bulkPaymentData.paymentMonth}
                      onChange={(e) => setBulkPaymentData(prev => ({ ...prev, paymentMonth: e.target.value }))}
                      className="w-full p-2 border rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">طريقة الدفع</label>
                    <select
                      value={bulkPaymentData.paymentMethod}
                      onChange={(e) => setBulkPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full p-2 border rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="cash">نقدي</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                      <option value="credit_card">بطاقة ائتمان</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">ملاحظات</label>
                    <textarea
                      value={bulkPaymentData.notes}
                      onChange={(e) => setBulkPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="مثال: تم سداد جميع الأقساط نقداً"
                      className="w-full min-h-[100px] p-2 border rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={async () => {
                      try {
                        const selectedData = paginatedContracts.filter(c => selectedContracts.has(c.contractId));
                        
                        for (const contract of selectedData) {
                          await updatePaymentCalculations(contract.contractId, {
                            amountPaid: contract.monthlyPayment,
                            paymentMonth: bulkPaymentData.paymentMonth
                          });
                          
                          setContracts(prev =>
                            prev.map(c =>
                              c.contractId === contract.contractId
                                ? { ...c, paymentMethod: bulkPaymentData.paymentMethod, notes: bulkPaymentData.notes }
                                : c
                            )
                          );
                          
                          await confirmPayment(contract.contractId);
                        }
                        
                        toast.success(`تم تسجيل ${selectedData.length} دفعة بنجاح`);
                        setShowBulkPaymentModal(false);
                        setSelectedContracts(new Set());
                        setBulkPaymentData({
                          paymentMethod: 'cash',
                          paymentMonth: new Date().toISOString().slice(0, 7),
                          notes: ''
                        });
                      } catch (error) {
                        console.error('Bulk payment error:', error);
                        toast.error('حدث خطأ أثناء تسجيل الدفعات');
                      }
                    }}
                    disabled={!bulkPaymentData.notes.trim()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    تأكيد وتسجيل الدفعات
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkPaymentModal(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <PageHelp
        title="دليل استخدام صفحة تسجيل الدفعات"
        description="تعرف على كيفية تسجيل المدفوعات الواردة من العملاء بسرعة وسهولة"
      >
        <PaymentRegistrationPageHelpContent />
      </PageHelp>
    </div>
  );
};

export default PaymentRegistration;
