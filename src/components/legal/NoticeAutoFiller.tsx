import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NoticeVariables } from './NoticeTemplateManager';

interface NoticeAutoFillerProps {
  companyId: string;
  onVariablesReady: (variables: NoticeVariables) => void;
  isLoading?: boolean;
}

export const NoticeAutoFiller: React.FC<NoticeAutoFillerProps> = ({
  companyId,
  onVariablesReady,
  isLoading = false,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type, national_id, phone, email, address')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch unpaid invoices for selected customer
  const { data: unpaidInvoices } = useQuery({
    queryKey: ['unpaid-invoices', selectedCustomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_amount, payment_status, created_at')
        .eq('customer_id', selectedCustomerId)
        .eq('payment_status', 'unpaid')
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomerId,
  });

  const generateVariables = useCallback(async () => {
    if (!selectedCustomerId || selectedInvoiceIds.length === 0) {
      toast.error('يرجى اختيار عميل وفاتورة واحدة على الأقل');
      return;
    }

    setIsProcessing(true);
    setCompletionStatus({});

    try {
      const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);
      if (!selectedCustomer) throw new Error('Customer not found');
      setCompletionStatus((prev) => ({ ...prev, customer: true }));

      // Fetch selected invoices
      const selectedInvoices = unpaidInvoices?.filter((inv) => selectedInvoiceIds.includes(inv.id));
      if (!selectedInvoices || selectedInvoices.length === 0) throw new Error('No invoices selected');
      setCompletionStatus((prev) => ({ ...prev, invoices: true }));

      // Calculate totals
      const totalRent = selectedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(selectedInvoices[0].invoice_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const lateFees = totalRent * 0.001 * daysOverdue;
      const violationsFees = 0;
      const totalDebt = totalRent + lateFees + violationsFees;

      setCompletionStatus((prev) => ({ ...prev, calculations: true }));

      // Generate document number
      const docNumber = `NTF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + parseInt(deadlineDays, 10));

      setCompletionStatus((prev) => ({ ...prev, formatting: true }));

      const customerName = selectedCustomer.customer_type === 'corporate'
        ? selectedCustomer.company_name || 'Unknown'
        : `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim();

      const variables: NoticeVariables = {
        companyName: 'Fleetify',
        companyNameAr: 'فليتفاي',
        companyAddress: 'Kuwait',
        companyPhone: '+965-XXXX-XXXX',
        companyEmail: 'info@fleetify.com',
        commercialRegNo: 'N/A',
        customerName,
        customerType: selectedCustomer.customer_type === 'corporate' ? 'company' : 'individual',
        customerAddress: selectedCustomer.address || '',
        customerPhone: selectedCustomer.phone || '',
        customerEmail: selectedCustomer.email || '',
        customerId: selectedCustomer.id,
        nationalId: selectedCustomer.national_id || '',
        contractNumber: 'N/A',
        contractDate: new Date().toISOString(),
        contractTermsAr: 'عقد إيجار طويل الأجل',
        invoiceNumbers: selectedInvoices.map((inv) => inv.invoice_number),
        invoiceDates: selectedInvoices.map((inv) => inv.invoice_date),
        invoiceAmounts: selectedInvoices.map((inv) => inv.total_amount || 0),
        invoiceCurrency: 'KWD',
        invoiceCurrencyAr: 'دينار كويتي',
        totalRent,
        lateFees: Math.round(lateFees),
        courtFees: Math.round(totalDebt * 0.01),
        violationsFees: Math.round(violationsFees),
        totalDebt: Math.round(totalDebt),
        daysOverdue,
        deadlineDays: parseInt(deadlineDays, 10),
        deadlineDate: deadlineDate.toISOString(),
        documentNumber: docNumber,
        dateIssued: new Date().toISOString(),
        companyRepName: 'إدارة التحصيل',
        companyRepTitle: 'مدير قسم التحصيل',
      };

      setCompletionStatus((prev) => ({ ...prev, ready: true }));
      onVariablesReady(variables);

      toast.success('تم ملء البيانات بنجاح', {
        description: 'جاهز لإنشاء الوثيقة',
      });
    } catch (error) {
      console.error('Error generating variables:', error);
      toast.error('حدث خطأ في جمع البيانات', {
        description: error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCustomerId, selectedInvoiceIds, customers, unpaidInvoices, deadlineDays, onVariablesReady]);

  const stats = useMemo(() => {
    const selectedInvoices = unpaidInvoices?.filter((inv) => selectedInvoiceIds.includes(inv.id));
    const totalAmount = selectedInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
    return {
      invoiceCount: selectedInvoiceIds.length,
      totalAmount,
    };
  }, [selectedInvoiceIds, unpaidInvoices]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ملء بيانات الوثيقة تلقائياً</CardTitle>
          <CardDescription>حدد العميل والفواتير لملء البيانات بشكل تلقائي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>اختر العميل المتعثر</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="ابحث واختر عميل..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.customer_type === 'corporate'
                      ? customer.company_name
                      : `${customer.first_name} ${customer.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Selection */}
          {selectedCustomerId && (
            <div className="space-y-2">
              <Label>اختر الفواتير غير المسددة</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {unpaidInvoices?.map((invoice) => (
                  <button
                    key={invoice.id}
                    onClick={() => {
                      setSelectedInvoiceIds((prev) =>
                        prev.includes(invoice.id)
                          ? prev.filter((id) => id !== invoice.id)
                          : [...prev, invoice.id]
                      );
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedInvoiceIds.includes(invoice.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{invoice.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(invoice.invoice_date).toLocaleDateString('ar-KW')}
                    </div>
                    <div className="text-xs font-semibold mt-1">
                      {invoice.total_amount?.toLocaleString('ar-KW')} KWD
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {stats.invoiceCount > 0 && (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
              <div>
                <div className="text-sm text-muted-foreground">عدد الفواتير</div>
                <div className="text-2xl font-bold">{stats.invoiceCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">المجموع</div>
                <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('ar-KW')}</div>
              </div>
            </div>
          )}

          {/* Deadline Days */}
          <div className="space-y-2">
            <Label>مهلة السداد (بالأيام)</Label>
            <Input
              type="number"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              min="1"
              max="90"
              placeholder="7"
            />
          </div>

          {/* Completion Status */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">جاري جمع البيانات...</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { key: 'customer', label: 'بيانات العميل' },
                  { key: 'invoices', label: 'الفواتير' },
                  { key: 'calculations', label: 'الحسابات' },
                  { key: 'formatting', label: 'التنسيق' },
                  { key: 'ready', label: 'جاهز' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    {completionStatus[item.key] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generateVariables}
            disabled={!selectedCustomerId || selectedInvoiceIds.length === 0 || isProcessing || isLoading}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الملء التلقائي...
              </>
            ) : (
              'ملء البيانات تلقائياً'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoticeAutoFiller;
