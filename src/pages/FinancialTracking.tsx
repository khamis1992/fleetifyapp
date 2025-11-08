// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Search, Plus, Calendar, DollarSign, AlertTriangle, Download, Printer, FileSpreadsheet, Loader2, TrendingUp, AlertCircle, Clock, Filter, X, UserPlus, Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { format, startOfMonth, endOfMonth } from 'date-fns';
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
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';

const DELAY_FINE_PER_DAY = 120; // QAR
const MAX_FINE_PER_MONTH = 3000; // QAR

/**
 * Component to show all customers who didn't pay in a specific month
 */
interface UnpaidByMonthViewProps {
  allCustomers: CustomerWithRental[];
  allReceipts: RentalPaymentReceipt[];
  companyId: string | null;
}

const UnpaidByMonthView: React.FC<UnpaidByMonthViewProps> = ({ allCustomers, allReceipts, companyId }) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM') // Default to current month
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<number>(new Date().getMonth() + 1);

  // Generate list of years (current year and 2 years back)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  // Months in Arabic
  const months = [
    { number: 1, name: 'يناير' },
    { number: 2, name: 'فبراير' },
    { number: 3, name: 'مارس' },
    { number: 4, name: 'أبريل' },
    { number: 5, name: 'مايو' },
    { number: 6, name: 'يونيو' },
    { number: 7, name: 'يوليو' },
    { number: 8, name: 'أغسطس' },
    { number: 9, name: 'سبتمبر' },
    { number: 10, name: 'أكتوبر' },
    { number: 11, name: 'نوفمبر' },
    { number: 12, name: 'ديسمبر' }
  ];

  // Calculate unpaid customers for selected month
  const unpaidCustomers = useMemo(() => {
    if (!allCustomers || !allReceipts) return [];

    const targetMonth = `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}`;
    
    return allCustomers
      .map((customer) => {
        // Check if customer has paid for this month
        const hasPaidForMonth = allReceipts.some((receipt) => {
          const receiptMonth = receipt.payment_date ? format(new Date(receipt.payment_date), 'yyyy-MM') : '';
          return (
            receipt.customer_id === customer.id &&
            receiptMonth === targetMonth &&
            receipt.payment_status === 'paid'
          );
        });

        // Check if customer has partial payment for this month
        const hasPartialPayment = allReceipts.some((receipt) => {
          const receiptMonth = receipt.payment_date ? format(new Date(receipt.payment_date), 'yyyy-MM') : '';
          return (
            receipt.customer_id === customer.id &&
            receiptMonth === targetMonth &&
            receipt.payment_status === 'partial'
          );
        });

        if (!hasPaidForMonth) {
          return {
            ...customer,
            status: hasPartialPayment ? 'partial' : 'unpaid',
            partialAmount: hasPartialPayment
              ? allReceipts
                  .filter(r => {
                    const receiptMonth = r.payment_date ? format(new Date(r.payment_date), 'yyyy-MM') : '';
                    return r.customer_id === customer.id && receiptMonth === targetMonth;
                  })
                  .reduce((sum, r) => sum + r.total_paid, 0)
              : 0
          };
        }
        return null;
      })
      .filter((c): c is CustomerWithRental & { status: string; partialAmount: number } => c !== null)
      .sort((a, b) => b.monthly_rent - a.monthly_rent); // Sort by rent amount (highest first)
  }, [allCustomers, allReceipts, selectedYear, selectedMonthNumber]);

  // Calculate total unpaid amount
  const totalUnpaidAmount = useMemo(() => {
    return unpaidCustomers.reduce((sum, customer) => {
      const amountDue = customer.monthly_rent - customer.partialAmount;
      return sum + amountDue;
    }, 0);
  }, [unpaidCustomers]);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonthNumber(month);
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const selectedMonthName = months.find(m => m.number === selectedMonthNumber)?.name || '';

  return (
    <div className="space-y-6">
      {/* Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            اختر الشهر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Year Selection */}
            <div className="space-y-2">
              <Label>السنة</Label>
              <div className="grid grid-cols-3 gap-2">
                {years.map((year) => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? 'default' : 'outline'}
                    onClick={() => handleMonthChange(year, selectedMonthNumber)}
                    className="w-full"
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>

            {/* Month Selection */}
            <div className="space-y-2">
              <Label>الشهر</Label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month) => (
                  <Button
                    key={month.number}
                    variant={selectedMonthNumber === month.number ? 'default' : 'outline'}
                    onClick={() => handleMonthChange(selectedYear, month.number)}
                    className="text-sm"
                  >
                    {month.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Month Display */}
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <p className="text-center text-lg font-bold">
              الفترة المختارة: {selectedMonthName} {selectedYear}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">عدد العملاء غير المدفوعين</p>
              <p className="text-4xl font-bold text-destructive mt-2">
                {unpaidCustomers.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                من إجمالي {allCustomers.length} عميل
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">إجمالي المبلغ غير المدفوع</p>
              <p className="text-3xl font-bold text-destructive mt-2">
                {totalUnpaidAmount.toLocaleString('ar-QA')} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">الدفعات الجزئية</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {unpaidCustomers.filter(c => c.status === 'partial').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            العملاء الذين لم يدفعوا في {selectedMonthName} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                رائع! جميع العملاء دفعوا
              </h3>
              <p className="text-gray-600">
                جميع العملاء قاموا بالدفع في {selectedMonthName} {selectedYear}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">اسم العميل</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
                    <TableHead className="text-right">المدفوع جزئياً</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidCustomers.map((customer, index) => {
                    const amountDue = customer.monthly_rent - customer.partialAmount;
                    const isPartial = customer.status === 'partial';
                    
                    return (
                      <TableRow 
                        key={customer.id}
                        className={isPartial ? 'bg-orange-50/50' : 'bg-destructive/5'}
                      >
                        <TableCell className="font-semibold">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-lg">
                          {customer.name}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">
                            {customer.monthly_rent.toLocaleString('ar-QA')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          {isPartial ? (
                            <span className="font-semibold text-orange-600">
                              {customer.partialAmount.toLocaleString('ar-QA')} ريال
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-destructive text-lg">
                            {amountDue.toLocaleString('ar-QA')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          {isPartial ? (
                            <Badge className="bg-orange-500 text-white">
                              دفع جزئي
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              غير مدفوع
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/financial-tracking?customer=${customer.id}`)}
                          >
                            <DollarSign className="h-4 w-4 ml-2" />
                            إضافة دفعة
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Export Buttons */}
          {unpaidCustomers.length > 0 && (
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

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
  const [referenceNumber, setReferenceNumber] = useState(''); // Reference/check number
  
  // Date range filter state
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // New customer creation state
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerRent, setNewCustomerRent] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
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
            <value>${(receipt as any).receipt_number || receipt.id.substring(0, 8)}</value>
          </div>
          <div class="info-item">
            <label>طريقة الدفع</label>
            <value>${
              (receipt as any).payment_method === 'cash' ? 'نقداً' :
              (receipt as any).payment_method === 'bank_transfer' ? 'تحويل بنكي' :
              (receipt as any).payment_method === 'check' ? 'شيك' :
              (receipt as any).payment_method === 'credit_card' ? 'بطاقة ائتمان' :
              (receipt as any).payment_method === 'debit_card' ? 'بطاقة مدين' :
              'غير محدد'
            }</value>
          </div>
          ${(receipt as any).reference_number ? `
          <div class="info-item">
            <label>رقم المرجع</label>
            <value>${(receipt as any).reference_number}</value>
          </div>
          ` : ''}
          <div class="info-item">
            <label>الشهر</label>
            <value>${receipt.month}</value>
          </div>
          <div class="info-item">
            <label>تاريخ الدفع</label>
            <value>${receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime()) 
              ? format(new Date(receipt.payment_date), 'dd MMMM yyyy', { locale: ar })
              : 'تاريخ غير متاح'
            }</value>
          </div>
        </div>

        <div class="summary">
          <div class="summary-row">
            <span>الإيجار الشهري</span>
            <span>${(receipt.rent_amount || 0).toLocaleString('ar-QA')} ريال</span>
          </div>
          ${receipt.fine > 0 ? `
          <div class="summary-row">
            <span>غرامة التأخير</span>
            <span class="fine-badge">${(receipt.fine || 0).toLocaleString('ar-QA')} ريال</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>الإجمالي المدفوع</span>
            <span>${(receipt.total_paid || 0).toLocaleString('ar-QA')} ريال</span>
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
        <td>${receipt.month || '-'}</td>
        <td>${receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime())
          ? format(new Date(receipt.payment_date), 'dd/MM/yyyy', { locale: ar })
          : 'تاريخ غير متاح'
        }</td>
        <td>${(receipt.rent_amount || 0).toLocaleString('ar-QA')}</td>
        <td style="color: ${receipt.fine > 0 ? '#c00' : '#666'};">${(receipt.fine || 0).toLocaleString('ar-QA')}</td>
        <td style="font-weight: bold;">${(receipt.total_paid || 0).toLocaleString('ar-QA')}</td>
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
          <p><strong>الإيجار الشهري:</strong> ${(selectedCustomer?.monthly_rent || 0).toLocaleString('ar-QA')} ريال</p>
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
              <td>${(customerTotals?.totalRent || 0).toLocaleString('ar-QA')}</td>
              <td>${(customerTotals?.totalFines || 0).toLocaleString('ar-QA')}</td>
              <td>${(customerTotals?.total || 0).toLocaleString('ar-QA')}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المدفوعات</h3>
            <p style="color: #007bff;">${(customerTotals?.total || 0).toLocaleString('ar-QA')} ريال</p>
          </div>
          <div class="summary-card">
            <h3>إجمالي الغرامات</h3>
            <p style="color: #dc3545;">${(customerTotals?.totalFines || 0).toLocaleString('ar-QA')} ريال</p>
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
      
      let autoNotes = paymentNotes.trim(); // Start with user notes
      let previousMonthUpdated = null;

      // LATE FEE CLEARING LOGIC
      // Check if payment covers previous month's late fee
      if (paidAmount > totalDue && companyId) {
        // Fetch receipts from previous months with unpaid late fees
        // @ts-expect-error - Supabase type issue
        const { data: previousReceipts, error: fetchError } = await supabase
          .from('rental_payment_receipts')
          .select('*')
          .eq('customer_id', selectedCustomer.id)
          .eq('company_id', companyId)
          .gt('fine', 0)
          .gt('pending_balance', 0)
          .order('payment_date', { ascending: false })
          .limit(10);

        if (!fetchError && previousReceipts && previousReceipts.length > 0) {
          // Sort by date to get the most recent unpaid late fee
          const receiptsWithUnpaidFines = (previousReceipts as any[]).filter(
            receipt => receipt.pending_balance >= receipt.fine && receipt.fine > 0
          );

          if (receiptsWithUnpaidFines.length > 0) {
            const previousReceipt = receiptsWithUnpaidFines[0];
            const excessAmount = paidAmount - totalDue;

            // Check if excess amount covers the previous month's late fee
            if (excessAmount >= previousReceipt.fine) {
              // Clear the previous month's late fee
              const newPendingBalance = Math.max(0, previousReceipt.pending_balance - previousReceipt.fine);
              const newPaymentStatus = newPendingBalance === 0 ? 'paid' : 'partial';
              
              // Update previous receipt to clear the late fee
              const clearedFeeNote = `تم دفع غرامة التأخير (${previousReceipt.fine.toLocaleString('ar-QA')} ريال) من شهر ${previousReceipt.month} في تاريخ ${format(new Date(paymentDate), 'dd/MM/yyyy')}`;
              
              const previousNotes = previousReceipt.notes ? `${previousReceipt.notes}\n\n${clearedFeeNote}` : clearedFeeNote;

              // @ts-expect-error - Supabase type issue
              const { error: updateError } = await supabase
                .from('rental_payment_receipts')
                .update({
                  pending_balance: newPendingBalance,
                  payment_status: newPaymentStatus,
                  notes: previousNotes,
                  updated_at: new Date().toISOString()
                })
                .eq('id', previousReceipt.id);

              if (!updateError) {
                previousMonthUpdated = previousReceipt.month;
                // Add auto-note to current payment
                const currentPaymentNote = `تم تطبيق ${excessAmount.toLocaleString('ar-QA')} ريال لسداد غرامة شهر ${previousReceipt.month} (${previousReceipt.fine.toLocaleString('ar-QA')} ريال)`;
                autoNotes = autoNotes ? `${autoNotes}\n\n${currentPaymentNote}` : currentPaymentNote;
                
                console.log(`✅ Cleared late fee of ${previousReceipt.fine} QAR from ${previousReceipt.month}`);
              } else {
                console.error('Error updating previous receipt:', updateError);
              }
            }
          }
        }
      }
      
      // Create receipt via Supabase with partial payment support, notes, vehicle_id, payment_method, and reference_number
      const createdReceipt = await createReceiptMutation.mutateAsync({
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
        reference_number: referenceNumber || null // Add reference_number
      } as any);

      // Create invoice for this rental payment if contract_id exists
      if (contractId && companyId && createdReceipt) {
        try {
          const { generateInvoiceNumber } = await import('@/utils/createInvoiceForPayment');
          const invoiceNumber = await generateInvoiceNumber(companyId);
          
          // Get the receipt number from the created receipt
          const receiptNumber = createdReceipt.receipt_number || 'N/A';
          
          // Create invoice description
          const description = `إيصال دفع رقم ${receiptNumber} - ${month} - ${selectedCustomer.name}`;
          const invoiceNotes = `مبلغ الإيجار: ${rent_amount.toFixed(3)} د.ك\nغرامة التأخير: ${fine.toFixed(3)} د.ك\nالإجمالي: ${paidAmount.toFixed(3)} د.ك`;

          // Create the invoice
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              company_id: companyId,
              invoice_number: invoiceNumber,
              customer_id: selectedCustomer.id,
              contract_id: contractId,
              invoice_date: paymentDate,
              due_date: paymentDate,
              total_amount: paidAmount,
              tax_amount: 0,
              subtotal: paidAmount,
              status: 'paid',
              invoice_type: 'rental',
              description: description,
              notes: invoiceNotes,
              payment_terms: 'مدفوع',
              currency: 'QAR'
            })
            .select('id, invoice_number')
            .single();

          if (!invoiceError && invoice) {
            // Create invoice item
            await supabase
              .from('invoice_items')
              .insert({
                invoice_id: invoice.id,
                item_description: description,
                quantity: 1,
                unit_price: paidAmount,
                line_total: paidAmount,
                tax_rate: 0,
                tax_amount: 0
              });

            // Link the rental payment receipt to the invoice
            await supabase
              .from('rental_payment_receipts')
              .update({ invoice_id: invoice.id })
              .eq('id', createdReceipt.id);

            console.log('✅ Invoice created for rental payment:', invoice.invoice_number);
          } else if (invoiceError) {
            console.error('Error creating invoice for rental payment:', invoiceError);
          }
        } catch (invoiceCreationError) {
          console.error('Exception creating invoice for rental payment:', invoiceCreationError);
          // Don't fail the payment if invoice creation fails
        }
      }

      // Show success message with late fee clearing info
      if (previousMonthUpdated) {
        toast.success(`تم إضافة الدفعة بنجاح ✅\nتم تسوية غرامة شهر ${previousMonthUpdated}`, { duration: 4000 });
      } else {
        toast.success('تم إضافة الدفعة بنجاح ✅');
      }

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
      setReferenceNumber('');
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

    setIsUpdatingRent(true);

    try {
      // Step 1: Update the contract's monthly_amount
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ monthly_amount: rentAmount })
        .eq('customer_id', selectedCustomer.id)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (contractError) {
        console.error('Error updating contract monthly rent:', contractError);
        throw contractError;
      }

      // Step 2: Fetch all existing receipts for this customer
      // @ts-ignore - Custom table not in generated types
      const { data: existingReceipts, error: fetchError } = await supabase
        .from('rental_payment_receipts')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .eq('company_id', companyId);

      if (fetchError) {
        console.error('Error fetching receipts:', fetchError);
        throw fetchError;
      }

      // Step 3: Recalculate and update each receipt
      if (existingReceipts && existingReceipts.length > 0) {
        const updatePromises = existingReceipts.map(async (receipt: any) => {
          // Recalculate with new rent amount
          const newAmountDue = rentAmount + receipt.fine;
          const newPendingBalance = Math.max(0, newAmountDue - receipt.total_paid);
          const newPaymentStatus = 
            newPendingBalance === 0 ? 'paid' : 
            (receipt.total_paid > 0 ? 'partial' : 'pending');

          // @ts-ignore - Custom table not in generated types
          return supabase
            .from('rental_payment_receipts')
            .update({
              rent_amount: rentAmount,
              amount_due: newAmountDue,
              pending_balance: newPendingBalance,
              payment_status: newPaymentStatus
            })
            .eq('id', receipt.id);
        });

        const results = await Promise.all(updatePromises);
        
        // Check for errors in updates
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          console.error('Some receipts failed to update:', errors);
          toast.error(`تم تحديث ${results.length - errors.length} من ${results.length} سجل دفع`);
        } else {
          toast.success(`تم تحديث ${results.length} سجل دفع بنجاح ✅`);
        }
      }

      // Step 4: Update local state
      setSelectedCustomer({
        ...selectedCustomer,
        monthly_rent: rentAmount
      });

      // Step 5: Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId, selectedCustomer.id] });
      await queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId, selectedCustomer.id] });
      await queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });

      toast.success(`تم تحديث الإيجار الشهري إلى ${rentAmount.toLocaleString('ar-QA')} ريال ✅`);
      setEditingMonthlyRent(false);
      setNewMonthlyRent('');
    } catch (error: unknown) {
      console.error('Error updating monthly rent:', error);
      toast.error('فشل في تحديث الإيجار الشهري');
    } finally {
      setIsUpdatingRent(false);
    }
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
      const { data: result, error: rpcError } = await supabase.rpc('create_customer_with_contract', {
        p_company_id: companyId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_monthly_amount: parseFloat(newCustomerRent)
      });

      if (rpcError) {
        console.error('RPC function error:', rpcError);
        console.error('RPC error details:', {
          code: rpcError.code,
          message: rpcError.message,
          hint: rpcError.hint,
          details: rpcError.details
        });
        
        // If RPC function doesn't exist, fall back to manual creation
        if (rpcError.code === '42883' || rpcError.message?.includes('does not exist')) {
          console.log('RPC function not found, falling back to manual creation...');
          await createCustomerManually(firstName, lastName, companyId, parseFloat(newCustomerRent));
          return;
        }
        
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
          await createCustomerManually(firstName, lastName, companyId, parseFloat(newCustomerRent));
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
        await createCustomerManually(firstName, lastName, companyId, parseFloat(newCustomerRent));
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
              await createCustomerManually(firstName, lastName, companyId, parseFloat(newCustomerRent));
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

  // Fallback function for manual creation if RPC doesn't exist
  const createCustomerManually = async (firstName: string, lastName: string, companyId: string, monthlyAmount: number) => {
    console.log('Manual creation - Step 1: Creating customer without select...');
    
    // Generate a truly unique customer code with multiple retry attempts
    let uniqueCustomerCode = '';
    let searchPhone = '';
    let customerData = null;
    
    // Try up to 5 times to generate a unique customer code
    for (let attempt = 1; attempt <= 5; attempt++) {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 12).toUpperCase();
      const randomNum = Math.floor(Math.random() * 10000);
      uniqueCustomerCode = `CUST-${timestamp}-${randomSuffix}-${randomNum}-${attempt}`;
      
      // Create a unique identifier to help us find the customer
      searchPhone = `${timestamp.toString().slice(-8)}${randomNum}${attempt}`;
      
      console.log(`Attempt ${attempt}: Generated customer code:`, uniqueCustomerCode);
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          customer_type: 'individual',
          customer_code: uniqueCustomerCode,
          phone: searchPhone, // Unique phone to help identify
          company_id: companyId,
          is_active: true
        })
        .select('id, first_name, last_name');
        
      if (!error && data && data.length > 0) {
        customerData = data[0];
        break;
      } else if (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        // If it's not a duplicate key error, break immediately
        if (error.code !== '23505') {
          throw new Error(error.message || 'فشل إنشاء العميل');
        }
        
        // Wait a bit before retrying
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
      }
    }

    // If we still don't have customer data, throw an error
    if (!customerData) {
      throw new Error('فشل إنشاء العميل بعد عدة محاولات');
    }

    console.log('Manual creation - Customer created successfully:', customerData);
    
    console.log('Manual creation - Step 2: Creating contract for customer:', customerData.id);
    
    // Generate short contract number using utility
    const { generateShortContractNumber } = await import('@/utils/contractNumberGenerator');
    const contractNumber = generateShortContractNumber();
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    
    const { error: contractError } = await supabase
      .from('contracts')
      .insert({
        customer_id: customerData.id,
        contract_number: contractNumber,
        contract_date: startDate,
        start_date: startDate,
        end_date: endDate,
        company_id: companyId,
        contract_type: 'vehicle_rental',
        monthly_amount: monthlyAmount,
        status: 'active'
      });

    if (contractError) {
      console.error('Manual creation - Contract error:', contractError);
      // Clean up customer
      await supabase.from('customers').delete().eq('id', customerData.id);
      // Better error handling for contract errors
      const contractErrorMessage = contractError.message || contractError.details || 'فشل إنشاء العقد';
      throw new Error(contractErrorMessage);
    }

    console.log('Manual creation - Success!');
    
    // Update the phone to normal value
    await supabase
      .from('customers')
      .update({ phone: '000000000' })
      .eq('id', customerData.id);

    // Create CustomerWithRental object for UI
    const customerWithRental: CustomerWithRental = {
      id: customerData.id,
      name: `${firstName} ${lastName}`,
      monthly_rent: monthlyAmount
    };

    // Refresh and select
    await queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });
    setSelectedCustomer(customerWithRental);
    setSearchTerm(`${firstName} ${lastName}`);
    setShowCreateCustomer(false);
    setNewCustomerName('');
    setNewCustomerRent('');

    toast.success(`تم إنشاء العميل "${firstName} ${lastName}" والعقد بنجاح (الطريقة اليدوية) ✅`);
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

      {/* Tabs: Customer Payments vs Monthly Revenue vs Unpaid by Month */}
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
                          {(customer?.monthly_rent || 0).toLocaleString('ar-QA')} ريال/شهر
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">العميل المحدد</p>
                  {editingCustomerName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        value={editedCustomerName}
                        onChange={(e) => setEditedCustomerName(e.target.value)}
                        className="w-64 h-8 text-sm"
                        placeholder="اسم العميل..."
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveCustomerName}
                        disabled={isUpdatingName}
                        className="h-8"
                        title="حفظ"
                      >
                        {isUpdatingName ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          '✓'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditName}
                        disabled={isUpdatingName}
                        className="h-8"
                        title="إلغاء"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-lg sm:text-xl font-bold">{selectedCustomer.name}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCustomerName}
                        className="h-6 w-6 p-0"
                        title="تعديل اسم العميل"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">الإيجار الشهري</p>
                  {editingMonthlyRent ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newMonthlyRent}
                        onChange={(e) => setNewMonthlyRent(e.target.value)}
                        className="w-32 h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveMonthlyRent}
                        disabled={isUpdatingRent}
                        className="h-8"
                      >
                        {isUpdatingRent ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          '✓'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditRent}
                        disabled={isUpdatingRent}
                        className="h-8"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-lg sm:text-xl font-bold text-primary">
                        {(selectedCustomer?.monthly_rent || 0).toLocaleString('ar-QA')} ريال
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditMonthlyRent}
                        className="h-6 w-6 p-0"
                        title="تعديل الإيجار الشهري"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Vehicle Information */}
              {loadingVehicles ? (
                <div className="mt-3 flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري تحميل معلومات السيارة...
                </div>
              ) : customerVehicles.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2">
                    {customerVehicles.length === 1 ? 'السيارة المخصصة' : 'السيارات المخصصة'}
                  </p>
                  {customerVehicles.length === 1 ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-white px-4 py-2 rounded-lg border border-primary/30">
                        <p className="text-sm font-semibold text-primary">
                          🚗 {customerVehicles[0].make} {customerVehicles[0].model}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {customerVehicles[0].plate_number} • {customerVehicles[0].year || 'N/A'} • {customerVehicles[0].color_ar || ''}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-orange-600 mb-2">
                        ⚠️ لدى هذا العميل {customerVehicles.length} سيارات - يجب تحديد السيارة عند إضافة دفعة
                      </p>
                      {customerVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedVehicleId === vehicle.id
                              ? 'bg-primary/10 border-primary'
                              : 'bg-white border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedVehicleId(vehicle.id)}
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              🚗 {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {vehicle.plate_number} • {vehicle.year || 'N/A'} • {vehicle.color_ar || ''}
                            </p>
                          </div>
                          {selectedVehicleId === vehicle.id && (
                            <Badge className="bg-green-500">
                              <span className="mr-1">✓</span>
                              محدد
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-xs text-muted-foreground">
                  ⚠️ لا توجد سيارة مخصصة لهذا العميل
                </div>
              )}
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
                <Label htmlFor="paymentDate">تاريخ الدفع</Label>
                <Input
                  id="paymentDate"
                  type="text"
                  value={displayPaymentDate}
                  onChange={handleDisplayDateChange}
                  placeholder="DD/MM/YYYY"
                  className="mt-1"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  مثال: 15/10/2024
                </p>
              </div>

              <div>
                <Label htmlFor="paymentAmount">المبلغ المدفوع (ريال)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="أدخل المبلغ المدفوع..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="cash">نقداً</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="check">شيك</option>
                  <option value="credit_card">بطاقة ائتمان</option>
                  <option value="debit_card">بطاقة مدين</option>
                </select>
              </div>
            </div>

            {/* Second row for reference number and add button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="referenceNumber">رقم المرجع / الشيك (اختياري)</Label>
                <Input
                  id="referenceNumber"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="رقم التحويل أو الشيك..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentMethod === 'bank_transfer' && 'رقم التحويل البنكي'}
                  {paymentMethod === 'check' && 'رقم الشيك'}
                  {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && 'آخر 4 أرقام من البطاقة'}
                  {paymentMethod === 'cash' && 'اختياري'}
                </p>
              </div>

              <div className="md:col-span-2 flex items-end">
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

            {/* Payment Notes */}
            <div className="mt-4">
              <Label htmlFor="paymentNotes">ملاحظات الدفع (اختياري)</Label>
              <Input
                id="paymentNotes"
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="مثال: دفعة متأخرة، دفع غرامة الشهر السابق، إلخ..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ⚡ سيتم إضافة ملاحظة تلقائية إذا تم تسوية غرامة من شهر سابق
              </p>
            </div>

            {/* Payment Calculation Preview */}
            {paymentDate && selectedCustomer && (() => {
              // Validate date before calculating
              const dateValid = paymentDate && !isNaN(new Date(paymentDate).getTime());
              if (!dateValid) return null;

              const { fine, month, rent_amount } = calculateDelayFine(paymentDate, selectedCustomer.monthly_rent);
              
              // If month is empty, don't show preview
              if (!month) return null;

              const totalDue = rent_amount + fine;
              const paidAmount = parseFloat(paymentAmount) || 0;
              const pendingBalance = Math.max(0, totalDue - paidAmount);
              const isPartialPayment = paidAmount > 0 && paidAmount < totalDue;
              const isFullyPaid = paidAmount >= totalDue;
              
              return (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm w-full">
                      <p className="font-semibold text-blue-900 mb-2">حساب الدفعة:</p>
                      <div className="space-y-1 text-blue-800">
                        <div className="flex justify-between">
                          <span>• الشهر:</span>
                          <span className="font-semibold">{month}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• الإيجار الشهري:</span>
                          <span className="font-semibold">{rent_amount.toLocaleString('ar-QA')} ريال</span>
                        </div>
                        {fine > 0 && (
                          <div className="flex justify-between text-red-700">
                            <span>• غرامة التأخير:</span>
                            <span className="font-bold">{fine.toLocaleString('ar-QA')} ريال</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                          <span className="font-bold">الإجمالي المستحق:</span>
                          <span className="font-bold text-lg">{totalDue.toLocaleString('ar-QA')} ريال</span>
                        </div>
                        {paidAmount > 0 && (
                          <>
                            <div className="flex justify-between text-green-700">
                              <span>• المبلغ المدفوع:</span>
                              <span className="font-bold">{paidAmount.toLocaleString('ar-QA')} ريال</span>
                            </div>
                            {pendingBalance > 0 && (
                              <div className="flex justify-between text-orange-700 bg-orange-50 -mx-2 px-2 py-1 rounded">
                                <span className="font-bold">⚠️ الرصيد المتبقي:</span>
                                <span className="font-bold text-lg">{pendingBalance.toLocaleString('ar-QA')} ريال</span>
                              </div>
                            )}
                            {isFullyPaid && (
                              <div className="flex items-center justify-center gap-2 bg-green-100 text-green-700 -mx-2 px-2 py-2 rounded mt-2">
                                <span className="text-2xl">✅</span>
                                <span className="font-bold">دفع كامل</span>
                              </div>
                            )}
                            {isPartialPayment && (
                              <div className="flex items-center justify-center gap-2 bg-orange-100 text-orange-700 -mx-2 px-2 py-2 rounded mt-2">
                                <span className="text-xl">⚠️</span>
                                <span className="font-bold">دفع جزئي - يوجد رصيد متبقي</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Customer Summary & Payment History */}
      {selectedCustomer && customerReceipts.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
                  <p className="text-3xl font-bold text-primary mt-2">
                    {(customerTotals?.total || 0).toLocaleString('ar-QA')} ريال
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">إجمالي الغرامات</p>
                  <p className="text-3xl font-bold text-destructive mt-2">
                    {(customerTotals?.totalFines || 0).toLocaleString('ar-QA')} ريال
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">الرصيد المتبقي</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {(totalsData?.total_pending || 0).toLocaleString('ar-QA')} ريال
                  </p>
                  {(totalsData?.partial_payment_count || 0) > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {totalsData?.partial_payment_count} دفعة جزئية
                    </p>
                  )}
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

          {/* Unpaid Months List - Dynamically Updated */}
          {unpaidMonths.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="bg-destructive/10">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Clock className="h-5 w-5" />
                  ⚠️ أشهر غير مدفوعة ({unpaidMonths.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
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
                            {month.expected_date && !isNaN(new Date(month.expected_date).getTime())
                              ? format(new Date(month.expected_date), 'dd MMMM yyyy', { locale: ar })
                              : 'تاريخ غير متاح'
                            }
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
                </div>
                
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg sm:text-xl">سجل المدفوعات -</CardTitle>
                  <Button
                    variant="link"
                    className="text-lg sm:text-xl p-0 h-auto font-bold text-primary hover:text-primary/80"
                    onClick={() => navigate(`/customers?id=${selectedCustomer.id}`)}
                    title="عرض ملف العميل الكامل"
                  >
                    {selectedCustomer.name}
                    <ExternalLink className="h-4 w-4 mr-1" />
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
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
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الإيصال</TableHead>
                    <TableHead className="text-right">الشهر</TableHead>
                    <TableHead className="text-right">تاريخ الدفع</TableHead>
                    <TableHead className="text-right">طريقة الدفع</TableHead>
                    <TableHead className="text-right">الإيجار</TableHead>
                    <TableHead className="text-right">الغرامة</TableHead>
                    <TableHead className="text-right">المستحق</TableHead>
                    <TableHead className="text-right">المدفوع</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerReceipts.map((receipt) => {
                    const isPaid = receipt.payment_status === 'paid';
                    const isPartial = receipt.payment_status === 'partial';
                    const isPending = receipt.payment_status === 'pending';
                    
                    // Calculate values with fallback for older records
                    const amountDue = receipt.amount_due || (receipt.rent_amount + receipt.fine);
                    const pendingBalance = receipt.pending_balance ?? Math.max(0, amountDue - receipt.total_paid);
                    
                    return (
                      <TableRow 
                        key={receipt.id}
                        className={isPartial ? 'bg-orange-50/50' : ''}
                      >
                        <TableCell>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {(receipt as any).receipt_number || 'غير متاح'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{receipt.month}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime())
                              ? format(new Date(receipt.payment_date), 'dd MMMM yyyy', { locale: ar })
                              : 'تاريخ غير متاح'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {(receipt as any).payment_method === 'cash' && '💵 نقداً'}
                            {(receipt as any).payment_method === 'bank_transfer' && '🏦 تحويل بنكي'}
                            {(receipt as any).payment_method === 'check' && '📄 شيك'}
                            {(receipt as any).payment_method === 'credit_card' && '💳 بطاقة ائتمان'}
                            {(receipt as any).payment_method === 'debit_card' && '💳 بطاقة مدين'}
                            {!(receipt as any).payment_method && 'غير محدد'}
                          </span>
                          {(receipt as any).reference_number && (
                            <div className="text-xs text-muted-foreground mt-1">
                              رقم المرجع: {(receipt as any).reference_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {(receipt?.rent_amount || 0).toLocaleString('ar-QA')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          {receipt.fine > 0 ? (
                            <Badge variant="destructive" className="font-semibold">
                              {(receipt?.fine || 0).toLocaleString('ar-QA')} ريال
                            </Badge>
                          ) : (
                            <Badge variant="secondary">لا يوجد</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {amountDue.toLocaleString('ar-QA')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-bold text-primary">
                            {(receipt?.total_paid || 0).toLocaleString('ar-QA')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          {pendingBalance > 0 ? (
                            <span className="text-lg font-bold text-orange-600">
                              {pendingBalance.toLocaleString('ar-QA')} ريال
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-green-600">
                              0 ريال
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPaid && (
                            <Badge className="bg-green-500">
                              <span className="mr-1">✅</span>
                              مدفوع
                            </Badge>
                          )}
                          {isPartial && (
                            <Badge className="bg-orange-500">
                              <span className="mr-1">⚠️</span>
                              جزئي
                            </Badge>
                          )}
                          {isPending && (
                            <Badge variant="destructive">
                              <span className="mr-1">❌</span>
                              معلق
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printReceipt(receipt)}
                              title="طباعة الإيصال"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(receipt)}
                              title="حذف الإيصال"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  الإيرادات الشهرية - ملخص
                </CardTitle>
                
                {/* Month Filter Selector */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <div className="relative">
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
                      className="px-3 py-2 border rounded-md text-sm bg-white appearance-none pr-8"
                      disabled={loadingAllReceipts}
                    >
                      <option value="all">جميع الأشهر</option>
                      {monthlySummary.map((month) => (
                        <option key={month.monthKey} value={month.monthKey}>
                          {month.month}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                  {selectedMonthFilter !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMonthFilter('all')}
                      className="h-8"
                      disabled={loadingAllReceipts}
                    >
                      <X className="h-4 w-4 ml-1" />
                      إلغاء الفلتر
                    </Button>
                  )}
                </div>
                {(loadingAllReceipts || monthlySummary.length === 0) && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {loadingAllReceipts ? (
                      <span>جاري تحميل البيانات...</span>
                    ) : (
                      <span>لا توجد بيانات شهرية متاحة</span>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingAllReceipts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="mr-2">جاري التحميل...</span>
                </div>
              ) : filteredMonthlySummary.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">
                    {selectedMonthFilter === 'all' 
                      ? 'لا توجد بيانات شهرية بعد' 
                      : `لا توجد بيانات للشهر المحدد`
                    }
                  </p>
                  <p className="text-sm mt-2">
                    {selectedMonthFilter === 'all'
                      ? 'قم بإضافة مدفوعات للعملاء لرؤية الإحصائيات'
                      : 'جرب اختيار شهر آخر أو عرض جميع الأشهر'
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                          <p className="text-3xl font-bold text-primary mt-2">
                            {filteredMonthlySummary.reduce((sum, m) => sum + (m.total || 0), 0).toLocaleString('ar-QA')} ريال
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">إجمالي الإيجار</p>
                          <p className="text-3xl font-bold text-blue-600 mt-2">
                            {filteredMonthlySummary.reduce((sum, m) => sum + (m.rent || 0), 0).toLocaleString('ar-QA')} ريال
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">إجمالي الغرامات</p>
                          <p className="text-3xl font-bold text-destructive mt-2">
                            {filteredMonthlySummary.reduce((sum, m) => sum + (m.fines || 0), 0).toLocaleString('ar-QA')} ريال
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">عدد الإيصالات</p>
                          <p className="text-3xl font-bold text-green-600 mt-2">
                            {filteredMonthlySummary.reduce((sum, m) => sum + (m.count || 0), 0).toLocaleString('ar-QA')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Breakdown Table */}
                  <div className="overflow-x-auto">
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
                      {filteredMonthlySummary.map((monthData) => (
                        <TableRow key={monthData.monthKey}>
                          <TableCell className="font-bold">{monthData.month || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {(monthData.count || 0).toLocaleString('ar-QA')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              {(monthData.rent || 0).toLocaleString('ar-QA')} ريال
                            </span>
                          </TableCell>
                          <TableCell>
                            {(monthData.fines || 0) > 0 ? (
                              <Badge variant="destructive">
                                {(monthData.fines || 0).toLocaleString('ar-QA')} ريال
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-bold text-primary">
                              {(monthData.total || 0).toLocaleString('ar-QA')} ريال
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </>  
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unpaid by Month Tab */}
        <TabsContent value="unpaid-by-month" className="space-y-6 mt-6">
          <UnpaidByMonthView 
            allCustomers={allCustomers}
            allReceipts={allReceipts}
            companyId={companyId}
          />
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

      {/* Delete Receipt Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              تأكيد حذف الإيصال
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا الإيصال؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>

          {receiptToDelete && (
            <div className="space-y-3 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">العميل:</span>
                  <span className="font-semibold">{receiptToDelete.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الشهر:</span>
                  <span className="font-semibold">{receiptToDelete.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المبلغ:</span>
                  <span className="font-bold text-primary">
                    {(receiptToDelete.total_paid || 0).toLocaleString('ar-QA')} ريال
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">تاريخ الدفع:</span>
                  <span className="font-semibold">
                    {receiptToDelete.payment_date && !isNaN(new Date(receiptToDelete.payment_date).getTime())
                      ? format(new Date(receiptToDelete.payment_date), 'dd MMMM yyyy', { locale: ar })
                      : 'تاريخ غير متاح'
                    }
                  </span>
                </div>
              </div>

              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  <strong>تحذير:</strong> بعد حذف الإيصال، سيتم إضافة الشهر إلى قائمة الأشهر غير المدفوعة.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setReceiptToDelete(null);
              }}
              disabled={deleteReceiptMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteReceipt}
              disabled={deleteReceiptMutation.isPending}
            >
              {deleteReceiptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف الإيصال
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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