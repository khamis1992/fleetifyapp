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
  Trash2
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
  monthlyPayment: number;
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // تحسين الأداء
  const [loading, setLoading] = useState(true);
  const [aiModalData, setAiModalData] = useState<{
    contract: ActiveContract;
    analysis: PaymentAnalysis;
  } | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout>(); // إصلاح memory leak

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
      
      const formattedContracts: ActiveContract[] = (data || []).map((contract: any) => ({
        contractId: contract.contract_number || contract.id,
        customerId: contract.customer_id,
        customerName: contract.customers?.customer_type === 'corporate'
          ? (contract.customers?.company_name_ar || contract.customers?.company_name || '')
          : `${contract.customers?.first_name_ar || contract.customers?.first_name || ''} ${contract.customers?.last_name_ar || contract.customers?.last_name || ''}`.trim(),
        phone: contract.customers?.phone || '',
        vehicleNumber: contract.vehicle?.plate_number || 'غير محدد',
        color: contract.vehicle?.color || 'white',
        monthlyPayment: contract.monthly_amount || 0,
        notes: '',
        status: 'pending',
        paymentMonth: currentMonth, // Default to current month
        paymentMethod: 'cash' // Default payment method
      }));

      setContracts(formattedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('فشل في جلب العقود النشطة');
    } finally {
      setLoading(false);
    }
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
      const paymentRecords = paymentsToSave.map(payment => ({
        company_id: companyId,
        contract_id: payment.contractId,
        customer_id: payment.customerId,
        amount: payment.monthlyPayment,
        payment_date: `${payment.paymentMonth}-01`, // First day of selected month
        payment_method: payment.paymentMethod,
        payment_type: 'rental_payment',
        payment_status: 'completed',
        notes: payment.notes,
        transaction_type: 'inflow' as const
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

  // تصفية العقود - محسّن بـ useMemo و debounce
  const filteredContracts = useMemo(() => {
    if (!debouncedSearchTerm) return contracts;
    
    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    return contracts.filter(contract => (
      contract.customerName.toLowerCase().includes(searchLower) ||
      contract.vehicleNumber.toLowerCase().includes(searchLower) ||
      contract.phone.includes(searchLower)
    ));
  }, [contracts, debouncedSearchTerm]); // يُعاد حسابه فقط عند تغيير contracts أو debouncedSearchTerm

  const paidCount = contracts.filter(c => c.status === 'paid').length;
  const pendingCount = contracts.filter(c => c.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل العقود النشطة...</p>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{contracts.length}</div>
                  <div className="text-sm text-muted-foreground">عقود نشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{paidCount}</div>
                  <div className="text-sm text-muted-foreground">دفعات مسجلة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{pendingCount}</div>
                  <div className="text-sm text-muted-foreground">في الانتظار</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {/* Search Bar - محسّن مع مؤشر تحميل */}
            <div className="p-4 border-b">
              <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="🔍 بحث عن عميل، مركبة، أو رقم جوال..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-10"
                />
                {/* مؤشر تحميل أثناء البحث */}
                {searchTerm && searchTerm !== debouncedSearchTerm && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b-2">
                  <tr>
                    <th className="p-4 text-right text-sm font-semibold">اسم العميل</th>
                    <th className="p-4 text-right text-sm font-semibold">رقم المركبة</th>
                    <th className="p-4 text-right text-sm font-semibold">رقم الجوال</th>
                    <th className="p-4 text-right text-sm font-semibold">القسط الشهري</th>
                    <th className="p-4 text-right text-sm font-semibold">الشهر</th>
                    <th className="p-4 text-right text-sm font-semibold">طريقة الدفع</th>
                    <th className="p-4 text-right text-sm font-semibold">تسجيل الدفعة</th>
                    <th className="p-4 text-right text-sm font-semibold">الحالة</th>
                    <th className="p-4 text-right text-sm font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد عقود نشطة'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((contract) => (
                      <tr key={contract.contractId} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-semibold">{contract.customerName}</td>
                        <td className="p-4 font-mono text-primary">{contract.vehicleNumber}</td>
                        <td className="p-4 font-mono text-sm text-muted-foreground">{contract.phone}</td>
                        <td className="p-4 font-mono font-semibold text-success">
                          {contract.monthlyPayment.toLocaleString('ar-SA')} ر.ق
                        </td>
                        <td className="p-4">
                          <input
                            type="month"
                            value={contract.paymentMonth}
                            onChange={(e) => setContracts(prev =>
                              prev.map(c =>
                                c.contractId === contract.contractId
                                  ? { ...c, paymentMonth: e.target.value }
                                  : c
                              )
                            )}
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
                        {aiModalData.analysis.amount.toLocaleString('ar-SA')} ر.ق
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
                          {aiModalData.analysis.lateFee.toLocaleString('ar-SA')} ر.ق
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
