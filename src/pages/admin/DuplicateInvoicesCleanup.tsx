/**
 * صفحة تنظيف الفواتير المكررة
 * تسمح للمسؤولين بتنظيف الفواتير المكررة لنفس العقد في نفس الشهر
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

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

export default function DuplicateInvoicesCleanup() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<{
    groupsCleaned: number;
    invoicesCancelled: number;
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
      // جلب كل الفواتير النشطة للشركة
      const { data: invoices, error } = await supabase
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
        .order('created_at', { ascending: true });

      if (error) throw error;

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
      for (const group of duplicates) {
        const primaryInvoice = group.invoices.find(i => i.isPrimary);
        const duplicateInvoices = group.invoices.filter(i => !i.isPrimary);

        if (!primaryInvoice || !duplicateInvoices.length) continue;

        const duplicateIds = duplicateInvoices.map(i => i.id);
        
        // ملاحظة: لا نحاول نقل الدفعات لأنها قد تكون مكررة أيضاً
        // الدفعات ستبقى مرتبطة بالفواتير الملغاة ولكن الفواتير ستكون cancelled
        
        // إلغاء الفواتير المكررة
        for (const dup of duplicateInvoices) {
          const { error: cancelError } = await supabase
            .from('invoices')
            .update({
              status: 'cancelled',
              notes: `ملغاة تلقائياً - مكررة مع الفاتورة: ${primaryInvoice.invoiceNumber} | تم الإلغاء: ${new Date().toISOString()}`
            })
            .eq('id', dup.id);

          if (!cancelError) {
            invoicesCancelled++;
          }
        }

        groupsCleaned++;
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

  useEffect(() => {
    if (companyId) {
      fetchDuplicates();
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
        <h1 className="text-2xl font-bold mb-2">تنظيف الفواتير المكررة</h1>
        <p className="text-muted-foreground">
          هذه الصفحة تعرض الفواتير المكررة (أكثر من فاتورة لنفس العقد في نفس الشهر) وتسمح بتنظيفها
        </p>
      </div>

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
    </div>
  );
}
