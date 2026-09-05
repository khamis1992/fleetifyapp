// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  useRentalPaymentReceipts,
  useAllRentalPaymentReceipts,
  useCustomersWithRental,
  useCustomerPaymentTotals,
  useCreateRentalReceipt,
  useDeleteRentalReceipt,
  useCustomerOutstandingBalance,
  useCustomerUnpaidMonths,
  useCustomerVehicles,
  calculateDelayFine,
  type CustomerWithRental,
  type RentalPaymentReceipt,
  type CustomerVehicle
} from '@/hooks/useRentalPayments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQueryClient } from '@tanstack/react-query';
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';
import { printDocument, convertReceiptToPrintable } from '@/utils/printHelper';
import { useBanks } from '@/hooks/useTreasury';

import {
  UnpaidByMonthView,
  CustomerSearchSection,
  PaymentForm,
  PaymentHistoryTable,
  MonthlyRevenueTab,
  CreateCustomerDialog,
  DeleteReceiptDialog,
} from './financial-tracking';

const DELAY_FINE_PER_DAY = 120; // QAR
const MAX_FINE_PER_MONTH = 3000; // QAR

const FinancialTrackingInner: React.FC = () => {
  const navigate = useNavigate();
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRental | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [displayPaymentDate, setDisplayPaymentDate] = useState(format(new Date(), 'dd/MM/yyyy')); // Display format
  const [paymentNotes, setPaymentNotes] = useState(''); // User notes for payment
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Payment method
  const [selectedBankId, setSelectedBankId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState(''); // Reference/check number
  const [receiptIdempotencyKey, setReceiptIdempotencyKey] = useState(() => crypto.randomUUID());
  
  // Date range filter state
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // New customer creation state
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerRent, setNewCustomerRent] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const quickCustomerRequestKeyRef = useRef<string | null>(null);
  
  // Monthly revenue filter state
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all'); // 'all' or 'yyyy-MM' format
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<RentalPaymentReceipt | null>(null);

  // Edit monthly rent state
  const [editingMonthlyRent, setEditingMonthlyRent] = useState(false);
  const [newMonthlyRent, setNewMonthlyRent] = useState('');
  const [isUpdatingRent, setIsUpdatingRent] = useState(false);

  // Edit customer name state
  const [editingCustomerName, setEditingCustomerName] = useState(false);
  const [editedCustomerName, setEditedCustomerName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Vehicle selection state (for customers with multiple vehicles)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Set up real-time subscription for rental payment receipts
  useEffect(() => {
    if (!companyId) return;

    console.log('📡 [REALTIME] Setting up rental receipts subscription:', {
      companyId,
      timestamp: new Date().toISOString()
    });

    // Create channel with unique name
    const channel = supabase
      .channel('rental-receipts-realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: 'rental-receipts' }
        }
      });

    // Subscription config
    const subscriptionConfig = {
      event: '*' as const,
      schema: 'public' as const,
      table: 'rental_payment_receipts' as const,
      filter: `company_id=eq.${companyId}`
    };

    console.log('📡 [REALTIME] Subscription config:', subscriptionConfig);

    channel
      .on('postgres_changes', subscriptionConfig, (payload) => {
        console.log('🔔 [REALTIME] Rental receipt event received:', {
          eventType: payload.eventType,
          recordId: (payload.new as any)?.id || (payload.old as any)?.id,
          timestamp: new Date().toISOString()
        });

        try {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // تأخير قصير لتجنب التضارب مع Optimistic Updates
          setTimeout(() => {
            // Invalidate relevant queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId] });
            queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });
            
            // If we have a selected customer, invalidate their specific queries too
            if (selectedCustomer) {
              queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId, selectedCustomer.id] });
              queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId, selectedCustomer.id] });
              queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', companyId, selectedCustomer.id] });
              queryClient.invalidateQueries({ queryKey: ['customer-unpaid-months', companyId, selectedCustomer.id] });
            }
          }, 100); // تأخير 100ms لتجنب التضارب
        } catch (error) {
          console.error('❌ [REALTIME] Error processing event:', error);
        }
      })
      .subscribe((status) => {
        console.log('📡 [REALTIME] Subscription status:', {
          status,
          timestamp: new Date().toISOString(),
          companyId
        });
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Rental receipts subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Subscription error');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [REALTIME] Subscription timed out');
        }
      });

    return () => {
      console.log('🔌 [REALTIME] Cleaning up rental receipts subscription');
      supabase.removeChannel(channel);
    };
  }, [companyId, selectedCustomer, queryClient]);

  // Fetch customers with rental info from Supabase
  const { data: allCustomers = [], isLoading: loadingCustomers } = useCustomersWithRental();
  const { data: banks = [] } = useBanks();
  
  // Fetch customer's vehicles
  const { data: customerVehicles = [], isLoading: loadingVehicles } = useCustomerVehicles(selectedCustomer?.id);
  
  // Fetch ALL receipts for company (for monthly summaries)
  const { data: allReceipts = [], isLoading: loadingAllReceipts } = useAllRentalPaymentReceipts();
  
  // Fetch receipts for selected customer
  const { data: receipts = [], isLoading: loadingReceipts } = useRentalPaymentReceipts(selectedCustomer?.id);
  
  // Fetch customer totals
  const { data: totalsData } = useCustomerPaymentTotals(selectedCustomer?.id);
  
  // Fetch outstanding balance
  const { data: outstandingBalance, isLoading: loadingBalance } = useCustomerOutstandingBalance(selectedCustomer?.id);
  
  // Fetch unpaid months
  const { data: unpaidMonths = [], isLoading: loadingUnpaid } = useCustomerUnpaidMonths(selectedCustomer?.id);
  
  // Create receipt mutation
  const createReceiptMutation = useCreateRentalReceipt();
  
  // Delete receipt mutation
  const deleteReceiptMutation = useDeleteRentalReceipt();

  // Calculate monthly revenue summary
  const monthlySummary = useMemo(() => {
    const summary: Record<string, { month: string; rent: number; fines: number; total: number; count: number }> = {};
    
    allReceipts.forEach(receipt => {
      // Validate date before parsing
      if (!receipt.payment_date) return;
      
      const dateObj = new Date(receipt.payment_date);
      if (isNaN(dateObj.getTime())) return; // Skip invalid dates
      
      const monthKey = format(dateObj, 'yyyy-MM');
      const monthLabel = format(dateObj, 'MMMM yyyy', { locale: ar });
      
      if (!summary[monthKey]) {
        summary[monthKey] = {
          month: monthLabel,
          rent: 0,
          fines: 0,
          total: 0,
          count: 0
        };
      }
      
      summary[monthKey].rent += receipt.rent_amount || 0;
      summary[monthKey].fines += receipt.fine || 0;
      summary[monthKey].total += receipt.total_paid || 0;
      summary[monthKey].count += 1;
    });
    
    // Convert to array and sort by month (newest first)
    return Object.entries(summary)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ ...data, monthKey: key }));
  }, [allReceipts]);

  // Filtered monthly summary based on selected month
  const filteredMonthlySummary = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      return monthlySummary;
    }
    return monthlySummary.filter(m => m.monthKey === selectedMonthFilter);
  }, [monthlySummary, selectedMonthFilter]);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const search = searchTerm.toLowerCase();
    return allCustomers.filter(customer =>
      customer.name.toLowerCase().includes(search)
    );
  }, [searchTerm, allCustomers]);

  // Get receipts for selected customer (already filtered by hook)
  const customerReceipts = receipts;

  // Calculate totals for selected customer
  const customerTotals = useMemo(() => {
    if (totalsData) {
      return {
        total: totalsData.total_payments || 0,
        totalFines: totalsData.total_fines || 0,
        totalRent: totalsData.total_rent || 0
      };
    }
    // Fallback calculation from receipts
    const total = customerReceipts.reduce((sum, r) => sum + r.total_paid, 0);
    const totalFines = customerReceipts.reduce((sum, r) => sum + r.fine, 0);
    const totalRent = customerReceipts.reduce((sum, r) => sum + r.rent_amount, 0);
    return { total, totalFines, totalRent };
  }, [totalsData, customerReceipts]);

  // Fine calculation is now imported from useRentalPayments hook

  /**
   * Convert DD/MM/YYYY to YYYY-MM-DD
   */
  const parseDisplayDate = (displayDate: string): string => {
    try {
      const parts = displayDate.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  /**
   * Convert YYYY-MM-DD to DD/MM/YYYY
   */
  const formatDisplayDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      if (!isNaN(date.getTime())) {
        return format(date, 'dd/MM/yyyy');
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    return format(new Date(), 'dd/MM/yyyy');
  };

  /**
   * Handle display date input change
   */
  const handleDisplayDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayPaymentDate(value);
    
    // Try to parse and validate the date
    const isoDate = parseDisplayDate(value);
    setPaymentDate(isoDate);
  };

  const handleSelectCustomer = (customer: CustomerWithRental) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setShowDropdown(false);
  };

  /**
   * Export receipts to Excel (CSV format)
   */
  const exportToExcel = () => {
    if (!selectedCustomer || customerReceipts.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    // Create CSV content
    const headers = ['الشهر', 'تاريخ الدفع', 'الإيجار', 'الغرامة', 'الإجمالي المدفوع'];
    const rows = customerReceipts.map(receipt => [
      receipt.month || '-',
      receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime())
        ? format(new Date(receipt.payment_date), 'dd/MM/yyyy', { locale: ar })
        : 'تاريخ غير متاح',
      (receipt.rent_amount || 0).toString(),
      (receipt.fine || 0).toString(),
      (receipt.total_paid || 0).toString()
    ]);

    // Add totals row
    rows.push([
      'الإجمالي',
      '',
      (customerTotals?.totalRent || 0).toString(),
      (customerTotals?.totalFines || 0).toString(),
      (customerTotals?.total || 0).toString()
    ]);

    // Create CSV content
    // Combine headers and rows
    const csvContent = [
      `سجل مدفوعات العميل: ${selectedCustomer.name}`,
      `تاريخ التصدير: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `مدفوعات_${selectedCustomer.name}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('تم تصدير البيانات بنجاح');
  };

  /**
   * Print receipt for a specific payment using unified template
   */
  const printReceipt = (receipt: RentalPaymentReceipt) => {
    try {
      const printableData = convertReceiptToPrintable(receipt);
      printDocument(printableData);
      toast.success('تم فتح نافذة الطباعة');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('حدث خطأ أثناء الطباعة');
    }
  };

  /**
   * Print all receipts summary
   */
  const printAllReceipts = () => {
    if (!selectedCustomer || customerReceipts.length === 0) {
      toast.error('لا توجد إيصالات للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('الرجاء السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const receiptsRows = customerReceipts.map(receipt => `
      <tr>
        <td>${receipt.month || '-'}</td>
        <td>${receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime())
          ? format(new Date(receipt.payment_date), 'dd/MM/yyyy', { locale: ar })
          : 'تاريخ غير متاح'
        }</td>
        <td>${(receipt.rent_amount || 0).toLocaleString('en-US')}</td>
        <td style="color: ${receipt.fine > 0 ? '#c00' : '#666'};">${(receipt.fine || 0).toLocaleString('en-US')}</td>
        <td style="font-weight: bold;">${(receipt.total_paid || 0).toLocaleString('en-US')}</td>
      </tr>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سجل المدفوعات - ${selectedCustomer.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .customer-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
          }
          th {
            background: #333;
            color: white;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .totals {
            background: #333;
            color: white;
            font-weight: bold;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-top: 30px;
          }
          .summary-card {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
          }
          .summary-card p {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚗 سجل المدفوعات الكامل</h1>
          <p>نظام تتبع مدفوعات إيجار السيارات</p>
        </div>

        <div class="customer-info">
          <h2>بيانات العميل</h2>
          <p><strong>الاسم:</strong> ${selectedCustomer.name}</p>
          <p><strong>الإيجار الشهري:</strong> ${(selectedCustomer?.monthly_rent || 0).toLocaleString('en-US')} ريال</p>
          <p><strong>تاريخ الطباعة:</strong> ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: ar })}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>الشهر</th>
              <th>تاريخ الدفع</th>
              <th>الإيجار (ريال)</th>
              <th>الغرامة (ريال)</th>
              <th>الإجمالي (ريال)</th>
            </tr>
          </thead>
          <tbody>
            ${receiptsRows}
            <tr class="totals">
              <td colspan="2">الإجمالي الكلي</td>
              <td>${(customerTotals?.totalRent || 0).toLocaleString('en-US')}</td>
              <td>${(customerTotals?.totalFines || 0).toLocaleString('en-US')}</td>
              <td>${(customerTotals?.total || 0).toLocaleString('en-US')}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المدفوعات</h3>
            <p style="color: #007bff;">${(customerTotals?.total || 0).toLocaleString('en-US')} ريال</p>
          </div>
          <div class="summary-card">
            <h3>إجمالي الغرامات</h3>
            <p style="color: #dc3545;">${(customerTotals?.totalFines || 0).toLocaleString('en-US')} ريال</p>
          </div>
          <div class="summary-card">
            <h3>عدد الإيصالات</h3>
            <p style="color: #28a745;">${customerReceipts.length}</p>
          </div>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 5px;">
            🖨️ طباعة
          </button>
          <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 5px; margin-right: 10px;">
            إغلاق
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    toast.success('تم فتح نافذة الطباعة');
  };

  const handleAddPayment = async () => {
    if (!selectedCustomer) {
      toast.error('الرجاء اختيار عميل أولاً');
      return;
    }

    if (!paymentDate) {
      toast.error('الرجاء اختيار تاريخ الدفع');
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('الرجاء إدخال المبلغ المدفوع');
      return;
    }

    if (paymentMethod !== 'cash' && !selectedBankId) {
      toast.error('الرجاء اختيار الحساب البنكي لطريقة الدفع غير النقدية');
      return;
    }

    // Validate vehicle selection for customers with multiple vehicles
    if (customerVehicles.length > 1 && !selectedVehicleId) {
      toast.error('الرجاء تحديد السيارة - لدى هذا العميل عدة سيارات');
      return;
    }

    // Get vehicle_id: either selected one or the only one available
    const vehicleId = customerVehicles.length === 1 
      ? customerVehicles[0].id 
      : selectedVehicleId;

    // Get contract_id for the selected vehicle
    const contractId = customerVehicles.find(v => v.id === vehicleId)?.contract_id;

    try {
      // Validate payment date before calculating
      if (!paymentDate || isNaN(new Date(paymentDate).getTime())) {
        toast.error('تاريخ الدفع غير صحيح');
        return;
      }

      // Calculate rent, fine, and total due based on payment date
      const { fine, month, rent_amount } = calculateDelayFine(paymentDate, selectedCustomer.monthly_rent);
      
      // Validate calculation result
      if (!month) {
        toast.error('فشل في حساب الشهر من تاريخ الدفع');
        return;
      }

      const totalDue = rent_amount + fine;
      const paidAmount = parseFloat(paymentAmount);
      
      let autoNotes = paymentNotes.trim();
      if (paidAmount > totalDue) {
        const excessAmount = paidAmount - totalDue;
        const advanceNote = `فائض بقيمة ${excessAmount.toLocaleString('en-US')} ر.ق مسجل كدفعة عقد غير موزعة لحين اعتماده على مستند مستحق.`;
        autoNotes = autoNotes ? `${autoNotes}\n\n${advanceNote}` : advanceNote;
      }
      
      // Create receipt via Supabase with partial payment support, notes, vehicle_id, payment_method, and reference_number
      await createReceiptMutation.mutateAsync({
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        month,
        rent_amount,
        payment_date: paymentDate,
        fine,
        total_paid: paidAmount,
        amount_due: totalDue,
        pending_balance: Math.max(0, totalDue - paidAmount),
        payment_status: paidAmount >= totalDue ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'),
        notes: autoNotes || null, // Include notes (user + auto-generated)
        vehicle_id: vehicleId, // Add vehicle_id
        contract_id: contractId, // Add contract_id
        payment_method: paymentMethod, // Add payment_method
        bank_id: selectedBankId || null,
        reference_number: referenceNumber || null, // Add reference_number
        idempotency_key: receiptIdempotencyKey,
      } as any);

      toast.success('تم إضافة الإيصال والدفعة المحاسبية بنجاح ✅');

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId, selectedCustomer.id] });
      await queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId, selectedCustomer.id] });
      await queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', companyId, selectedCustomer.id] });
      await queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });

      // Reset form
      setPaymentAmount('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setDisplayPaymentDate(format(new Date(), 'dd/MM/yyyy'));
      setPaymentNotes('');
      setPaymentMethod('cash');
      setSelectedBankId('');
      setReferenceNumber('');
      setReceiptIdempotencyKey(crypto.randomUUID());
      // Reset vehicle selection for multi-vehicle customers
      if (customerVehicles.length > 1) {
        setSelectedVehicleId(null);
      }
    } catch (error: unknown) {
      console.error('Error adding payment:', error);
      toast.error(error?.message || 'فشل في إضافة الدفعة');
    }
  };

  /**
   * Handle delete receipt with confirmation
   */
  const handleDeleteClick = (receipt: RentalPaymentReceipt) => {
    setReceiptToDelete(receipt);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!receiptToDelete) return;

    try {
      await deleteReceiptMutation.mutateAsync(receiptToDelete.id);
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  /**
   * Handle updating monthly rent - syncs with contract
   */
  const handleEditMonthlyRent = () => {
    if (!selectedCustomer) return;
    setNewMonthlyRent(selectedCustomer.monthly_rent.toString());
    setEditingMonthlyRent(true);
  };

  const handleCancelEditRent = () => {
    setEditingMonthlyRent(false);
    setNewMonthlyRent('');
  };

  const handleSaveMonthlyRent = async () => {
    if (!selectedCustomer || !companyId) return;

    const rentAmount = parseFloat(newMonthlyRent);
    if (isNaN(rentAmount) || rentAmount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح للإيجار الشهري');
      return;
    }

    toast.error(
      'تعديل الإيجار لعقد نشط متوقف لحماية الفواتير والقيود. أنشئ ملحقًا ماليًا معتمدًا بدل تعديل السعر مباشرة.',
    );
    setEditingMonthlyRent(false);
    setNewMonthlyRent('');
  };

  /**
   * Handle editing customer name
   */
  const handleEditCustomerName = () => {
    if (!selectedCustomer) return;
    setEditedCustomerName(selectedCustomer.name);
    setEditingCustomerName(true);
  };

  const handleCancelEditName = () => {
    setEditingCustomerName(false);
    setEditedCustomerName('');
  };

  const handleSaveCustomerName = async () => {
    if (!selectedCustomer || !companyId) return;

    const trimmedName = editedCustomerName.trim();
    if (!trimmedName) {
      toast.error('الرجاء إدخال اسم صحيح للعميل');
      return;
    }

    setIsUpdatingName(true);

    try {
      // Parse the name into first and last name
      const nameParts = trimmedName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Update the customer name in the database
      const { error: customerError } = await supabase
        .from('customers')
        .update({ 
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', selectedCustomer.id)
        .eq('company_id', companyId);

      if (customerError) {
        console.error('Error updating customer name:', customerError);
        throw customerError;
      }

      // Update all rental payment receipts with the new customer name
      // @ts-ignore - Custom table not in generated types
      const { error: receiptsError } = await supabase
        .from('rental_payment_receipts')
        .update({ customer_name: trimmedName })
        .eq('customer_id', selectedCustomer.id)
        .eq('company_id', companyId);

      if (receiptsError) {
        console.error('Error updating receipts with new name:', receiptsError);
        // Don't throw - this is not critical, customer name is updated
        toast.warning('تم تحديث العميل لكن فشل تحديث بعض الإيصالات');
      }

      // Update local state
      setSelectedCustomer({
        ...selectedCustomer,
        name: trimmedName
      });

      // Update search term to match new name
      setSearchTerm(trimmedName);

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId, selectedCustomer.id] });
      await queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });

      toast.success(`تم تحديث اسم العميل إلى "${trimmedName}" ✅`);
      setEditingCustomerName(false);
      setEditedCustomerName('');
    } catch (error: unknown) {
      console.error('Error updating customer name:', error);
      toast.error('فشل في تحديث اسم العميل');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('الرجاء إدخال اسم العميل');
      return;
    }

    if (!newCustomerRent || parseFloat(newCustomerRent) <= 0) {
      toast.error('الرجاء إدخال الإيجار الشهري');
      return;
    }

    if (!companyId) {
      toast.error('خطأ: معلومات الشركة غير متوفرة');
      return;
    }

    setIsCreatingCustomer(true);

    try {
      const nameParts = newCustomerName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      console.log('Creating customer and contract via RPC function:', { firstName, lastName, companyId, rent: newCustomerRent });

      // Use RPC function to create both customer and contract atomically
      // This bypasses RLS issues by using a database function
      const requestKey = quickCustomerRequestKeyRef.current
        ?? (quickCustomerRequestKeyRef.current = `quick-customer:${crypto.randomUUID()}`);
      const { data: result, error: rpcError } = await supabase.rpc('create_customer_with_contract_idempotent', {
        p_company_id: companyId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_monthly_amount: parseFloat(newCustomerRent),
        p_idempotency_key: requestKey,
      });

      if (rpcError) {
        console.error('RPC function error:', rpcError);
        console.error('RPC error details:', {
          code: rpcError.code,
          message: rpcError.message,
          hint: rpcError.hint,
          details: rpcError.details
        });
        
        throw new Error(
          rpcError.message || 
          rpcError.hint || 
          `فشل إنشاء العميل: ${rpcError.code || 'خطأ غير معروف'}`
        );
      }

      console.log('RPC function result:', result);

      // Check if result contains an error (RPC function returning error object instead of throwing)
      if (result && typeof result === 'object' && (result as any).success === false) {
        const errorObj = result as any;
        console.error('RPC function returned error object:', errorObj);
        
        // Handle duplicate key error from RPC function
        if (errorObj.error_code === '23505' && errorObj.error?.includes('customer_code')) {
          console.log('⚠️ Duplicate customer code detected in RPC result');
          console.log('🔄 Automatically falling back to manual creation with unique code...');
          toast.info('جاري إنشاء العميل برمز فريد...', { duration: 2000 });
          throw new Error('رفض إنشاء عميل أو عقد ثانٍ خارج المعاملة الذرية');
          return;
        }
        
        // Throw the error to be caught by the catch block
        throw new Error(errorObj.error || 'فشل إنشاء العميل');
      }

      // Handle different possible result formats
      let customerId: string;
      
      if (typeof result === 'string') {
        // Result is directly the customer_id as a string
        customerId = result;
      } else if (result && typeof result === 'object') {
        // Result is an object, try different property names
        customerId = (result as any).customer_id || (result as any).id || (result as any)[0]?.customer_id || (result as any)[0]?.id;
      } else if (Array.isArray(result) && result.length > 0) {
        // Result is an array
        customerId = result[0].customer_id || result[0].id;
      } else {
        customerId = result as any;
      }

      if (!customerId) {
        console.error('Failed to extract customer_id from result:', result);
        
        // If we can't extract customer_id, fall back to manual creation
        console.log('Unable to extract customer_id, falling back to manual creation...');
        throw new Error('لم تعد الدالة بمعرّف العميل');
        return;
      }

      console.log('Extracted customer_id:', customerId);

      // Create CustomerWithRental object for UI
      const customerWithRental: CustomerWithRental = {
        id: customerId,
        name: `${firstName} ${lastName}`,
        monthly_rent: parseFloat(newCustomerRent)
      };

      // Refresh the customer list and select the new customer
      await queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });

      setSelectedCustomer(customerWithRental);
      setSearchTerm(`${firstName} ${lastName}`);
      
      // Close dialog and reset form
      setShowCreateCustomer(false);
      setNewCustomerName('');
      setNewCustomerRent('');
      quickCustomerRequestKeyRef.current = null;

      toast.success(`تم إنشاء العميل "${firstName} ${lastName}" والعقد بنجاح ✅`);
    } catch (error: unknown) {
      console.error('Error creating customer:', error);
      
      // Handle specific error codes
      let errorMessage = 'فشل إنشاء العميل';
      
      // Ensure we're working with a proper error object
      if (error && typeof error === 'object') {
        if (error?.code === '23505') {
          // Duplicate key violation
          if (error?.message?.includes('customer_code') || error?.message?.includes('customers_company_customer_code_unique')) {
            errorMessage = 'رمز العميل مكرر. جاري إعادة المحاولة...';
            // Automatically retry with manual creation
            try {
              throw new Error('تعذر إنشاء العميل داخل المعاملة الذرية');
              return; // Success via manual creation
            } catch (retryError: any) {
              errorMessage = retryError?.message || 'فشل إنشاء العميل بعد إعادة المحاولة';
            }
          } else if (error?.message?.includes('email')) {
            errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
          } else if (error?.message?.includes('phone')) {
            errorMessage = 'رقم الهاتف مستخدم بالفعل';
          } else {
            errorMessage = 'البيانات مكررة - يرجى التحقق من معلومات العميل';
          }
        } else {
          // Handle other error types with better fallbacks
          errorMessage = error?.message || error?.hint || error?.details || 
                        (error?.toString && error.toString() !== '[object Object]' ? error.toString() : 'فشل إنشاء العميل');
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        // Last resort - try to get a meaningful error message
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch (stringifyError) {
          errorMessage = 'فشل إنشاء العميل - خطأ غير معروف';
        }
      }
      
      // Ensure errorMessage is a string before passing to toast
      const displayMessage = typeof errorMessage === 'string' ? errorMessage : 'فشل إنشاء العميل - خطأ غير معروف';
      toast.error(displayMessage);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">نظام تتبع المدفوعات</h1>
            <HelpIcon
              title={financialHelpContent.financialTracking.title}
              content={financialHelpContent.financialTracking.content}
              examples={financialHelpContent.financialTracking.examples}
              size="md"
            />
          </div>
          <p className="text-muted-foreground mt-1">إدارة مدفوعات إيجار السيارات والغرامات</p>
        </div>
        <DollarSign className="h-12 w-12 text-primary" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customers" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
            <Search className="h-4 w-4" />
            مدفوعات العملاء
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4" />
            الإيرادات الشهرية
          </TabsTrigger>
          <TabsTrigger value="unpaid-by-month" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
            <AlertTriangle className="h-4 w-4" />
            غير المدفوعة بالشهر
          </TabsTrigger>
        </TabsList>

        {/* Customer Payments Tab */}
        <TabsContent value="customers" className="space-y-6 mt-6">
          <CustomerSearchSection
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            showDropdown={showDropdown}
            onShowDropdownChange={setShowDropdown}
            filteredCustomers={filteredCustomers}
            selectedCustomer={selectedCustomer}
            loadingCustomers={loadingCustomers}
            onSelectCustomer={handleSelectCustomer}
            onCreateCustomerClick={(name: string) => {
              setNewCustomerName(name);
              setShowCreateCustomer(true);
              setShowDropdown(false);
            }}
            editingCustomerName={editingCustomerName}
            editedCustomerName={editedCustomerName}
            onEditedCustomerNameChange={setEditedCustomerName}
            onEditCustomerName={handleEditCustomerName}
            onSaveCustomerName={handleSaveCustomerName}
            onCancelEditName={handleCancelEditName}
            isUpdatingName={isUpdatingName}
            editingMonthlyRent={editingMonthlyRent}
            newMonthlyRent={newMonthlyRent}
            onNewMonthlyRentChange={setNewMonthlyRent}
            onEditMonthlyRent={handleEditMonthlyRent}
            onSaveMonthlyRent={handleSaveMonthlyRent}
            onCancelEditRent={handleCancelEditRent}
            isUpdatingRent={isUpdatingRent}
            loadingVehicles={loadingVehicles}
            customerVehicles={customerVehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectedVehicleIdChange={setSelectedVehicleId}
          />

          {selectedCustomer && (
            <PaymentForm
              selectedCustomer={selectedCustomer}
              displayPaymentDate={displayPaymentDate}
              onDisplayPaymentDateChange={handleDisplayDateChange}
              paymentAmount={paymentAmount}
              onPaymentAmountChange={setPaymentAmount}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              banks={banks}
              selectedBankId={selectedBankId}
              onSelectedBankIdChange={setSelectedBankId}
              referenceNumber={referenceNumber}
              onReferenceNumberChange={setReferenceNumber}
              paymentNotes={paymentNotes}
              onPaymentNotesChange={setPaymentNotes}
              paymentDate={paymentDate}
              onSubmit={handleAddPayment}
              isSubmitting={createReceiptMutation.isPending}
              customerVehicles={customerVehicles}
              selectedVehicleId={selectedVehicleId}
            />
          )}

          <PaymentHistoryTable
            selectedCustomer={selectedCustomer}
            customerReceipts={customerReceipts}
            customerTotals={customerTotals}
            totalsData={totalsData}
            unpaidMonths={unpaidMonths}
            onExportToExcel={exportToExcel}
            onPrintAllReceipts={printAllReceipts}
            onPrintReceipt={printReceipt}
            onDeleteClick={handleDeleteClick}
          />
        </TabsContent>

        {/* Monthly Revenue Tab */}
        <TabsContent value="monthly" className="space-y-6 mt-6">
          <MonthlyRevenueTab
            loading={loadingAllReceipts}
            filteredMonthlySummary={filteredMonthlySummary}
            monthlySummary={monthlySummary}
            selectedMonthFilter={selectedMonthFilter}
            onMonthFilterChange={setSelectedMonthFilter}
          />
        </TabsContent>

        {/* Unpaid by Month Tab */}
        <TabsContent value="unpaid-by-month" className="space-y-6 mt-6">
          <UnpaidByMonthView 
            companyId={companyId}
          />
        </TabsContent>
      </Tabs>

      {/* Create New Customer Dialog */}
      <CreateCustomerDialog
        open={showCreateCustomer}
        onOpenChange={(nextOpen) => {
          setShowCreateCustomer(nextOpen);
          if (!nextOpen) quickCustomerRequestKeyRef.current = null;
        }}
        customerName={newCustomerName}
        onCustomerNameChange={setNewCustomerName}
        customerRent={newCustomerRent}
        onCustomerRentChange={setNewCustomerRent}
        onSubmit={handleCreateCustomer}
        isCreating={isCreatingCustomer}
      />

      {/* Delete Receipt Confirmation Dialog */}
      <DeleteReceiptDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        receipt={receiptToDelete}
        onConfirm={confirmDeleteReceipt}
        isDeleting={deleteReceiptMutation.isPending}
      />
    </div>
  );
};

const FinancialTracking: React.FC = () => {
  return (
    <ErrorBoundary>
      <FinancialTrackingInner />
    </ErrorBoundary>
  )
};

export default FinancialTracking;
