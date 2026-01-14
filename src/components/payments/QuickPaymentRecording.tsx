import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Check, X, Loader2, MessageCircle, CheckCircle, FileText, Download, AlertTriangle, ChevronDown } from 'lucide-react';
import { startOfMonth, endOfMonth, addMonths, isBefore, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';
import { PaymentReceipt } from './PaymentReceipt';
import { generateReceiptPDF, downloadPDF, generateReceiptHTML, downloadHTML, numberToArabicWords, generateReceiptNumber, formatReceiptDate } from '@/utils/receiptGenerator';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  balance_due: number | null;
  status: string;
  payment_status: string;
  contract_id: string | null;
  contracts: {
    contract_number: string;
    vehicle_number: string | null;
    vehicles: {
      plate_number: string;
    } | null;
  } | null;
}

interface PaymentSuccess {
  paymentId: string;
  receiptNumber: string;
  amount: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentDate: string;
  description: string;
  vehicleNumber: string;
}

interface QuickPaymentRecordingProps {
  onStepChange?: (step: number) => void;
}

export function QuickPaymentRecording({ onStepChange }: QuickPaymentRecordingProps) {
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // استخدام hook الدفعات الموحد لإنشاء القيود المحاسبية تلقائياً
  const { createPayment, isCreating } = usePaymentOperations({
    autoCreateJournalEntry: true, // ✅ إنشاء قيد محاسبي تلقائياً
    autoUpdateBankBalance: true,  // ✅ تحديث رصيد البنك
    enableNotifications: false,   // عدم إرسال إشعارات من هنا
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for customer data in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerId = params.get('customerId');
    const customerName = params.get('customerName');
    const phone = params.get('phone');

    if (customerId && customerName) {
      // Auto-select the customer from URL
      const customerFromUrl: Customer = {
        id: customerId,
        first_name: customerName.split(' ')[0] || customerName,
        last_name: customerName.split(' ').slice(1).join(' ') || '',
        phone: phone || '',
        customer_type: 'individual',
        company_id: companyId || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSelectedCustomer(customerFromUrl);
      // Trigger invoice fetching
      selectCustomer(customerFromUrl);
    }
  }, [location.search, companyId]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [readyToPay, setReadyToPay] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  
  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Report step changes to parent
  useEffect(() => {
    if (!onStepChange) return;

    if (paymentSuccess) {
      onStepChange(4); // Completed
    } else if (readyToPay) {
      onStepChange(3); // Payment ready
    } else if (selectedInvoices.length > 0) {
      onStepChange(2); // Invoices selected
    } else if (selectedCustomer) {
      onStepChange(1); // Customer selected
    } else {
      onStepChange(0); // Initial state
    }
  }, [paymentSuccess, readyToPay, selectedInvoices.length, selectedCustomer, onStepChange]);

  // Export functionality
  const exportSelectedInvoices = async () => {
    if (selectedInvoices.length === 0) {
      toast({
        title: 'لا توجد فواتير مختارة',
        description: 'يجب اختيار فواتير أولاً قبل التصدير',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Prepare export data
      const exportData = selectedInvoices.map(inv => ({
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        total_amount: inv.total_amount,
        balance_due: inv.balance_due ?? inv.total_amount,
        status: inv.status,
        contract_number: inv.contracts?.contract_number || '',
        vehicle_plate: inv.contracts?.vehicles?.plate_number || ''
      }));

      // Create CSV content
      const headers = ['رقم الفاتورة', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'المبلغ الإجمالي', 'المبلغ المستحق', 'الحالة', 'رقم العقد', 'لوحة المركبة'];
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => [
          row.invoice_number,
          row.invoice_date,
          row.due_date || '',
          row.total_amount.toFixed(2),
          row.balance_due.toFixed(2),
          row.status,
          row.contract_number,
          row.vehicle_plate
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Download CSV file
      const link = document.createElement('a');
      link.href = url;
      link.download = `فواتير-${selectedInvoices.length}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'تم التصدير ✅',
        description: `تم تصدير ${selectedInvoices.length} فاتورة بصيغة CSV`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'خطأ في التصدير',
        description: 'حدث خطأ أثناء تصدير الفواتير',
        variant: 'destructive'
      });
    }
  };

  // Filter invoices based on date range and status
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      result = result.filter(inv => new Date(inv.invoice_date) >= startDate);
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      result = result.filter(inv => new Date(inv.invoice_date) <= endDate);
    }

    // Filter by payment status
    if (paymentStatusFilter !== 'all') {
      const statusMap: Record<string, string[]> = {
        'completed': ['paid', 'partial_paid'],
        'pending': ['unpaid', 'pending'],
        'failed': ['cancelled', 'voided']
      };
      
      const applicableStatuses = statusMap[paymentStatusFilter] || [];
      result = result.filter(inv => applicableStatuses.includes(inv.status));
    }

    return result;
  }, [invoices, dateRange, paymentStatusFilter]);

  // Check for overdue invoices (past due date)
  const overdueInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    return invoices.filter(invoice => {
      if (!invoice.due_date) return false;
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }, [invoices]);

  // Check if user selected a future invoice while there are overdue ones
  const hasFutureSelectionWithOverdue = useMemo(() => {
    if (overdueInvoices.length === 0) return false;
    if (selectedInvoices.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if any selected invoice is NOT overdue (i.e., future or current)
    const selectedFutureOrCurrent = selectedInvoices.some(inv => {
      if (!inv.due_date) return false;
      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today; // Due date is today or in the future
    });
    
    // Check if there are unselected overdue invoices
    const hasUnselectedOverdue = overdueInvoices.some(overdue => 
      !selectedInvoices.some(sel => sel.id === overdue.id)
    );
    
    return selectedFutureOrCurrent && hasUnselectedOverdue;
  }, [selectedInvoices, overdueInvoices]);

  // Count hidden invoices
  const hiddenInvoicesCount = invoices.length - filteredInvoices.length;

  const searchCustomers = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      let query = supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      
      // فلترة حسب الشركة الحالية
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query.limit(10);

      if (error) throw error;

      setCustomers(data || []);
      if (data && data.length === 0) {
        toast({
          title: 'لم يتم العثور على عملاء',
          description: 'جرب البحث باسم أو رقم هاتف مختلف',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      toast({
        title: 'خطأ في البحث',
        description: 'حدث خطأ أثناء البحث عن العملاء',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomers([]);
    setSearchTerm('');

    // Fetch unpaid invoices for this customer
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          balance_due,
          status,
          payment_status,
          contract_id,
          contracts (
            contract_number,
            vehicle_id,
            vehicles:vehicle_id (
              plate_number
            )
          )
        `)
        .eq('customer_id', customer.id)
        .in('payment_status', ['unpaid', 'partial', 'overdue', 'pending'])
        .neq('status', 'cancelled')  // استبعاد الفواتير الملغاة
        .order('due_date', { ascending: true });

      if (error) throw error;

      setInvoices(data || []);
      // لا نعرض رسالة خطأ إذا لم تكن هناك فواتير - قد يكون هناك عقد بدون فواتير
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب الفواتير',
        variant: 'destructive',
      });
    }
  };

  const toggleInvoiceSelection = (invoice: Invoice) => {
    setSelectedInvoices(prev => {
      const isSelected = prev.some(i => i.id === invoice.id);
      if (isSelected) {
        const newSelection = prev.filter(i => i.id !== invoice.id);
        // Update payment amount
        const totalAmount = newSelection.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
        setPaymentAmount(totalAmount > 0 ? totalAmount.toString() : '');
        return newSelection;
      } else {
        const newSelection = [...prev, invoice];
        // Update payment amount
        const totalAmount = newSelection.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
        setPaymentAmount(totalAmount.toString());
        return newSelection;
      }
    });
  };

  const selectAllInvoices = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
      setPaymentAmount('');
    } else {
      setSelectedInvoices(invoices);
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
      setPaymentAmount(totalAmount.toString());
    }
  };

  const getTotalSelectedAmount = () => {
    return selectedInvoices.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
  };

  const processPayment = async () => {
    if (!selectedCustomer || !paymentAmount || !companyId) {
      toast({
        title: 'بيانات ناقصة',
        description: 'يرجى التأكد من اختيار العميل وإدخال المبلغ',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'مبلغ غير صحيح',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const paymentDate = new Date().toISOString().split('T')[0];
      const paymentNumber = `PAY-${Date.now()}`;
      
      console.log('Processing payment with:', {
        companyId,
        customerId: selectedCustomer.id,
        invoiceIds: selectedInvoices.map(i => i.id),
        amount,
        paymentMethod
      });

      // ✅ معالجة حالة عدم وجود فواتير - البحث عن فاتورة موجودة أو إنشاء واحدة
      if (selectedInvoices.length === 0) {
        // البحث عن عقد نشط للعميل
        const { data: activeContracts, error: contractError } = await supabase
          .from('contracts')
          .select('id, contract_number, monthly_amount')
          .eq('customer_id', selectedCustomer.id)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (contractError || !activeContracts || activeContracts.length === 0) {
          throw new Error('لا يوجد عقد نشط للعميل. يرجى إنشاء فاتورة أولاً.');
        }

        const activeContract = activeContracts[0];
        
        // ✅ استخدام الخدمة الموحدة للبحث عن فاتورة موجودة أو إنشاء واحدة جديدة
        const { UnifiedInvoiceService } = await import('@/services/UnifiedInvoiceService');
        const invoiceResult = await UnifiedInvoiceService.findOrCreateInvoice({
          companyId,
          customerId: selectedCustomer.id,
          contractId: activeContract.id,
          contractNumber: activeContract.contract_number,
          monthlyAmount: activeContract.monthly_amount || amount,
          paymentDate
        });

        if (!invoiceResult.success || !invoiceResult.invoice) {
          throw new Error(invoiceResult.error || 'فشل في البحث عن/إنشاء الفاتورة');
        }

        // جلب بيانات الفاتورة الكاملة مع العقد
        const { data: fullInvoice } = await supabase
          .from('invoices')
          .select(`
            *,
            contracts:contract_id (
              contract_number,
              vehicle_number,
              vehicles:vehicle_id (
                plate_number
              )
            )
          `)
          .eq('id', invoiceResult.invoice.id)
          .single();

        if (fullInvoice) {
          selectedInvoices.push(fullInvoice as any);
          console.log('✅ تم العثور على/إنشاء فاتورة:', invoiceResult.invoice.invoice_number, invoiceResult.reason || 'جديدة');
        }
      }

      // Group invoices by contract
      const contractIds = [...new Set(selectedInvoices.map(inv => inv.contract_id).filter((id): id is string => id !== null))];
      const invoiceNumbers = selectedInvoices.map(inv => inv.invoice_number).join(', ');
      const contractNumbers = selectedInvoices.map(inv => inv.contracts?.contract_number).filter(Boolean).join(', ');

      console.log('Processing payment for invoices:', invoiceNumbers);

      // ✅ إنشاء دفعة منفصلة لكل فاتورة (الحل الصحيح)
      let remainingAmount = amount;
      let firstPaymentId: string | null = null;
      let paymentsCreated = 0;

      for (let i = 0; i < selectedInvoices.length && remainingAmount > 0; i++) {
        const invoice = selectedInvoices[i];
        const invoiceBalance = invoice.balance_due ?? invoice.total_amount;
        const amountToApply = Math.min(remainingAmount, invoiceBalance);
        
        if (amountToApply <= 0) continue;

        // ✅ استخدام usePaymentOperations بدلاً من الإدراج المباشر
        // هذا ينشئ القيود المحاسبية تلقائياً
        const paymentData: any = {
          customer_id: selectedCustomer.id,
          invoice_id: invoice.id,
          amount: amountToApply,
          payment_date: paymentDate,
          payment_method: paymentMethod as 'cash' | 'bank_transfer' | 'check' | 'credit_card',
          payment_number: `${paymentNumber}-${i + 1}`,
          type: 'receipt' as const, // ✅ إصلاح: الـ schema يتوقع 'type' وليس 'payment_type'
          currency: 'QAR',
          notes: `دفعة لفاتورة ${invoice.invoice_number}`,
          idempotencyKey: `${selectedCustomer.id}-${invoice.id}-${paymentDate}-${amountToApply}`,
        };
        
        // Only include contract_id if it exists and is a valid UUID
        if (invoice.contract_id && invoice.contract_id !== '' && invoice.contract_id !== 'null' && invoice.contract_id !== 'undefined') {
          paymentData.contract_id = invoice.contract_id;
        }
        
        console.log(`Creating payment ${i + 1} for invoice ${invoice.invoice_number}:`, amountToApply);
        
        let payment: any;
        try {
          // استخدام الـ hook لإنشاء الدفعة مع القيود المحاسبية
          payment = await createPayment.mutateAsync(paymentData);
        } catch (paymentError: any) {
          console.error('Payment insert error:', paymentError);
          if (paymentError.message?.includes('موجود مسبقاً') || paymentError.message?.includes('duplicate')) {
            console.warn(`تخطي الفاتورة ${invoice.invoice_number} - الدفعة مسجلة بالفعل`);
            continue; // تخطي هذه الفاتورة والمتابعة مع الباقي
          }
          throw new Error(`خطأ في إنشاء الدفعة: ${paymentError.message}`);
        }
        
        if (!firstPaymentId) firstPaymentId = payment.id;
        paymentsCreated++;

        // تحديث الفاتورة
        const newBalance = Math.max(0, invoiceBalance - amountToApply);
        const newPaymentStatus = newBalance <= 0 ? 'paid' : 'partial';
        
        await supabase
          .from('invoices')
          .update({ 
            payment_status: newPaymentStatus,
            paid_amount: (invoice.total_amount - newBalance),
            balance_due: newBalance
          })
          .eq('id', invoice.id);

        remainingAmount -= amountToApply;
      }

      if (paymentsCreated === 0) {
        throw new Error('لم يتم تسجيل أي دفعة. قد تكون جميع الدفعات مسجلة بالفعل.');
      }

      console.log(`Successfully created ${paymentsCreated} payment(s)`);

      // ✅ تحديث last_payment_date فقط - الـ trigger يحسب total_paid تلقائياً
      for (const contractId of contractIds) {
        await supabase
          .from('contracts')
          .update({
            last_payment_date: paymentDate,
          })
          .eq('id', contractId);
      }
      
      // للتوافق مع الكود التالي
      const payment = { id: firstPaymentId };

      // استخراج رقم المركبة من أول فاتورة
      const vehicleNumber = selectedInvoices[0]?.contracts?.vehicle_number || 
                           selectedInvoices[0]?.contracts?.vehicles?.plate_number || '';

      // Show success screen
      setPaymentSuccess({
        paymentId: payment.id,
        receiptNumber: generateReceiptNumber(),
        amount: amount,
        invoiceNumber: selectedInvoices.length > 1 
          ? `${selectedInvoices.length} فواتير` 
          : selectedInvoices[0].invoice_number,
        customerName: `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim(),
        customerPhone: selectedCustomer.phone,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        description: selectedInvoices.length > 1 
          ? `دفعة مجمعة لـ ${selectedInvoices.length} فاتورة - عقود: ${contractNumbers}`
          : `دفعة إيجار - عقد رقم ${contractNumbers} - فاتورة ${invoiceNumbers}`,
        vehicleNumber: vehicleNumber,
      });

      toast({
        title: 'تم تسجيل الدفعة بنجاح ✅',
        description: `تم تسجيل دفعة بمبلغ ${amount.toFixed(2)} ر.ق لـ ${selectedInvoices.length} فاتورة`,
      });

    } catch (error: unknown) {
      console.error('Error processing payment:', JSON.stringify(error, null, 2));
      let errorMessage = 'حدث خطأ غير معروف';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errObj = error as { message?: string; code?: string; details?: string };
        errorMessage = errObj.message || errObj.details || errObj.code || JSON.stringify(error);
      }
      toast({
        title: 'خطأ في معالجة الدفعة',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !paymentSuccess) return;
    
    setGeneratingPDF(true);
    try {
      const html = await generateReceiptHTML(receiptRef.current);
      downloadHTML(html, `سند-قبض-${paymentSuccess.receiptNumber}.html`);
      toast({
        title: 'تم تحميل السند ✅',
        description: 'تم حفظ سند القبض بصيغة HTML - يمكن طباعته مباشرة',
      });
    } catch (error) {
      console.error('Error generating HTML:', error);
      toast({
        title: 'خطأ في إنشاء الملف',
        description: 'حدث خطأ أثناء إنشاء الملف',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const sendReceiptViaWhatsApp = async () => {
    if (!paymentSuccess || !paymentSuccess.customerPhone) {
      toast({
        title: 'لا يوجد رقم هاتف',
        description: 'لا يمكن إرسال الإيصال لعدم وجود رقم هاتف للعميل',
        variant: 'destructive',
      });
      return;
    }

    // Show the receipt for PDF generation
    setShowReceipt(true);
    setGeneratingPDF(true);

    // Wait for the receipt to render and images to load
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const paymentMethodLabel = 
        paymentSuccess.paymentMethod === 'cash' ? 'نقدي' : 
        paymentSuccess.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 
        paymentSuccess.paymentMethod === 'check' ? 'شيك' : 'أخرى';

      // رسالة واتساب
      const message = `سند قبض رقم: ${paymentSuccess.receiptNumber}

عزيزي/عزيزتي ${paymentSuccess.customerName}،

تم استلام دفعتكم بنجاح

تفاصيل الدفعة:
- رقم السند: ${paymentSuccess.receiptNumber}
- رقم الفاتورة: ${paymentSuccess.invoiceNumber}
- المبلغ المدفوع: ${paymentSuccess.amount.toFixed(2)} ر.ق
- المبلغ كتابة: ${numberToArabicWords(paymentSuccess.amount)}
- تاريخ الدفع: ${formatReceiptDate(paymentSuccess.paymentDate)}
- طريقة الدفع: ${paymentMethodLabel}

شكرا لتعاملكم معنا

شركة العراف لتأجير السيارات`;

      // Format phone number
      let phone = paymentSuccess.customerPhone.replace(/\s+/g, '').replace(/-/g, '');
      if (phone.startsWith('0')) {
        phone = '974' + phone.substring(1);
      } else if (!phone.startsWith('+') && !phone.startsWith('974')) {
        phone = '974' + phone;
      }
      phone = phone.replace('+', '');

      // Generate HTML
      if (receiptRef.current) {
        const html = await generateReceiptHTML(receiptRef.current);
        downloadHTML(html, `سند-قبض-${paymentSuccess.receiptNumber}.html`);
      }

      // Open WhatsApp Web
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: 'تم فتح واتساب ويب',
        description: 'تم تحميل سند القبض HTML، أرفقه في المحادثة ثم اضغط إرسال',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء السند',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedInvoices([]);
    setInvoices([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setSearchTerm('');
    setCustomers([]);
    setPaymentSuccess(null);
    setShowReceipt(false);
    setReadyToPay(false);
  };

  // دالة جديدة: إعادة تعيين النموذج مع الإبقاء على نفس العميل
  const newPaymentSameCustomer = async () => {
    if (!selectedCustomer) {
      resetForm();
      return;
    }

    // حفظ بيانات العميل
    const currentCustomer = selectedCustomer;
    
    // إعادة تعيين حالة الدفعة
    setSelectedInvoices([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentSuccess(null);
    setShowReceipt(false);
    setReadyToPay(false);

    // إعادة جلب الفواتير للعميل الحالي
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          balance_due,
          status,
          payment_status,
          contract_id,
          contracts (
            contract_number,
            vehicle_id,
            vehicles:vehicle_id (
              plate_number
            )
          )
        `)
        .eq('customer_id', currentCustomer.id)
        .in('payment_status', ['unpaid', 'partial', 'overdue', 'pending'])
        .neq('status', 'cancelled')  // استبعاد الفواتير الملغاة
        .order('due_date', { ascending: true });

      if (error) throw error;

      setInvoices(data || []);
      if (data && data.length === 0) {
        toast({
          title: 'لا توجد فواتير مستحقة',
          description: 'لم يتبقى فواتير غير مدفوعة لهذا العميل',
        });
      } else {
        toast({
          title: 'تم تحديث الفواتير',
          description: `تم تحميل ${data?.length || 0} فاتورة للعميل ${currentCustomer.first_name}`,
        });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب الفواتير',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Success Screen */}
      {paymentSuccess && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-green-800">تم تسجيل الدفعة بنجاح!</h3>
                <p className="text-green-600 mt-1">تم حفظ الدفعة في النظام</p>
              </div>

              <div className="bg-white rounded-xl p-4 space-y-3 text-right border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{paymentSuccess.amount.toFixed(2)} ر.ق</span>
                  <span className="text-muted-foreground">المبلغ المدفوع</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-mono">{paymentSuccess.receiptNumber}</span>
                  <span className="text-muted-foreground">رقم السند</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{paymentSuccess.invoiceNumber}</span>
                  <span className="text-muted-foreground">رقم الفاتورة</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{paymentSuccess.customerName}</span>
                  <span className="text-muted-foreground">العميل</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{formatReceiptDate(paymentSuccess.paymentDate)}</span>
                  <span className="text-muted-foreground">التاريخ</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">هل تريد إرسال سند القبض للعميل؟</p>
                
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button 
                    onClick={sendReceiptViaWhatsApp} 
                    disabled={!paymentSuccess.customerPhone || generatingPDF}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {generatingPDF ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4 ml-2" />
                    )}
                    إرسال عبر واتساب
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setShowReceipt(!showReceipt)}
                  >
                    <FileText className="h-4 w-4 ml-2" />
                    {showReceipt ? 'إخفاء السند' : 'معاينة السند'}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handleDownloadReceipt}
                    disabled={generatingPDF || !showReceipt}
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل السند
                  </Button>
                  
                  <Button variant="outline" onClick={newPaymentSameCustomer}>
                    دفعة جديدة (نفس العميل)
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    عميل آخر
                  </Button>
                </div>

                {!paymentSuccess.customerPhone && (
                  <p className="text-xs text-amber-600">
                    ⚠️ لا يوجد رقم هاتف للعميل
                  </p>
                )}
              </div>

              {/* Receipt Preview */}
              {showReceipt && (
                <div className="mt-6 border rounded-lg overflow-auto bg-slate-100 p-2 sm:p-4" style={{ maxHeight: '80vh' }}>
                  <div className="w-full">
                    <PaymentReceipt
                      ref={receiptRef}
                      receiptNumber={paymentSuccess.receiptNumber}
                      date={formatReceiptDate(paymentSuccess.paymentDate)}
                      customerName={paymentSuccess.customerName}
                      amountInWords={numberToArabicWords(paymentSuccess.amount)}
                      amount={paymentSuccess.amount}
                      description={paymentSuccess.description}
                      paymentMethod={paymentSuccess.paymentMethod as 'cash' | 'check' | 'bank_transfer' | 'other'}
                      vehicleNumber={paymentSuccess.vehicleNumber}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Payment Form */}
      {!paymentSuccess && (
      <Card>
        <CardHeader>
          <CardTitle>تسجيل دفعة سريع</CardTitle>
          <CardDescription>
            ابحث عن العميل، اختر الفاتورة، وسجل الدفعة في أقل من دقيقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Search Customer */}
          {!selectedCustomer && (
            <div className="space-y-4">
              <Label>ابحث عن العميل</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="اسم العميل أو رقم الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
                />
                <Button onClick={searchCustomers} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {customers.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-accent cursor-pointer"
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Show Selected Customer and Invoices */}
          {selectedCustomer && !readyToPay && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>العميل المختار</Label>
                  <div className="text-lg font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>اختر الفواتير المراد دفعها (يمكنك تحديد أكثر من فاتورة)</Label>
                  {invoices.length > 0 && (
                    <Button variant="outline" size="sm" onClick={selectAllInvoices}>
                      {selectedInvoices.length === invoices.length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </Button>
                  )}
                </div>

                {/* Warning for selecting future invoices while overdue exist */}
                {hasFutureSelectionWithOverdue && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium text-sm">تنبيه: توجد فواتير سابقة مستحقة</p>
                      <p className="text-amber-700 text-xs mt-1">
                        يوجد {overdueInvoices.length} فاتورة متأخرة. يُفضل دفع الفواتير المتأخرة أولاً.
                      </p>
                    </div>
                  </div>
                )}

                {invoices.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="text-muted-foreground">
                      لا توجد فواتير غير مدفوعة لهذا العميل
                    </div>
                    <Button
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={async () => {
                        if (!selectedCustomer || !companyId) return;
                        
                        try {
                          // البحث عن عقد نشط للعميل
                          const { data: activeContracts, error: contractError } = await supabase
                            .from('contracts')
                            .select('id, contract_number, monthly_amount')
                            .eq('customer_id', selectedCustomer.id)
                            .eq('company_id', companyId)
                            .eq('status', 'active')
                            .order('created_at', { ascending: false })
                            .limit(1);

                          if (contractError || !activeContracts || activeContracts.length === 0) {
                            toast({
                              title: 'لا يوجد عقد نشط',
                              description: 'يجب أن يكون للعميل عقد نشط لإنشاء فاتورة',
                              variant: 'destructive',
                            });
                            return;
                          }

                          const activeContract = activeContracts[0];
                          const today = new Date().toISOString().split('T')[0];
                          
                          // ✅ استخدام الخدمة الموحدة للبحث عن فاتورة موجودة أو إنشاء واحدة جديدة
                          const { UnifiedInvoiceService } = await import('@/services/UnifiedInvoiceService');
                          const invoiceResult = await UnifiedInvoiceService.findOrCreateInvoice({
                            companyId,
                            customerId: selectedCustomer.id,
                            contractId: activeContract.id,
                            contractNumber: activeContract.contract_number,
                            monthlyAmount: activeContract.monthly_amount || 0,
                            paymentDate: today
                          });

                          if (!invoiceResult.success || !invoiceResult.invoice) {
                            throw new Error(invoiceResult.error || 'فشل في البحث عن/إنشاء الفاتورة');
                          }

                          // جلب بيانات الفاتورة الكاملة مع العقد
                          const { data: fullInvoice } = await supabase
                            .from('invoices')
                            .select(`
                              *,
                              contracts:contract_id (
                                contract_number,
                                vehicle_number,
                                vehicles:vehicle_id (
                                  plate_number
                                )
                              )
                            `)
                            .eq('id', invoiceResult.invoice.id)
                            .single();

                          const wasExisting = invoiceResult.reason?.includes('العثور');
                          toast({
                            title: wasExisting ? 'تم العثور على فاتورة' : 'تم إنشاء الفاتورة',
                            description: wasExisting 
                              ? `تم العثور على فاتورة موجودة: ${invoiceResult.invoice.invoice_number}` 
                              : `تم إنشاء الفاتورة ${invoiceResult.invoice.invoice_number} بنجاح`,
                          });

                          // تحديث قائمة الفواتير
                          if (fullInvoice) {
                            setInvoices([fullInvoice as any]);
                          }
                        } catch (error: any) {
                          console.error('Error creating invoice:', error);
                          toast({
                            title: 'خطأ في إنشاء الفاتورة',
                            description: error.message || 'حدث خطأ أثناء إنشاء الفاتورة',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 ml-2" />
                      إنشاء فاتورة جديدة
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      سيتم إنشاء فاتورة بناءً على العقد النشط للعميل
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                    {filteredInvoices.map((invoice) => {
                      const isOverdue = invoice.due_date ? new Date(invoice.due_date) < new Date() : false;
                      const isSelected = selectedInvoices.some(i => i.id === invoice.id);
                      const balanceDue = invoice.balance_due ?? invoice.total_amount;
                      return (
                        <div
                          key={invoice.id}
                          className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-green-50 border-r-4 border-r-green-500' : 'hover:bg-accent'}`}
                          onClick={() => toggleInvoiceSelection(invoice)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{invoice.invoice_number}</div>
                                  <div className="text-sm text-muted-foreground">
                                    عقد: {invoice.contracts?.contract_number || '-'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    تاريخ الاستحقاق: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-EG') : '-'}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <div className="text-lg font-bold">{balanceDue.toFixed(2)} ريال</div>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="mt-1">
                                      متأخر
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    
                    {/* Show more invoices button */}
                    {!showAllInvoices && hiddenInvoicesCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setShowAllInvoices(true)}
                      >
                        <ChevronDown className="h-4 w-4 ml-1" />
                        عرض {hiddenInvoicesCount} فاتورة إضافية
                      </Button>
                    )}
                    {showAllInvoices && hiddenInvoicesCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-slate-600 hover:text-slate-700"
                        onClick={() => setShowAllInvoices(false)}
                      >
                        إخفاء الفواتير المستقبلية
                      </Button>
                    )}
                  </div>
                )}

                {/* Show proceed button when invoices are selected */}
                {selectedInvoices.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {/* Warning before payment if selecting future invoice with overdue ones */}
                    {hasFutureSelectionWithOverdue && (
                      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-start gap-3 animate-pulse">
                        <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="text-amber-800 font-bold">⚠️ تنبيه هام!</p>
                          <p className="text-amber-700 text-sm mt-1">
                            لديك {overdueInvoices.length} فاتورة متأخرة غير مدفوعة. 
                            يُنصح بدفع الفواتير المتأخرة أولاً قبل دفع الفواتير المستقبلية.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-green-800">
                          تم تحديد {selectedInvoices.length} فاتورة
                        </span>
                        <span className="text-xl font-bold text-green-700">
                          {getTotalSelectedAmount().toFixed(2)} ر.ق
                        </span>
                      </div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setReadyToPay(true)}
                      >
                        <Check className="h-4 w-4 ml-2" />
                        متابعة للدفع ({selectedInvoices.length} فاتورة)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {selectedCustomer && readyToPay && selectedInvoices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>الفواتير المختارة ({selectedInvoices.length})</Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedInvoices.map(inv => inv.invoice_number).join(' - ')}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setReadyToPay(false)}>
                  <X className="h-4 w-4" />
                  <span className="mr-1">تعديل الاختيار</span>
                </Button>
              </div>

              {/* Summary of selected invoices */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {selectedInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex justify-between items-center text-sm">
                    <span>{invoice.invoice_number}</span>
                    <span className="font-medium">{(invoice.balance_due ?? invoice.total_amount).toFixed(2)} ر.ق</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between items-center font-bold">
                  <span>المجموع</span>
                  <span className="text-green-600">{getTotalSelectedAmount().toFixed(2)} ر.ق</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ المدفوع</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={processPayment} disabled={processing} className="flex-1">
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                  تأكيد الدفعة ({selectedInvoices.length} فاتورة)
                </Button>
                <Button variant="outline" onClick={() => setReadyToPay(false)}>
                  رجوع
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
