/**
 * صفحة تنظيف الفواتير المكررة
 * تسمح للمسؤولين بتنظيف الفواتير المكررة لنفس العقد في نفس الشهر
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, CheckCircle, AlertTriangle, RefreshCcw, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DuplicateGroup {
  contractId: string;
  contractNumber: string;
  invoiceMonth: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    status: string;
    isPrimary: boolean;
  }>;
}

interface WrongDateInvoice {
  id: string;
  invoiceNumber: string;
  oldDate: string;
  newDate: string;
  contractId: string;
  contractNumber: string;
  hasPrimaryInvoice: boolean;  // هل يوجد فاتورة بتاريخ يوم 1؟
}

export default function DuplicateInvoicesCleanup() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [wrongDateInvoices, setWrongDateInvoices] = useState<WrongDateInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<{
    groupsCleaned: number;
    invoicesCancelled: number;
  } | null>(null);
  const [dateFixResults, setDateFixResults] = useState<{
    fixed: number;
    failed: number;
  } | null>(null);
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();

  const fetchDuplicates = async () => {
    if (!companyId) {
      toast({
        title: 'خطأ',
        description: 'لم يتم تحديد الشركة',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      // جلب كل الفواتير النشطة للشركة بدون limit
      let allInvoices: any[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('invoices')
          .select(`
            id, 
            invoice_number, 
            invoice_date, 
            due_date, 
            total_amount, 
            status,
            contract_id,
            created_at,
            contracts (
              contract_number
            )
          `)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .not('contract_id', 'is', null)
          .order('created_at', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (batchError) throw batchError;
        if (!batch || batch.length === 0) break;
        
        allInvoices = [...allInvoices, ...batch];
        page++;
        
        if (batch.length < pageSize) break;
      }
      
      const invoices = allInvoices;
      console.log(`📊 Duplicates - Total invoices fetched: ${invoices?.length || 0}`);

      // تجميع حسب العقد والشهر
      const grouped = new Map<string, {
        contractId: string;
        contractNumber: string;
        invoiceMonth: string;
        invoices: any[];
      }>();

      for (const inv of invoices || []) {
        const dateStr = inv.due_date || inv.invoice_date;
        const month = dateStr ? dateStr.substring(0, 7) : 'unknown';
        const key = `${inv.contract_id}|${month}`;
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            contractId: inv.contract_id,
            contractNumber: (inv.contracts as any)?.contract_number || 'غير معروف',
            invoiceMonth: month,
            invoices: []
          });
        }
        
        grouped.get(key)!.invoices.push({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          date: inv.due_date || inv.invoice_date,
          amount: inv.total_amount,
          status: inv.status,
          isPrimary: false
        });
      }

      // استخراج المجموعات التي بها أكثر من فاتورة
      const duplicateGroups: DuplicateGroup[] = [];
      for (const [_, group] of grouped) {
        if (group.invoices.length > 1) {
          // تعيين أول فاتورة كأساسية
          group.invoices[0].isPrimary = true;
          duplicateGroups.push(group);
        }
      }

      // ترتيب حسب عدد المكررات
      duplicateGroups.sort((a, b) => b.invoices.length - a.invoices.length);
      
      setDuplicates(duplicateGroups);
      setCleanupResults(null);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!duplicates.length) return;
    
    setCleaning(true);
    let groupsCleaned = 0;
    let invoicesCancelled = 0;

    try {
      // معالجة بـ batches من 10 مجموعات في نفس الوقت
      const BATCH_SIZE = 10;
      
      for (let i = 0; i < duplicates.length; i += BATCH_SIZE) {
        const batch = duplicates.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(batch.map(async (group) => {
          const primaryInvoice = group.invoices.find(inv => inv.isPrimary);
          const duplicateInvoices = group.invoices.filter(inv => !inv.isPrimary);

          if (!primaryInvoice || !duplicateInvoices.length) return { cancelled: 0 };

          // إلغاء جميع الفواتير المكررة في هذه المجموعة
          const cancelResults = await Promise.all(duplicateInvoices.map(async (dup) => {
            const { error } = await supabase
              .from('invoices')
              .update({
                status: 'cancelled',
                notes: `ملغاة تلقائياً - مكررة مع الفاتورة: ${primaryInvoice.invoiceNumber} | تم الإلغاء: ${new Date().toISOString()}`
              })
              .eq('id', dup.id);

            return !error ? 1 : 0;
          }));

          return { cancelled: cancelResults.reduce((a, b) => a + b, 0) };
        }));

        // حساب النتائج
        for (const r of results) {
          if (r.cancelled > 0) {
            groupsCleaned++;
            invoicesCancelled += r.cancelled;
          }
        }
        
        console.log(`📊 Progress: ${i + batch.length}/${duplicates.length} groups (Cancelled: ${invoicesCancelled})`);
      }

      // إعادة حساب أرصدة الفواتير الأساسية
      for (const group of duplicates) {
        const primaryInvoice = group.invoices.find(i => i.isPrimary);
        if (!primaryInvoice) continue;

        // جلب مجموع الدفعات
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', primaryInvoice.id)
          .eq('payment_status', 'completed');

        const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const balanceDue = Math.max(0, primaryInvoice.amount - totalPaid);
        const paymentStatus = balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

        await supabase
          .from('invoices')
          .update({
            paid_amount: totalPaid,
            balance_due: balanceDue,
            payment_status: paymentStatus
          })
          .eq('id', primaryInvoice.id);
      }

      setCleanupResults({ groupsCleaned, invoicesCancelled });
      
      toast({
        title: 'تم التنظيف بنجاح',
        description: `تم إلغاء ${invoicesCancelled} فاتورة مكررة من ${groupsCleaned} مجموعة`,
      });

      // إعادة جلب البيانات
      await fetchDuplicates();

    } catch (error: any) {
      toast({
        title: 'خطأ في التنظيف',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCleaning(false);
    }
  };

  // جلب الفواتير بتواريخ خاطئة (ليست في يوم 1)
  const fetchWrongDateInvoices = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // جلب جميع الفواتير للشركة بدون limit
      let allInvoices: any[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('invoices')
          .select(`
            id, invoice_number, invoice_date, due_date, contract_id,
            contracts (contract_number)
          `)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .order('due_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (batchError) throw batchError;
        if (!batch || batch.length === 0) break;
        
        allInvoices = [...allInvoices, ...batch];
        page++;
        
        if (batch.length < pageSize) break;
      }
      
      const invoices = allInvoices;
      console.log(`📊 Total invoices fetched: ${invoices?.length || 0}`);

      // تجميع الفواتير حسب العقد والشهر
      const groupedByContractMonth = new Map<string, typeof invoices>();
      for (const inv of invoices || []) {
        const date = inv.due_date || inv.invoice_date;
        if (!date) continue;
        if (!inv.contract_id) continue; // تخطي الفواتير بدون عقد
        const month = date.substring(0, 7);
        const key = `${inv.contract_id}|${month}`;
        if (!groupedByContractMonth.has(key)) {
          groupedByContractMonth.set(key, []);
        }
        groupedByContractMonth.get(key)!.push(inv);
      }

      // فلترة الفواتير التي ليست في يوم 1
      const wrongDates: WrongDateInvoice[] = [];
      for (const inv of invoices || []) {
        const date = inv.due_date || inv.invoice_date;
        if (!date) continue;
        
        const day = parseInt(date.split('-')[2] || '0');
        if (day !== 1) {
          const month = date.substring(0, 7);
          const key = `${inv.contract_id}|${month}`;
          const sameMonthInvoices = groupedByContractMonth.get(key) || [];
          
          // هل يوجد فاتورة بتاريخ يوم 1 لنفس العقد/الشهر؟
          const hasPrimaryInvoice = sameMonthInvoices.some(i => {
            const d = i.due_date || i.invoice_date;
            return d && d.endsWith('-01') && i.id !== inv.id;
          });
          
          wrongDates.push({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            oldDate: date,
            newDate: `${month}-01`,
            contractId: inv.contract_id,
            contractNumber: (inv.contracts as any)?.contract_number || 'غير معروف',
            hasPrimaryInvoice
          });
        }
      }

      setWrongDateInvoices(wrongDates);
      setDateFixResults(null);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // تصحيح تواريخ الفواتير (أو إلغاء المكررة) - معالجة متوازية
  const fixInvoiceDates = async () => {
    if (!wrongDateInvoices.length) return;
    
    setFixingDates(true);
    let fixed = 0;
    let cancelled = 0;
    let failed = 0;

    try {
      // معالجة بـ batches من 20 فاتورة في نفس الوقت
      const BATCH_SIZE = 20;
      
      for (let i = 0; i < wrongDateInvoices.length; i += BATCH_SIZE) {
        const batch = wrongDateInvoices.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(batch.map(async (inv) => {
          if (inv.hasPrimaryInvoice) {
            // هذه فاتورة مكررة - يجب إلغاؤها
            const { error } = await supabase
              .from('invoices')
              .update({
                status: 'cancelled',
                notes: `ملغاة تلقائياً - فاتورة مكررة بتاريخ خاطئ (${inv.oldDate}) | تم الإلغاء: ${new Date().toISOString()}`
              })
              .eq('id', inv.id);

            return { type: error ? 'failed' : 'cancelled' };
          } else {
            // محاولة تصحيح التاريخ أولاً
            const { error } = await supabase
              .from('invoices')
              .update({
                invoice_date: inv.newDate,
                due_date: inv.newDate
              })
              .eq('id', inv.id);

            if (error) {
              // إذا فشل، نلغي الفاتورة بدلاً من ذلك
              const { error: cancelError } = await supabase
                .from('invoices')
                .update({
                  status: 'cancelled',
                  notes: `ملغاة تلقائياً - تعارض مع فاتورة موجودة بتاريخ ${inv.newDate} | تم الإلغاء: ${new Date().toISOString()}`
                })
                .eq('id', inv.id);
              
              return { type: cancelError ? 'failed' : 'cancelled' };
            } else {
              return { type: 'fixed' };
            }
          }
        }));

        // حساب النتائج
        for (const r of results) {
          if (r.type === 'fixed') fixed++;
          else if (r.type === 'cancelled') cancelled++;
          else failed++;
        }
        
        // تحديث الـ UI كل batch
        console.log(`📊 Progress: ${i + batch.length}/${wrongDateInvoices.length} (Fixed: ${fixed}, Cancelled: ${cancelled}, Failed: ${failed})`);
      }

      setDateFixResults({ fixed: fixed + cancelled, failed });
      
      toast({
        title: 'تم المعالجة',
        description: `تم تصحيح ${fixed} فاتورة وإلغاء ${cancelled} فاتورة${failed > 0 ? ` (فشل: ${failed})` : ''}`,
      });

      // إعادة جلب البيانات
      await fetchWrongDateInvoices();

    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setFixingDates(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchDuplicates();
      fetchWrongDateInvoices();
    }
  }, [companyId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-QA');
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('ar-QA', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">صيانة الفواتير</h1>
        <p className="text-muted-foreground">
          تنظيف الفواتير المكررة وتصحيح تواريخ الفواتير القديمة
        </p>
      </div>

      <Tabs defaultValue="duplicates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            الفواتير المكررة
            {duplicates.length > 0 && (
              <Badge variant="destructive" className="mr-2">{duplicates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dates" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            تصحيح التواريخ
            {wrongDateInvoices.length > 0 && (
              <Badge variant="secondary" className="mr-2">{wrongDateInvoices.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates">
      {cleanupResults && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">تم التنظيف بنجاح</AlertTitle>
          <AlertDescription className="text-green-700">
            تم تنظيف {cleanupResults.groupsCleaned} مجموعة وإلغاء {cleanupResults.invoicesCancelled} فاتورة مكررة
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 mb-6">
        <Button onClick={fetchDuplicates} disabled={loading} variant="outline">
          <RefreshCcw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
        
        {duplicates.length > 0 && (
          <Button 
            onClick={cleanupDuplicates} 
            disabled={cleaning}
            variant="destructive"
          >
            {cleaning ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 ml-2" />
            )}
            تنظيف الكل ({duplicates.reduce((sum, g) => sum + g.invoices.length - 1, 0)} فاتورة)
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : duplicates.length === 0 ? (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">لا توجد فواتير مكررة</AlertTitle>
          <AlertDescription className="text-green-700">
            النظام نظيف! لا توجد فواتير مكررة لنفس العقد في نفس الشهر.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">
              تم العثور على {duplicates.length} مجموعة من الفواتير المكررة
            </AlertTitle>
            <AlertDescription className="text-yellow-700">
              سيتم الاحتفاظ بأول فاتورة (الأقدم) في كل مجموعة وإلغاء البقية. 
              الدفعات المرتبطة بالفواتير الملغاة سيتم نقلها للفاتورة الأساسية.
            </AlertDescription>
          </Alert>

          {duplicates.map((group, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      عقد #{group.contractNumber}
                    </CardTitle>
                    <CardDescription>
                      شهر: {formatMonth(group.invoiceMonth)} • {group.invoices.length} فواتير
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">
                    {group.invoices.length - 1} مكررة
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.invoices.map((inv, i) => (
                    <div 
                      key={inv.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        inv.isPrimary 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {inv.isPrimary ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Trash2 className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">{inv.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(inv.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">
                          {inv.amount?.toLocaleString('ar-QA')} ر.ق
                        </div>
                        <Badge variant={inv.isPrimary ? 'default' : 'destructive'} className="text-xs">
                          {inv.isPrimary ? 'سيتم الاحتفاظ بها' : 'سيتم إلغاؤها'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="dates">
          {dateFixResults && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">تم التصحيح</AlertTitle>
              <AlertDescription className="text-green-700">
                تم تصحيح {dateFixResults.fixed} فاتورة
                {dateFixResults.failed > 0 && ` (فشل: ${dateFixResults.failed})`}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mb-6">
            <Button onClick={fetchWrongDateInvoices} disabled={loading} variant="outline">
              <RefreshCcw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            
            {wrongDateInvoices.length > 0 && (
              <Button 
                onClick={fixInvoiceDates} 
                disabled={fixingDates}
                variant="default"
              >
                {fixingDates ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 ml-2" />
                )}
                تصحيح الكل ({wrongDateInvoices.length} فاتورة)
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : wrongDateInvoices.length === 0 ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">جميع التواريخ صحيحة</AlertTitle>
              <AlertDescription className="text-green-700">
                جميع الفواتير تاريخها في يوم 1 من الشهر كما هو مطلوب.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">
                  تم العثور على {wrongDateInvoices.length} فاتورة بتاريخ غير صحيح
                </AlertTitle>
                <AlertDescription className="text-yellow-700">
                  <strong className="text-red-600">{wrongDateInvoices.filter(i => i.hasPrimaryInvoice).length}</strong> فاتورة مكررة سيتم إلغاؤها، 
                  <strong className="text-green-600"> {wrongDateInvoices.filter(i => !i.hasPrimaryInvoice).length}</strong> فاتورة سيتم تصحيح تاريخها
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>فواتير تحتاج معالجة</CardTitle>
                  <CardDescription>
                    🔴 الحمراء = مكررة وسيتم إلغاؤها | 🟡 الصفراء = سيتم تصحيح تاريخها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {wrongDateInvoices.map((inv) => (
                      <div 
                        key={inv.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          inv.hasPrimaryInvoice 
                            ? 'bg-red-50 border border-red-200' 
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {inv.hasPrimaryInvoice ? (
                            <Trash2 className="h-5 w-5 text-red-600" />
                          ) : (
                            <Calendar className="h-5 w-5 text-yellow-600" />
                          )}
                          <div>
                            <div className="font-medium">{inv.invoiceNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              عقد: {inv.contractNumber}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">{formatDate(inv.oldDate)}</Badge>
                          <span>→</span>
                          {inv.hasPrimaryInvoice ? (
                            <Badge variant="destructive">إلغاء</Badge>
                          ) : (
                            <Badge variant="default">{formatDate(inv.newDate)}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
