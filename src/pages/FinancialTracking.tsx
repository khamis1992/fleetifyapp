import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Plus, Calendar, DollarSign, AlertTriangle, Download, Printer, FileSpreadsheet, Loader2, TrendingUp, AlertCircle, Clock, Filter, X, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  useRentalPaymentReceipts,
  useCustomersWithRental,
  useCustomerPaymentTotals,
  useCreateRentalReceipt,
  useCustomerOutstandingBalance,
  useCustomerUnpaidMonths,
  calculateDelayFine,
  type CustomerWithRental,
  type RentalPaymentReceipt
} from '@/hooks/useRentalPayments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQueryClient } from '@tanstack/react-query';

const DELAY_FINE_PER_DAY = 120; // QAR
const MAX_FINE_PER_MONTH = 3000; // QAR

const FinancialTracking: React.FC = () => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRental | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Date range filter state
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // New customer creation state
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerRent, setNewCustomerRent] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Fetch customers with rental info from Supabase
  const { data: allCustomers = [], isLoading: loadingCustomers } = useCustomersWithRental();
  
  // Fetch ALL receipts for company (for monthly summaries)
  const { data: allReceipts = [], isLoading: loadingAllReceipts } = useRentalPaymentReceipts();
  
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

  // Calculate monthly revenue summary
  const monthlySummary = useMemo(() => {
    const summary: Record<string, { month: string; rent: number; fines: number; total: number; count: number }> = {};
    
    allReceipts.forEach(receipt => {
      const date = parseISO(receipt.payment_date);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMMM yyyy', { locale: ar });
      
      if (!summary[monthKey]) {
        summary[monthKey] = {
          month: monthLabel,
          rent: 0,
          fines: 0,
          total: 0,
          count: 0
        };
      }
      
      summary[monthKey].rent += receipt.rent_amount;
      summary[monthKey].fines += receipt.fine;
      summary[monthKey].total += receipt.total_paid;
      summary[monthKey].count += 1;
    });
    
    // Convert to array and sort by month (newest first)
    return Object.entries(summary)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ ...data, monthKey: key }));
  }, [allReceipts]);

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
      receipt.month,
      format(new Date(receipt.payment_date), 'dd/MM/yyyy', { locale: ar }),
      receipt.rent_amount.toString(),
      receipt.fine.toString(),
      receipt.total_paid.toString()
    ]);

    // Add totals row
    rows.push([
      'الإجمالي',
      '',
      customerTotals.totalRent.toString(),
      customerTotals.totalFines.toString(),
      customerTotals.total.toString()
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
   * Print receipt for a specific payment
   */
  const printReceipt = (receipt: RentalPaymentReceipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('الرجاء السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال دفع - ${receipt.customer_name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
          }
          .info-item {
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .info-item label {
            display: block;
            font-weight: bold;
            color: #666;
            font-size: 12px;
            margin-bottom: 5px;
          }
          .info-item value {
            display: block;
            font-size: 16px;
            color: #333;
          }
          .summary {
            border-top: 2px solid #333;
            padding-top: 20px;
            margin-top: 30px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .summary-row.total {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #333;
            margin-top: 10px;
          }
          .fine-badge {
            background: #fee;
            color: #c00;
            padding: 5px 10px;
            border-radius: 5px;
            font-weight: bold;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚗 نظام تتبع المدفوعات</h1>
          <p>إيصال دفع إيجار سيارة</p>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <label>اسم العميل</label>
            <value>${receipt.customer_name}</value>
          </div>
          <div class="info-item">
            <label>رقم الإيصال</label>
            <value>${receipt.id.substring(0, 8)}</value>
          </div>
          <div class="info-item">
            <label>الشهر</label>
            <value>${receipt.month}</value>
          </div>
          <div class="info-item">
            <label>تاريخ الدفع</label>
            <value>${format(new Date(receipt.payment_date), 'dd MMMM yyyy', { locale: ar })}</value>
          </div>
        </div>

        <div class="summary">
          <div class="summary-row">
            <span>الإيجار الشهري</span>
            <span>${receipt.rent_amount.toLocaleString('ar-QA')} ريال</span>
          </div>
          ${receipt.fine > 0 ? `
          <div class="summary-row">
            <span>غرامة التأخير</span>
            <span class="fine-badge">${receipt.fine.toLocaleString('ar-QA')} ريال</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>الإجمالي المدفوع</span>
            <span>${receipt.total_paid.toLocaleString('ar-QA')} ريال</span>
          </div>
        </div>

        ${receipt.fine > 0 ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; color: #856404;">
            <strong>⚠️ ملاحظة:</strong> تم احتساب غرامة تأخير بسبب الدفع بعد موعد الاستحقاق (يوم 1 من الشهر).
          </p>
        </div>
        ` : ''}

        <div class="footer">
          <p>تم الطباعة بتاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
          <p>هذا الإيصال تم إنشاؤه آلياً من نظام تتبع المدفوعات</p>
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
        <td>${receipt.month}</td>
        <td>${format(new Date(receipt.payment_date), 'dd/MM/yyyy', { locale: ar })}</td>
        <td>${receipt.rent_amount.toLocaleString('ar-QA')}</td>
        <td style="color: ${receipt.fine > 0 ? '#c00' : '#666'};">${receipt.fine.toLocaleString('ar-QA')}</td>
        <td style="font-weight: bold;">${receipt.total_paid.toLocaleString('ar-QA')}</td>
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
          <p><strong>الإيجار الشهري:</strong> ${selectedCustomer.monthly_rent.toLocaleString('ar-QA')} ريال</p>
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
              <td>${customerTotals.totalRent.toLocaleString('ar-QA')}</td>
              <td>${customerTotals.totalFines.toLocaleString('ar-QA')}</td>
              <td>${customerTotals.total.toLocaleString('ar-QA')}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المدفوعات</h3>
            <p style="color: #007bff;">${customerTotals.total.toLocaleString('ar-QA')} ريال</p>
          </div>
          <div class="summary-card">
            <h3>إجمالي الغرامات</h3>
            <p style="color: #dc3545;">${customerTotals.totalFines.toLocaleString('ar-QA')} ريال</p>
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

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (!paymentDate) {
      toast.error('الرجاء اختيار تاريخ الدفع');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const { fine, month, rent_amount } = calculateDelayFine(paymentDate, selectedCustomer.monthly_rent);
    
    // Create receipt via Supabase
    await createReceiptMutation.mutateAsync({
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      month,
      rent_amount,
      payment_date: paymentDate,
      fine,
      total_paid: amount
    });

    // Reset form
    setPaymentAmount('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
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

      console.log('Step 1: Creating customer:', { firstName, lastName, companyId });

      // STEP 1: Create customer WITHOUT .select() to avoid RLS issues
      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          customer_type: 'individual',
          phone: '000000000',
          company_id: companyId,
          is_active: true
        });

      if (customerError) {
        console.error('Customer creation error:', customerError);
        throw new Error(
          customerError.message || 
          customerError.hint || 
          `فشل إنشاء العميل: ${customerError.code || 'خطأ غير معروف'}`
        );
      }

      console.log('Step 2: Customer inserted, now fetching ID...');

      // STEP 2: Wait and fetch the customer ID separately
      // This works better with RLS policies
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const { data: fetchedCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Step 3: Fetch result:', { data: fetchedCustomer, error: fetchError });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(`فشل في الحصول على معرف العميل: ${fetchError.message}`);
      }
      
      if (!fetchedCustomer || !fetchedCustomer.id) {
        console.error('No customer found after insert');
        throw new Error('فشل إنشاء العميل: لم يتم العثور على العميل - يرجى التحقق من أذونات الوصول أو المحاولة مرة أخرى');
      }
      
      const customerId = fetchedCustomer.id;
      console.log('Step 4: Customer created successfully with ID:', customerId);

      // STEP 3: Create contract with the fetched customer ID
      const contractNumber = `CNT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

      console.log('Step 5: Creating contract for customer ID:', customerId);
      
      const { error: contractError } = await supabase
        .from('contracts')
        .insert({
          customer_id: customerId,
          contract_number: contractNumber,
          contract_date: startDate,
          start_date: startDate,
          end_date: endDate,
          company_id: companyId,
          contract_type: 'vehicle_rental',
          monthly_amount: parseFloat(newCustomerRent),
          status: 'active'
        });

      if (contractError) {
        console.error('Contract creation error:', contractError);
        // Try to clean up - delete the customer if contract creation fails
        await supabase.from('customers').delete().eq('id', customerId);
        throw new Error(
          contractError.message || 
          contractError.hint || 
          `فشل إنشاء العقد: ${contractError.code || 'خطأ غير معروف'}`
        );
      }

      console.log('Step 6: Contract created successfully');

      // STEP 4: Create the CustomerWithRental object for UI
      const customerWithRental: CustomerWithRental = {
        id: customerId,
        name: `${firstName} ${lastName}`,
        monthly_rent: parseFloat(newCustomerRent)
      };

      // STEP 5: Refresh the customer list and select the new customer
      await queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });

      setSelectedCustomer(customerWithRental);
      setSearchTerm(`${firstName} ${lastName}`);
      
      // Close dialog and reset form
      setShowCreateCustomer(false);
      setNewCustomerName('');
      setNewCustomerRent('');

      toast.success(`تم إنشاء العميل "${firstName} ${lastName}" والعقد بنجاح ✅`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      const errorMessage = error?.message || error?.hint || error?.details || 'فشل إنشاء العميل';
      toast.error(errorMessage);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">نظام تتبع المدفوعات</h1>
          <p className="text-muted-foreground mt-1">إدارة مدفوعات إيجار السيارات والغرامات</p>
        </div>
        <DollarSign className="h-12 w-12 text-primary" />
      </div>

      {/* Tabs: Customer Payments vs Monthly Revenue */}
      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            مدفوعات العملاء
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الإيرادات الشهرية
          </TabsTrigger>
        </TabsList>

        {/* Customer Payments Tab */}
        <TabsContent value="customers" className="space-y-6 mt-6">

      {/* Customer Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            البحث عن عميل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="ابحث عن عميل... (مثال: محمد)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="text-lg"
              disabled={loadingCustomers}
            />
            
            {loadingCustomers && (
              <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-white border rounded-md shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">جاري التحميل...</span>
                </div>
              </div>
            )}
            {/* Dropdown */}
            {showDropdown && searchTerm.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {customer.monthly_rent.toLocaleString('ar-QA')} ريال/شهر
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      لم يتم العثور على عميل باسم "{searchTerm}"
                    </p>
                    <Button
                      onClick={() => {
                        setNewCustomerName(searchTerm);
                        setShowCreateCustomer(true);
                        setShowDropdown(false);
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إنشاء عميل جديد: {searchTerm}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">العميل المحدد</p>
                  <p className="text-xl font-bold">{selectedCustomer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">الإيجار الشهري</p>
                  <p className="text-xl font-bold text-primary">{selectedCustomer.monthly_rent.toLocaleString('ar-QA')} ريال</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Form */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة دفعة جديدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="paymentAmount">المبلغ المدفوع (ريال)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="مثال: 5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="paymentDate">تاريخ الدفع</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleAddPayment} 
                  className="w-full"
                  disabled={createReceiptMutation.isPending}
                >
                  {createReceiptMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة الدفعة
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Fine Calculation Info */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-900">نظام حساب الغرامات:</p>
                  <ul className="mt-2 space-y-1 text-yellow-800">
                    <li>• موعد الاستحقاق: يوم 1 من كل شهر</li>
                    <li>• غرامة التأخير: {DELAY_FINE_PER_DAY} ريال لكل يوم</li>
                    <li>• الحد الأقصى للغرامة: {MAX_FINE_PER_MONTH} ريال للشهر الواحد</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Summary & Payment History */}
      {selectedCustomer && customerReceipts.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
                  <p className="text-3xl font-bold text-primary mt-2">
                    {customerTotals.total.toLocaleString('ar-QA')} ريال
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">إجمالي الغرامات</p>
                  <p className="text-3xl font-bold text-destructive mt-2">
                    {customerTotals.totalFines.toLocaleString('ar-QA')} ريال
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">عدد الإيصالات</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {customerReceipts.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Balance Section */}
          {outstandingBalance && outstandingBalance.outstanding_balance > 0 && (
            <Card className="border-destructive">
              <CardHeader className="bg-destructive/10">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  الرصيد المستحق
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المتوقع</p>
                    <p className="text-2xl font-bold mt-1">
                      {outstandingBalance.expected_total.toLocaleString('ar-QA')} ريال
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المدفوع</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {outstandingBalance.total_paid.toLocaleString('ar-QA')} ريال
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المتبقي</p>
                    <p className="text-3xl font-bold text-destructive mt-1">
                      {outstandingBalance.outstanding_balance.toLocaleString('ar-QA')} ريال
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">أشهر غير مدفوعة</p>
                    <p className="text-3xl font-bold text-destructive mt-1">
                      {outstandingBalance.unpaid_month_count}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-muted-foreground">الأشهر المتوقعة</p>
                    <p className="font-semibold mt-1">{outstandingBalance.months_expected} شهر</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-muted-foreground">الأشهر المدفوعة</p>
                    <p className="font-semibold mt-1">{outstandingBalance.months_paid} شهر</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unpaid Months List with Red Highlighting */}
          {unpaidMonths.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="bg-destructive/10">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Clock className="h-5 w-5" />
                  ⚠️ أشهر غير مدفوعة ({unpaidMonths.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الشهر</TableHead>
                      <TableHead className="text-right">الشهر</TableHead>
                      <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">أيام التأخير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidMonths.map((month) => (
                      <TableRow 
                        key={month.month_number}
                        className={month.is_overdue ? 'bg-destructive/10 hover:bg-destructive/20' : 'bg-yellow-50 hover:bg-yellow-100'}
                      >
                        <TableCell className="font-semibold">
                          <Badge variant="outline">{month.month_number}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {month.month_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(month.expected_date), 'dd MMMM yyyy', { locale: ar })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {month.is_overdue ? (
                            <Badge variant="destructive" className="font-semibold">
                              متأخر
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500 text-white font-semibold">
                              قادم
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {month.days_overdue > 0 ? (
                            <span className="text-destructive font-bold text-lg">
                              {month.days_overdue} يوم
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {unpaidMonths.filter(m => m.is_overdue).length > 0 && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-destructive">تنبيه: يوجد {unpaidMonths.filter(m => m.is_overdue).length} شهر متأخر</p>
                        <p className="text-destructive/80 mt-1">
                          يرجى سداد المدفوعات المتأخرة في أقرب وقت ممكن لتجنب غرامات إضافية.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment History Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>سجل المدفوعات - {selectedCustomer.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <FileSpreadsheet className="h-4 w-4 ml-2" />
                    تصدير Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={printAllReceipts}>
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة الكل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الشهر</TableHead>
                    <TableHead className="text-right">تاريخ الدفع</TableHead>
                    <TableHead className="text-right">الإيجار</TableHead>
                    <TableHead className="text-right">الغرامة</TableHead>
                    <TableHead className="text-right">الإجمالي المدفوع</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.month}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(receipt.payment_date), 'dd MMMM yyyy', { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {receipt.rent_amount.toLocaleString('ar-QA')} ريال
                        </span>
                      </TableCell>
                      <TableCell>
                        {receipt.fine > 0 ? (
                          <Badge variant="destructive" className="font-semibold">
                            {receipt.fine.toLocaleString('ar-QA')} ريال
                          </Badge>
                        ) : (
                          <Badge variant="secondary">لا يوجد</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-bold text-primary">
                          {receipt.total_paid.toLocaleString('ar-QA')} ريال
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printReceipt(receipt)}
                          title="طباعة الإيصال"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {selectedCustomer && customerReceipts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">لا توجد مدفوعات مسجلة لهذا العميل</p>
              <p className="text-sm mt-2">قم بإضافة أول دفعة باستخدام النموذج أعلاه</p>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Monthly Revenue Tab */}
        <TabsContent value="monthly" className="space-y-6 mt-6">
          {/* Monthly Summary Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                الإيرادات الشهرية - ملخص
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAllReceipts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="mr-2">جاري التحميل...</span>
                </div>
              ) : monthlySummary.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">لا توجد بيانات شهرية بعد</p>
                  <p className="text-sm mt-2">قم بإضافة مدفوعات للعملاء لرؤية الإحصائيات</p>
                </div>
              ) : (
                <>
                  {/* Total Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                          <p className="text-3xl font-bold text-primary mt-2">
                            {monthlySummary.reduce((sum, m) => sum + m.total, 0).toLocaleString('ar-QA')} ريال
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">إجمالي الإيجار</p>
                          <p className="text-3xl font-bold text-blue-600 mt-2">
                            {monthlySummary.reduce((sum, m) => sum + m.rent, 0).toLocaleString('ar-QA')} ريال
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">إجمالي الغرامات</p>
                          <p className="text-3xl font-bold text-destructive mt-2">
                            {monthlySummary.reduce((sum, m) => sum + m.fines, 0).toLocaleString('ar-QA')} ريال
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">عدد الإيصالات</p>
                          <p className="text-3xl font-bold text-green-600 mt-2">
                            {monthlySummary.reduce((sum, m) => sum + m.count, 0).toLocaleString('ar-QA')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Breakdown Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الشهر</TableHead>
                        <TableHead className="text-right">عدد الإيصالات</TableHead>
                        <TableHead className="text-right">إيرادات الإيجار</TableHead>
                        <TableHead className="text-right">الغرامات</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySummary.map((monthData) => (
                        <TableRow key={monthData.monthKey}>
                          <TableCell className="font-bold">{monthData.month}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {monthData.count.toLocaleString('ar-QA')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              {monthData.rent.toLocaleString('ar-QA')} ريال
                            </span>
                          </TableCell>
                          <TableCell>
                            {monthData.fines > 0 ? (
                              <Badge variant="destructive">
                                {monthData.fines.toLocaleString('ar-QA')} ريال
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-bold text-primary">
                              {monthData.total.toLocaleString('ar-QA')} ريال
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create New Customer Dialog */}
      <Dialog open={showCreateCustomer} onOpenChange={setShowCreateCustomer}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              إنشاء عميل جديد
            </DialogTitle>
            <DialogDescription>
              قم بإدخال بيانات العميل الجديد للبدء في تتبع مدفوعاته
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">اسم العميل</Label>
              <Input
                id="customer-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="مثال: محمد أحمد"
                disabled={isCreatingCustomer}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-rent">الإيجار الشهري (ريال)</Label>
              <Input
                id="monthly-rent"
                type="number"
                value={newCustomerRent}
                onChange={(e) => setNewCustomerRent(e.target.value)}
                placeholder="مثال: 5000"
                disabled={isCreatingCustomer}
                className="text-lg"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>ملاحظة:</strong> سيتم إنشاء عقد إيجار سيارة تلقائياً لهذا العميل. يمكنك تعديل العقد لاحقاً من صفحة العقود.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateCustomer(false);
                setNewCustomerName('');
                setNewCustomerRent('');
              }}
              disabled={isCreatingCustomer}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={isCreatingCustomer || !newCustomerName.trim() || !newCustomerRent}
            >
              {isCreatingCustomer ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 ml-2" />
                  إنشاء العميل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialTracking;
