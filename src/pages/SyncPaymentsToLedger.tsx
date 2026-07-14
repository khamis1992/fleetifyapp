import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type RentalReceipt = Database['public']['Tables']['rental_payment_receipts']['Row'];
type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'debit_card';

interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: Array<{ payment_id: string; error: string }>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
    return [candidate.message, candidate.details, candidate.hint]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' - ') || String(error);
  }
  return String(error);
};

const normalizePaymentMethod = (method: string | null): PaymentMethod => {
  const supported: PaymentMethod[] = ['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card'];
  return supported.includes(method as PaymentMethod) ? method as PaymentMethod : 'cash';
};

const getMigrationKey = (receiptId: string): string => `legacy-rental-receipt:${receiptId}`;

const SyncPaymentsToLedger = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const { createPayment } = usePaymentOperations({
    autoCreateJournalEntry: true,
    autoUpdateBankBalance: true,
    enableNotifications: false,
  });

  const addLog = (message: string) => {
    setLogs(previous => [...previous, `[${new Date().toLocaleTimeString('en-US')}] ${message}`]);
  };

  const findExistingCanonicalPayment = async (receipt: RentalReceipt) => {
    const migrationKey = getMigrationKey(receipt.id);
    const { data: keyedPayment, error: keyedError } = await supabase
      .from('payments')
      .select('id,payment_number,journal_entry_id')
      .eq('company_id', receipt.company_id)
      .eq('reference_number', migrationKey)
      .neq('payment_status', 'cancelled')
      .limit(1)
      .maybeSingle();
    if (keyedError) throw keyedError;
    if (keyedPayment) return { payment: keyedPayment, ambiguous: false };

    let matchingQuery = supabase
      .from('payments')
      .select('id,payment_number,journal_entry_id')
      .eq('company_id', receipt.company_id)
      .eq('customer_id', receipt.customer_id)
      .eq('payment_date', receipt.payment_date)
      .eq('amount', receipt.total_paid)
      .neq('payment_status', 'cancelled');

    if (receipt.contract_id) matchingQuery = matchingQuery.eq('contract_id', receipt.contract_id);
    const { data: matches, error: matchesError } = await matchingQuery.limit(2);
    if (matchesError) throw matchesError;
    return {
      payment: matches?.length === 1 ? matches[0] : null,
      ambiguous: (matches?.length || 0) > 1,
    };
  };

  const migrateReceipt = async (receipt: RentalReceipt) => {
    if (receipt.total_paid <= 0) {
      return { status: 'skipped' as const, message: 'الإيصال لا يحتوي مبلغًا مدفوعًا موجبًا' };
    }

    const existing = await findExistingCanonicalPayment(receipt);
    if (existing.ambiguous) {
      throw new Error('توجد عدة دفعات قانونية مطابقة؛ يلزم تدقيق يدوي قبل الربط');
    }
    if (existing.payment) {
      if (!existing.payment.journal_entry_id) {
        const { error } = await supabase.rpc('ensure_payment_journal_entry', {
          p_company_id: receipt.company_id,
          p_payment_id: existing.payment.id,
        });
        if (error) throw error;
      }
      return { status: 'skipped' as const, message: `مرتبطة بالدفعة ${existing.payment.payment_number}` };
    }

    const { data: legacyJournal, error: legacyError } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', receipt.company_id)
      .eq('reference_type', 'rental_payment')
      .eq('reference_id', receipt.id)
      .neq('status', 'reversed')
      .limit(1)
      .maybeSingle();
    if (legacyError) throw legacyError;
    if (legacyJournal) {
      return {
        status: 'skipped' as const,
        message: `يوجد قيد قديم ${legacyJournal.entry_number}؛ أوقفت الهجرة لمنع تكرار الأثر المالي`,
      };
    }

    await createPayment.mutateAsync({
      contract_id: receipt.contract_id || undefined,
      customer_id: receipt.customer_id,
      invoice_id: receipt.invoice_id || undefined,
      amount: receipt.total_paid,
      payment_date: receipt.payment_date,
      payment_method: normalizePaymentMethod(receipt.payment_method),
      notes: [
        `ترحيل إيصال إيجار قديم ${receipt.receipt_number || receipt.id}`,
        receipt.notes,
      ].filter(Boolean).join(' - '),
      type: 'receipt',
      transaction_type: 'customer_payment',
      payment_status: 'completed',
      currency: 'QAR',
      idempotencyKey: getMigrationKey(receipt.id),
      registrationMetadata: {
        monthly_amount: receipt.rent_amount,
        amount_paid: receipt.total_paid,
        remaining_amount: receipt.pending_balance,
        payment_month: receipt.month,
        due_date: receipt.payment_date,
        late_fee_amount: receipt.fine,
      },
    });

    return { status: 'synced' as const, message: 'تم إنشاء دفعة قانونية وقيدها المحاسبي' };
  };

  const handleSync = async () => {
    if (!companyId) {
      toast({ title: 'تعذر البدء', description: 'لم يتم تحديد الشركة الحالية', variant: 'destructive' });
      return;
    }

    setIsSyncing(true);
    setProgress(0);
    setResult(null);
    setLogs([]);

    const syncResult: SyncResult = { total: 0, synced: 0, skipped: 0, failed: 0, errors: [] };

    try {
      addLog('جاري جلب إيصالات الإيجار القديمة للشركة الحالية');
      const { data: receipts, error } = await supabase
        .from('rental_payment_receipts')
        .select('*')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: true });
      if (error) throw error;

      const receiptList = receipts || [];
      syncResult.total = receiptList.length;
      if (syncResult.total === 0) {
        addLog('لا توجد إيصالات قديمة تحتاج مراجعة');
        setResult(syncResult);
        return;
      }

      for (let index = 0; index < receiptList.length; index += 1) {
        const receipt = receiptList[index];
        try {
          const migration = await migrateReceipt(receipt);
          if (migration.status === 'synced') syncResult.synced += 1;
          else syncResult.skipped += 1;
          addLog(`[${index + 1}/${syncResult.total}] ${receipt.customer_name}: ${migration.message}`);
        } catch (receiptError) {
          const message = getErrorMessage(receiptError);
          syncResult.failed += 1;
          syncResult.errors.push({ payment_id: receipt.id, error: message });
          addLog(`[${index + 1}/${syncResult.total}] فشل ${receipt.customer_name}: ${message}`);
        }
        setProgress(((index + 1) / syncResult.total) * 100);
      }

      setResult(syncResult);
      toast({
        title: 'اكتملت مراجعة المزامنة',
        description: `أُنشئت ${syncResult.synced} دفعة، وتُخطيت ${syncResult.skipped}، وفشلت ${syncResult.failed}`,
        variant: syncResult.failed > 0 ? 'destructive' : 'default',
      });
    } catch (syncError) {
      const message = getErrorMessage(syncError);
      addLog(`توقفت المزامنة: ${message}`);
      toast({ title: 'فشل المزامنة', description: message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">مزامنة إيصالات الإيجار القديمة</CardTitle>
          <CardDescription>
            تحويل الإيصالات القديمة إلى دفعات قانونية مرتبطة بقيود محاسبية دون تكرار الأثر المالي.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              تتوقف الأداة تلقائيًا عند وجود قيد قديم أو أكثر من دفعة مطابقة. هذه الحالات تحتاج مراجعة قبل أي ترحيل جديد.
            </AlertDescription>
          </Alert>

          <Button onClick={handleSync} disabled={isSyncing || !companyId} size="lg" className="w-full">
            {isSyncing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
            {isSyncing ? 'جاري المزامنة' : 'بدء المزامنة الآمنة'}
          </Button>

          {isSyncing && <Progress value={progress} className="w-full" />}

          {result && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{result.total}</div><div className="text-sm text-muted-foreground">الإجمالي</div></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600"><CheckCircle2 className="h-5 w-5" />{result.synced}</div><div className="text-sm text-muted-foreground">تمت مزامنتها</div></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-blue-600">{result.skipped}</div><div className="text-sm text-muted-foreground">تم تخطيها بأمان</div></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><div className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600"><XCircle className="h-5 w-5" />{result.failed}</div><div className="text-sm text-muted-foreground">تحتاج مراجعة</div></CardContent></Card>
            </div>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">سجل العمليات</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto rounded bg-slate-950 p-4 font-mono text-sm text-slate-50">
                  {logs.map((log, index) => <div key={`${index}-${log}`} className="mb-1">{log}</div>)}
                </div>
              </CardContent>
            </Card>
          )}

          {result && result.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>حالات تحتاج مراجعة:</strong>
                <ul className="mt-2 list-disc pr-6">
                  {result.errors.map(error => <li key={error.payment_id}>{error.payment_id}: {error.error}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncPaymentsToLedger;
