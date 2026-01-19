import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  ArrowRight,
  Receipt,
  CreditCard,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Car,
  Calendar,
  DollarSign,
  Wallet,
  Banknote,
  Check,
  ArrowLeft,
} from 'lucide-react';

/**
 * نموذج استلام دفعة محسّن
 * يدعم:
 * - القراءة من URL params (contract, amount)
 * - ربط الدفعة بالعقد والفاتورة
 * - حفظ الدفعة في قاعدة البيانات
 * - تحديث رصيد العقد
 */
const ReceivePaymentWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId, isLoading: authLoading } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // قراءة المعاملات من URL
  const contractNumberFromUrl = searchParams.get('contract');
  const amountFromUrl = searchParams.get('amount');

  // حالة النموذج
  const [formData, setFormData] = useState({
    contractId: '',
    customerId: '',
    customerName: '',
    amount: amountFromUrl ? parseFloat(amountFromUrl) : 0,
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // جلب العقود النشطة
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['active-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          contract_amount,
          monthly_amount,
          total_paid,
          balance_due,
          status,
          customer_id,
          customers!customer_id (
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type,
            phone
          ),
          vehicles!vehicle_id (
            plate_number,
            make,
            model
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'pending', 'under_legal_procedure'])
        .order('contract_number', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // عند تحميل العقود، ابحث عن العقد من URL
  useEffect(() => {
    if (contractNumberFromUrl && contracts.length > 0) {
      const contract = contracts.find(
        (c: any) => c.contract_number === contractNumberFromUrl
      );
      if (contract) {
        handleContractSelect(contract.id);
      }
    }
  }, [contractNumberFromUrl, contracts]);

  // دالة اختيار العقد
  const handleContractSelect = (contractId: string) => {
    const contract = contracts.find((c: any) => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
      const customer = contract.customers as any;
      const customerName = customer?.customer_type === 'corporate'
        ? customer?.company_name_ar || customer?.company_name
        : `${customer?.first_name_ar || customer?.first_name || ''} ${customer?.last_name_ar || customer?.last_name || ''}`.trim();

      setFormData(prev => ({
        ...prev,
        contractId: contract.id,
        customerId: contract.customer_id,
        customerName,
        amount: amountFromUrl ? parseFloat(amountFromUrl) : (contract.monthly_amount || 0),
      }));
    }
  };

  // الحصول على الرصيد المستحق للعقد المختار
  const balanceDue = useMemo(() => {
    if (!selectedContract) return 0;
    const total = selectedContract.contract_amount || 0;
    const paid = selectedContract.total_paid || 0;
    return total - paid;
  }, [selectedContract]);

  // حفظ الدفعة
  const createPaymentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!companyId || !user?.id) {
        throw new Error('بيانات المستخدم غير متوفرة');
      }

      // 1. إنشاء رقم دفعة فريد
      const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;

      // 2. البحث عن الفاتورة المناسبة (أول فاتورة غير مدفوعة للعقد)
      let targetInvoiceId: string | null = null;
      let remainingAmount = data.amount;
      
      const { data: unpaidInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, balance_due, payment_status')
        .eq('contract_id', data.contractId)
        .in('payment_status', ['unpaid', 'partial'])
        .order('due_date', { ascending: true });
      
      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }
      
      // 3. ربط الدفعة بالفاتورة الأولى غير المدفوعة
      if (unpaidInvoices && unpaidInvoices.length > 0) {
        targetInvoiceId = unpaidInvoices[0].id;
      }

      // 4. إنشاء الدفعة مع ربطها بالفاتورة
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          contract_id: data.contractId,
          customer_id: data.customerId,
          invoice_id: targetInvoiceId, // ✅ ربط الدفعة بالفاتورة
          payment_number: paymentNumber,
          amount: data.amount,
          payment_type: data.paymentMethod,
          payment_method: 'received',
          payment_date: data.paymentDate,
          payment_status: 'completed',
          reference_number: data.referenceNumber || null,
          notes: data.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 5. تحديث حالة الفواتير (توزيع المبلغ على الفواتير)
      if (unpaidInvoices && unpaidInvoices.length > 0) {
        for (const invoice of unpaidInvoices) {
          if (remainingAmount <= 0) break;
          
          const invoiceBalance = invoice.total_amount - (invoice.paid_amount || 0);
          const amountToApply = Math.min(remainingAmount, invoiceBalance);
          
          if (amountToApply > 0) {
            const newPaidAmount = (invoice.paid_amount || 0) + amountToApply;
            const newBalance = invoice.total_amount - newPaidAmount;
            const newStatus = newBalance <= 0 ? 'paid' : 'partial';
            
            await supabase
              .from('invoices')
              .update({
                paid_amount: newPaidAmount,
                balance_due: newBalance,
                payment_status: newStatus,
              })
              .eq('id', invoice.id);
            
            remainingAmount -= amountToApply;
          }
        }
      }

      // 6. تحديث تاريخ آخر دفعة في العقد
      await supabase
        .from('contracts')
        .update({ 
          last_payment_date: data.paymentDate
        })
        .eq('id', data.contractId);

      return paymentData;
    },
    onSuccess: (data) => {
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['contract-payments'] });
      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['active-contracts'] });

      toast.success('تم تسجيل الدفعة بنجاح', {
        description: `تم استلام ${formatCurrency(formData.amount)} من ${formData.customerName}`,
      });

      // العودة للعقد
      if (contractNumberFromUrl) {
        navigate(`/contracts/${contractNumberFromUrl}`);
      } else {
        navigate('/finance/billing');
      }
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      toast.error('خطأ في تسجيل الدفعة', {
        description: error.message || 'حدث خطأ غير متوقع',
      });
    },
  });

  // التحقق من صحة الخطوة الحالية
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!formData.contractId;
      case 2:
        return formData.amount > 0 && !!formData.paymentMethod;
      case 3:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  // معالجة الإرسال
  const handleSubmit = async () => {
    if (!isStepValid) return;
    
    setIsSubmitting(true);
    try {
      await createPaymentMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // التحميل
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const paymentMethods = [
    { value: 'cash', label: 'نقداً', icon: Banknote },
    { value: 'bank_transfer', label: 'تحويل بنكي', icon: Building2 },
    { value: 'check', label: 'شيك', icon: FileText },
    { value: 'credit_card', label: 'بطاقة ائتمانية', icon: CreditCard },
    { value: 'debit_card', label: 'بطاقة مدين', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-6 w-6 text-green-600" />
                تسجيل دفعة جديدة
              </h1>
              <p className="text-sm text-slate-500">استلام دفعة من عميل</p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === currentStep
                    ? 'bg-green-600 text-white scale-110'
                    : step < currentStep
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step < currentStep ? <Check className="h-4 w-4" /> : step}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* الخطوة 1: اختيار العقد */}
        {currentStep === 1 && (
          <Card className="animate-in slide-in-from-right-5">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <FileText className="h-5 w-5" />
                الخطوة 1: اختيار العقد
              </CardTitle>
              <CardDescription>
                اختر العقد الذي تريد تسجيل الدفعة عليه
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* معلومات سريعة إذا كان العقد محدد من URL */}
              {contractNumberFromUrl && selectedContract && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <CheckCircle className="h-5 w-5" />
                    تم تحديد العقد تلقائياً
                  </div>
                  <p className="text-sm text-green-700">
                    العقد رقم: {contractNumberFromUrl}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-medium">اختر العقد</Label>
                <Select
                  value={formData.contractId}
                  onValueChange={handleContractSelect}
                  disabled={loadingContracts}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder={loadingContracts ? 'جاري التحميل...' : 'اختر العقد...'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {contracts.map((contract: any) => {
                      const customer = contract.customers as any;
                      const customerName = customer?.customer_type === 'corporate'
                        ? customer?.company_name_ar || customer?.company_name
                        : `${customer?.first_name_ar || customer?.first_name || ''} ${customer?.last_name_ar || customer?.last_name || ''}`.trim();
                      const vehicle = contract.vehicles as any;
                      const remaining = (contract.contract_amount || 0) - (contract.total_paid || 0);

                      return (
                        <SelectItem key={contract.id} value={contract.id}>
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex-1">
                              <div className="font-medium">عقد #{contract.contract_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {customerName} • {vehicle?.plate_number || 'لا توجد مركبة'}
                              </div>
                            </div>
                            <Badge variant={remaining > 0 ? 'destructive' : 'default'} className="text-xs">
                              {formatCurrency(remaining)} متبقي
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* تفاصيل العقد المختار */}
              {selectedContract && (
                <div className="bg-slate-50 rounded-xl p-5 space-y-4 animate-in fade-in-50">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    تفاصيل العقد
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-slate-500 mb-1">العميل</div>
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        {formData.customerName}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-slate-500 mb-1">المركبة</div>
                      <div className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4 text-slate-400" />
                        {(selectedContract.vehicles as any)?.plate_number || '-'}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-slate-500 mb-1">إجمالي العقد</div>
                      <div className="font-semibold text-lg">
                        {formatCurrency(selectedContract.contract_amount || 0)}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-orange-200 bg-orange-50">
                      <div className="text-xs text-orange-600 mb-1">المتبقي للسداد</div>
                      <div className="font-bold text-xl text-orange-600">
                        {formatCurrency(balanceDue)}
                      </div>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">نسبة السداد</span>
                      <span className="font-medium">
                        {Math.round(((selectedContract.total_paid || 0) / (selectedContract.contract_amount || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((selectedContract.total_paid || 0) / (selectedContract.contract_amount || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* الخطوة 2: تفاصيل الدفعة */}
        {currentStep === 2 && (
          <Card className="animate-in slide-in-from-right-5">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <DollarSign className="h-5 w-5" />
                الخطوة 2: تفاصيل الدفعة
              </CardTitle>
              <CardDescription>
                أدخل تفاصيل المبلغ وطريقة الدفع
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* المبلغ */}
              <div className="space-y-2">
                <Label className="text-base font-medium">المبلغ</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    className="h-14 text-2xl font-bold text-center pr-16"
                    placeholder="0.00"
                    min={0}
                    max={balanceDue}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    QAR
                  </span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: selectedContract?.monthly_amount || 0 }))}
                      className="text-xs"
                    >
                      القسط الشهري ({formatCurrency(selectedContract?.monthly_amount || 0)})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: balanceDue }))}
                      className="text-xs"
                    >
                      كامل المتبقي ({formatCurrency(balanceDue)})
                    </Button>
                  </div>
                )}
              </div>

              {/* تاريخ الدفع */}
              <div className="space-y-2">
                <Label className="text-base font-medium">تاريخ الدفع</Label>
                <Input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="h-12"
                />
              </div>

              {/* طريقة الدفع */}
              <div className="space-y-3">
                <Label className="text-base font-medium">طريقة الدفع</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = formData.paymentMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value }))}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* رقم المرجع (للتحويل البنكي أو الشيك) */}
              {['bank_transfer', 'check'].includes(formData.paymentMethod) && (
                <div className="space-y-2 animate-in fade-in-50">
                  <Label className="text-base font-medium">
                    {formData.paymentMethod === 'check' ? 'رقم الشيك' : 'رقم المرجع'}
                  </Label>
                  <Input
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder={formData.paymentMethod === 'check' ? 'أدخل رقم الشيك...' : 'أدخل رقم التحويل...'}
                    className="h-12"
                  />
                </div>
              )}

              {/* ملاحظات */}
              <div className="space-y-2">
                <Label className="text-base font-medium">ملاحظات (اختياري)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية..."
                  className="resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* الخطوة 3: المراجعة والتأكيد */}
        {currentStep === 3 && (
          <Card className="animate-in slide-in-from-right-5">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-green-50">
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="h-5 w-5" />
                الخطوة 3: مراجعة وتأكيد
              </CardTitle>
              <CardDescription>
                راجع تفاصيل الدفعة قبل الحفظ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* ملخص الدفعة */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 text-center">
                <p className="text-green-100 text-sm mb-2">المبلغ المستلم</p>
                <p className="text-4xl font-bold mb-1">{formatCurrency(formData.amount)}</p>
                <p className="text-green-100 text-sm">
                  {paymentMethods.find(m => m.value === formData.paymentMethod)?.label}
                </p>
              </div>

              {/* تفاصيل الدفعة */}
              <div className="bg-slate-50 rounded-xl divide-y">
                <div className="p-4 flex justify-between">
                  <span className="text-slate-600">العقد</span>
                  <span className="font-semibold">#{selectedContract?.contract_number}</span>
                </div>
                <div className="p-4 flex justify-between">
                  <span className="text-slate-600">العميل</span>
                  <span className="font-semibold">{formData.customerName}</span>
                </div>
                <div className="p-4 flex justify-between">
                  <span className="text-slate-600">تاريخ الدفع</span>
                  <span className="font-semibold">
                    {format(new Date(formData.paymentDate), 'dd MMMM yyyy', { locale: ar })}
                  </span>
                </div>
                <div className="p-4 flex justify-between">
                  <span className="text-slate-600">طريقة الدفع</span>
                  <span className="font-semibold">
                    {paymentMethods.find(m => m.value === formData.paymentMethod)?.label}
                  </span>
                </div>
                {formData.referenceNumber && (
                  <div className="p-4 flex justify-between">
                    <span className="text-slate-600">رقم المرجع</span>
                    <span className="font-semibold font-mono">{formData.referenceNumber}</span>
                  </div>
                )}
                {formData.notes && (
                  <div className="p-4">
                    <span className="text-slate-600 block mb-1">ملاحظات</span>
                    <span className="text-slate-900">{formData.notes}</span>
                  </div>
                )}
              </div>

              {/* الرصيد بعد الدفع */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">الرصيد المتبقي بعد هذه الدفعة:</span>
                  <span className="text-xl font-bold text-blue-800">
                    {formatCurrency(Math.max(0, balanceDue - formData.amount))}
                  </span>
                </div>
              </div>

              {/* تحذير إذا كان المبلغ أكبر من المتبقي */}
              {formData.amount > balanceDue && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium">تنبيه</p>
                    <p className="text-amber-700 text-sm">
                      المبلغ المدخل أكبر من الرصيد المتبقي. سيتم تسجيل المبلغ الإضافي كرصيد دائن للعميل.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* أزرار التنقل */}
        <div className="flex justify-between items-center mt-6 gap-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                navigate(-1);
              } else {
                setCurrentStep(prev => prev - 1);
              }
            }}
            className="gap-2"
            disabled={isSubmitting}
          >
            <ArrowRight className="h-4 w-4" />
            {currentStep === 1 ? 'إلغاء' : 'السابق'}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!isStepValid}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              التالي
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid}
              className="gap-2 bg-green-600 hover:bg-green-700 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  تأكيد الدفعة
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReceivePaymentWorkflow;
