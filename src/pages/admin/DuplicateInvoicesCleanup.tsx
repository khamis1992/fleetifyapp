import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, RefreshCcw, Replace } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { UnifiedInvoiceService } from '@/services/UnifiedInvoiceService';
import { getInvoiceBillingMonthKey } from '@/utils/invoiceBillingMonth';

interface DuplicateInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: string;
  hasFinancialHistory: boolean;
  isPrimary: boolean;
}

interface DuplicateGroup {
  contractId: string;
  contractNumber: string;
  invoiceMonth: string;
  invoices: DuplicateInvoice[];
}

interface CleanupResult {
  merged: number;
  failed: number;
  errors: string[];
}

export default function DuplicateInvoicesCleanup() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();

  const fetchDuplicates = async () => {
    if (!companyId) return;
    setLoading(true);
    setCleanupResult(null);

    try {
      const allInvoices: Array<Record<string, any>> = [];
      const pageSize = 1000;
      let page = 0;

      while (true) {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            id, invoice_number, invoice_date, invoice_month, due_date, total_amount,
            invoice_type, currency, customer_id, contract_id, status,
            payment_status, paid_amount, journal_entry_id, created_at,
            contracts (contract_number)
          `)
          .eq('company_id', companyId)
          .not('contract_id', 'is', null)
          .not('status', 'in', '(cancelled,canceled,void,voided,deleted)')
          .order('created_at', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data?.length) break;
        allInvoices.push(...data);
        if (data.length < pageSize) break;
        page += 1;
      }

      const grouped = new Map<string, DuplicateGroup>();
      for (const invoice of allInvoices) {
        const invoiceDate = String(invoice.invoice_date || '');
        const invoiceMonth = getInvoiceBillingMonthKey(invoice);
        if (!invoiceMonth || !invoice.contract_id) continue;

        const key = [
          invoice.contract_id,
          invoiceMonth,
          invoice.invoice_type,
          Number(invoice.total_amount || 0).toFixed(2),
          String(invoice.currency || 'QAR').toUpperCase(),
          invoice.customer_id || 'no-customer',
        ].join('|');

        if (!grouped.has(key)) {
          grouped.set(key, {
            contractId: invoice.contract_id,
            contractNumber: invoice.contracts?.contract_number || 'غير معروف',
            invoiceMonth,
            invoices: [],
          });
        }

        grouped.get(key)?.invoices.push({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          date: invoiceDate,
          amount: Number(invoice.total_amount || 0),
          status: invoice.status,
          hasFinancialHistory: Boolean(
            invoice.journal_entry_id
            || Number(invoice.paid_amount || 0) > 0.01
            || ['paid', 'partial'].includes(String(invoice.payment_status || '').toLowerCase())
          ),
          isPrimary: false,
        });
      }

      const duplicateGroups = Array.from(grouped.values())
        .filter((group) => group.invoices.length > 1)
        .map((group) => {
          const financialInvoices = group.invoices.filter((invoice) => invoice.hasFinancialHistory);
          const primaryId = financialInvoices.length === 1
            ? financialInvoices[0].id
            : group.invoices[0].id;
          return {
            ...group,
            invoices: group.invoices.map((invoice) => ({
              ...invoice,
              isPrimary: invoice.id === primaryId,
            })),
          };
        })
        .sort((left, right) => right.invoices.length - left.invoices.length);

      setDuplicates(duplicateGroups);
    } catch (error) {
      toast({
        title: 'تعذر فحص الفواتير',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicates = async () => {
    setCleaning(true);
    const result: CleanupResult = { merged: 0, failed: 0, errors: [] };

    try {
      for (const group of duplicates) {
        const primary = group.invoices.find((invoice) => invoice.isPrimary);
        if (!primary) continue;

        for (const duplicate of group.invoices.filter((invoice) => !invoice.isPrimary)) {
          const mergeResult = await UnifiedInvoiceService.mergeDuplicateInvoices(primary.id, duplicate.id);
          if (mergeResult.success) {
            result.merged += 1;
          } else {
            result.failed += 1;
            result.errors.push(`${duplicate.invoiceNumber}: ${mergeResult.error || 'تحتاج مراجعة مالية'}`);
          }
        }

        await UnifiedInvoiceService.recalculateInvoiceBalance(primary.id);
      }

      setCleanupResult(result);
      toast({
        title: result.failed === 0 ? 'اكتمل الدمج الآمن' : 'اكتمل مع عناصر للمراجعة',
        description: `تم دمج ${result.merged} فاتورة، وتوقفت ${result.failed} فاتورة لحماية السجل المالي.`,
        variant: result.failed === 0 ? 'default' : 'destructive',
      });
      await fetchDuplicates();
      setCleanupResult(result);
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    void fetchDuplicates();
  }, [companyId]);

  const formatMonth = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, monthNumber - 1).toLocaleDateString('ar-QA', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">الفواتير المكررة</h1>
        <p className="text-muted-foreground">دمج الفواتير المتطابقة التي لا تحمل أثرًا ماليًا.</p>
      </div>

      {cleanupResult && (
        <Alert variant={cleanupResult.failed > 0 ? 'destructive' : 'default'}>
          {cleanupResult.failed > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertTitle>نتيجة المعالجة</AlertTitle>
          <AlertDescription>
            تم دمج {cleanupResult.merged}، وتحتاج {cleanupResult.failed} فاتورة إلى مراجعة.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={fetchDuplicates} disabled={loading} variant="outline">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
        {duplicates.length > 0 && (
          <Button onClick={cleanupDuplicates} disabled={cleaning}>
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
            دمج الآمن ({duplicates.reduce((total, group) => total + group.invoices.length - 1, 0)})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : duplicates.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertTitle>لا توجد فواتير متطابقة مكررة</AlertTitle>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {duplicates.map((group) => (
            <Card key={`${group.contractId}-${group.invoiceMonth}`} className="rounded-[8px]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">عقد {group.contractNumber}</CardTitle>
                  <Badge variant="destructive">{group.invoices.length - 1} مكررة</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{formatMonth(group.invoiceMonth)}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between border-b py-2 last:border-b-0">
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{invoice.date}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">{invoice.amount.toLocaleString('ar-QA')} ر.ق</div>
                      <Badge variant={invoice.isPrimary ? 'default' : 'outline'}>
                        {invoice.isPrimary ? 'الأساسية' : invoice.hasFinancialHistory ? 'مراجعة' : 'قابلة للدمج'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {cleanupResult?.errors.length ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{cleanupResult.errors.slice(0, 8).join(' | ')}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
