import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  RefreshCw,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PaymentScheduleManager } from './payment-schedules/PaymentScheduleManager'
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter'

interface ContractInvoiceGeneratorProps {
  contract: any
}

export const ContractInvoiceGenerator: React.FC<ContractInvoiceGeneratorProps> = ({ contract }) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState('monthly')
  const queryClient = useQueryClient()

  const { formatCurrency } = useCurrencyFormatter()

  // Get existing invoices for this contract
  const { data: existingInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['contract-invoices', contract.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('invoices')
        .select('*') as any)
        .eq('contract_id', contract.id)
        .neq('status', 'cancelled')  // استبعاد الفواتير الملغاة
        .order('invoice_date', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!contract.id
  })

  // Create invoice mutation with duplicate check
  const createInvoiceMutation = useMutation({
    mutationFn: async (period: string) => {
      const invoiceDate = new Date().toISOString().split('T')[0]
      const invoiceMonth = invoiceDate.substring(0, 7) // YYYY-MM format
      
      // ✅ التحقق من وجود فاتورة لهذا الشهر باستخدام due_date (الأكثر دقة)
      const { data: existingForMonth } = await (supabase
        .from('invoices')
        .select('id, invoice_number') as any)
        .eq('contract_id', contract.id)
        .gte('due_date', `${invoiceMonth}-01`)
        .lte('due_date', `${invoiceMonth}-31`)
        .neq('status', 'cancelled')
        .limit(1)
      
      if (existingForMonth && existingForMonth.length > 0) {
        throw new Error(`توجد فاتورة مسجلة لهذا الشهر: ${(existingForMonth[0] as any).invoice_number}`)
      }
      
      // ✅ تاريخ الاستحقاق = أول يوم في الشهر (حسب التعليمات)
      const firstDayOfMonth = `${invoiceMonth}-01`;
      
      const { data, error } = await (supabase
        .from('invoices')
        .insert([{
          company_id: contract.company_id,
          customer_id: contract.customer_id,
          contract_id: contract.id,
          invoice_number: `INV-C-${contract.contract_number?.substring(0, 10) || 'CNT'}-${invoiceMonth}`,
          invoice_type: 'sale',
          invoice_date: firstDayOfMonth,
          due_date: firstDayOfMonth, // ✅ أول يوم في الشهر
          subtotal: period === 'monthly' ? contract.monthly_amount : 
                   period === 'quarterly' ? contract.monthly_amount * 3 : 
                   contract.contract_amount,
          tax_amount: 0,
          total_amount: period === 'monthly' ? contract.monthly_amount : 
                       period === 'quarterly' ? contract.monthly_amount * 3 : 
                       contract.contract_amount,
          status: 'draft',
          notes: `Auto-generated from contract #${contract.contract_number} (${period} billing)`
        }] as any)
        .select()
        .single() as any)
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('تم إنشاء الفاتورة بنجاح')
    },
    onError: (error: Error) => {
      console.error('Error creating invoice:', error)
      toast.error(error.message || 'حدث خطأ في إنشاء الفاتورة')
    }
  })

  // Generate periodic invoices using database function (with built-in duplicate check)
  useMutation({
    mutationFn: async () => {
      // استخدام دالة قاعدة البيانات مع التحقق المدمج من التكرار
      const currentMonth = new Date().toISOString().substring(0, 7) + '-01'
      
      const { data, error } = await supabase
        .rpc('generate_invoice_for_contract_month', {
          p_contract_id: contract.id,
          p_invoice_month: currentMonth
        })
      
      if (error) {
        // إذا كان الخطأ بسبب وجود فاتورة، نعتبره نجاح مع تحذير
        if (error.message?.includes('already exists')) {
          return { skipped: true, message: 'الفاتورة موجودة مسبقاً لهذا الشهر' }
        }
        throw error
      }
      
      return { created: true, invoiceId: data }
    },
    onSuccess: (result: { skipped?: boolean; created?: boolean; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] })
      
      if (result.skipped) {
        toast.info(result.message || 'الفاتورة موجودة مسبقاً')
      } else {
        toast.success('تم إنشاء الفاتورة الدورية بنجاح')
      }
    },
    onError: (error: Error) => {
      console.error('Error generating periodic invoices:', error)
      toast.error(error.message || 'حدث خطأ في إنشاء الفواتير الدورية')
    }
  })

  const handleCreateInvoice = () => {
    createInvoiceMutation.mutate(selectedPeriod)
  }

  // handleGeneratePeriodicInvoices is declared for future use

  const getInvoiceAmount = (period: string) => {
    switch (period) {
      case 'monthly': return contract.monthly_amount
      case 'quarterly': return contract.monthly_amount * 3
      case 'yearly': return contract.contract_amount
      default: return contract.monthly_amount
    }
  }

  const getLastInvoiceDate = () => {
    if (!existingInvoices || existingInvoices.length === 0) return null
    return (existingInvoices[0] as any).invoice_date
  }

  const getDaysSinceLastInvoice = () => {
    const lastDate = getLastInvoiceDate()
    if (!lastDate) {
      const daysSinceStart = Math.floor(
        (new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceStart
    }
    
    return Math.floor(
      (new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  // isEligibleForPeriodicInvoice is defined for future use

  if (contract.status !== 'active') {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          إنشاء الفواتير
        </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا يمكن إنشاء فواتير للعقود غير النشطة. حالة العقد الحالية: {contract.status}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Function to create invoice from payment schedule
  const createInvoiceFromSchedule = async (scheduleId: string) => {
    try {
      const { data: schedule } = await (supabase
        .from('contract_payment_schedules')
        .select('*') as any)
        .eq('id', scheduleId)
        .single();

      if (!schedule) throw new Error('Payment schedule not found');
      
      const scheduleAny = schedule as any;

      // ✅ التحقق من وجود فاتورة لهذا الشهر قبل الإنشاء
      const scheduleMonth = scheduleAny.due_date.substring(0, 7); // YYYY-MM
      const { data: existingForMonth } = await (supabase
        .from('invoices')
        .select('id, invoice_number') as any)
        .eq('contract_id', contract.id)
        .gte('due_date', `${scheduleMonth}-01`)
        .lte('due_date', `${scheduleMonth}-31`)
        .neq('status', 'cancelled')
        .limit(1);

      if (existingForMonth && existingForMonth.length > 0) {
        toast.warning(`توجد فاتورة مسجلة لهذا الشهر: ${(existingForMonth[0] as any).invoice_number}`);
        return;
      }

      // ✅ استخدام أول يوم في الشهر كتاريخ الفاتورة والاستحقاق
      const firstDayOfScheduleMonth = `${scheduleMonth}-01`;
      
      const { data: invoice, error } = await (supabase
        .from('invoices')
        .insert({
          company_id: contract.company_id,
          customer_id: contract.customer_id,
          contract_id: contract.id,
          invoice_number: `CNT-INV-${new Date().getFullYear()}-${Date.now()}`,
          invoice_type: 'sale',
          invoice_date: firstDayOfScheduleMonth,
          due_date: firstDayOfScheduleMonth, // ✅ أول يوم في الشهر
          subtotal: scheduleAny.amount,
          tax_amount: 0,
          total_amount: scheduleAny.amount,
          status: 'draft',
          notes: `Invoice for installment #${scheduleAny.installment_number} - ${scheduleAny.description || ''}`
        } as any)
        .select()
        .single() as any);

      if (error) throw error;
      
      const invoiceAny = invoice as any;

      // Create invoice item with proper description using the formatter
      const { formatMonthlyPaymentDescription } = await import('@/utils/invoiceDescriptionFormatter');
      const itemDescription = formatMonthlyPaymentDescription(scheduleAny.due_date, contract.contract_number);
      
      const { error: itemError } = await (supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoiceAny.id,
          line_number: 1,
          item_description: itemDescription,
          quantity: 1,
          unit_price: scheduleAny.amount,
          line_total: scheduleAny.amount,
          tax_rate: 0,
          tax_amount: 0
        } as any) as any);

      if (itemError) throw itemError;

      // Update payment schedule with invoice ID
      await (supabase
        .from('contract_payment_schedules')
        .update({ invoice_id: invoiceAny.id } as any) as any)
        .eq('id', scheduleId);

      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      toast.success('تم إنشاء الفاتورة من جدول الدفع بنجاح');

    } catch (error) {
      console.error('Error creating invoice from schedule:', error);
      toast.error('حدث خطأ في إنشاء الفاتورة');
    }
  };

  return (
    <Tabs defaultValue="schedules" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200 p-1 rounded-xl h-auto mb-6">
        <TabsTrigger 
          value="schedules" 
          className="flex items-center gap-2 data-[state=active]:bg-[#00A896] data-[state=active]:text-white rounded-lg py-2.5 transition-all"
        >
          <CreditCard className="h-4 w-4" />
          جدول الدفع
        </TabsTrigger>
        <TabsTrigger 
          value="invoices" 
          className="flex items-center gap-2 data-[state=active]:bg-[#00A896] data-[state=active]:text-white rounded-lg py-2.5 transition-all"
        >
          <FileText className="h-4 w-4" />
          الفواتير
        </TabsTrigger>
      </TabsList>

      <TabsContent value="schedules">
        <PaymentScheduleManager 
          contractId={contract.id}
          onCreateInvoice={createInvoiceFromSchedule}
        />
      </TabsContent>

      <TabsContent value="invoices">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              إدارة الفواتير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contract Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">القيمة الشهرية</span>
                </div>
                <p className="text-xl font-bold text-blue-800">{formatCurrency(contract.monthly_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">آخر فاتورة</span>
                </div>
                <p className="text-lg font-bold text-green-800">
                  {getLastInvoiceDate() 
                    ? new Date(getLastInvoiceDate()).toLocaleDateString('en-GB')
                    : 'لا توجد'
                  }
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">أيام منذ آخر فاتورة</span>
                </div>
                <p className="text-xl font-bold text-orange-800">{getDaysSinceLastInvoice()} يوم</p>
              </div>
            </div>

            {/* Manual Invoice Creation */}
            <div className="space-y-4">
              <h4 className="font-medium">إنشاء فاتورة يدوية</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>فترة الفوترة</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">شهرية</SelectItem>
                      <SelectItem value="quarterly">ربع سنوية</SelectItem>
                      <SelectItem value="yearly">سنوية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>مبلغ الفاتورة</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <span className="text-lg font-bold">{formatCurrency(getInvoiceAmount(selectedPeriod) ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateInvoice}
                disabled={createInvoiceMutation.isPending}
                className="w-full"
              >
                {createInvoiceMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    إنشاء فاتورة {selectedPeriod === 'monthly' ? 'شهرية' : selectedPeriod === 'quarterly' ? 'ربع سنوية' : 'سنوية'}
                  </>
                )}
              </Button>
            </div>

            {/* Existing Invoices */}
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : existingInvoices && existingInvoices.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">الفواتير الموجودة</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {existingInvoices.map((invoice: any) => (
                     <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                       <div className="flex items-center gap-3">
                         <FileText className="h-4 w-4 text-muted-foreground" />
                         <div>
                           <div className="flex items-center gap-2">
                             <p className="font-medium">{invoice.invoice_number}</p>
                             {invoice.notes?.includes('payment schedule') && (
                               <Badge variant="outline" className="text-xs">
                                 من جدول دفع
                               </Badge>
                             )}
                           </div>
                           <p className="text-sm text-muted-foreground">
                             {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                           </p>
                         </div>
                       </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(invoice.total_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status === 'paid' ? 'مدفوعة' : 
                           invoice.status === 'sent' ? 'مرسلة' : 'مسودة'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">لا توجد فواتير لهذا العقد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
