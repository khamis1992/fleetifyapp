import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: Array<{ payment_id: string; error: string }>;
}

const SyncPaymentsToLedger: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString('en-US')}] ${message}`]);
  };

  const createJournalEntryForPayment = async (companyId: string, payment: any) => {
    try {
      // Get accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', companyId)
        .in('account_code', ['1010', '1200', '4110', '4200']);

      if (accountsError) throw accountsError;

      if (!accounts || accounts.length < 4) {
        throw new Error('Required accounts not found');
      }

      const cashAccount = accounts.find(a => a.account_code === '1010');
      const arAccount = accounts.find(a => a.account_code === '1200');
      const rentalRevenueAccount = accounts.find(a => a.account_code === '4110');
      const fineRevenueAccount = accounts.find(a => a.account_code === '4200');

      // Get next entry number
      const { data: lastEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('company_id', companyId)
        .order('entry_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = lastEntry ? parseInt(lastEntry.entry_number.split('-')[1]) + 1 : 1;
      const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: entryNumber,
          entry_date: payment.payment_date,
          description: `قيد إيراد تأجير - ${payment.customer_name} - ${payment.month}`,
          status: 'posted',
          reference_type: 'rental_payment',
          reference_id: payment.id
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create lines
      const lines: Array<{
        journal_entry_id: string;
        account_id: string;
        debit_amount: number;
        credit_amount: number;
        line_number: number;
        line_description: string;
      }> = [];

      let lineNum = 1;

      // Revenue recognition
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: arAccount!.id,
        debit_amount: payment.rent_amount,
        credit_amount: 0,
        line_number: lineNum++,
        line_description: `إيراد إيجار - ${payment.customer_name}`
      });

      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: rentalRevenueAccount!.id,
        debit_amount: 0,
        credit_amount: payment.rent_amount,
        line_number: lineNum++,
        line_description: `إيراد إيجار - ${payment.customer_name}`
      });

      // Fine (if any)
      if (payment.fine && payment.fine > 0) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: arAccount!.id,
          debit_amount: payment.fine,
          credit_amount: 0,
          line_number: lineNum++,
          line_description: `غرامة تأخير - ${payment.customer_name}`
        });

        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: fineRevenueAccount!.id,
          debit_amount: 0,
          credit_amount: payment.fine,
          line_number: lineNum++,
          line_description: `غرامة تأخير - ${payment.customer_name}`
        });
      }

      // Cash receipt
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: cashAccount!.id,
        debit_amount: payment.total_paid,
        credit_amount: 0,
        line_number: lineNum++,
        line_description: `استلام دفعة - ${payment.customer_name}`
      });

      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: arAccount!.id,
        debit_amount: 0,
        credit_amount: payment.total_paid,
        line_number: lineNum++,
        line_description: `استلام دفعة - ${payment.customer_name}`
      });

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return { success: true, entry_number: entryNumber };
    } catch (error: unknown) {
      return { success: false, error: error.message };
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setProgress(0);
    setResult(null);
    setLogs([]);

    const syncResult: SyncResult = {
      total: 0,
      synced: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    try {
      addLog('🔍 جاري البحث عن شركة العراف...');

      // Get current company from localStorage or session
      const companyData = localStorage.getItem('selectedCompany');
      if (!companyData) {
        throw new Error('لم يتم اختيار شركة. يرجى اختيار شركة العراف من القائمة أولاً.');
      }

      const company = JSON.parse(companyData);
      const companyId = company.id;

      addLog(`✅ تم العثور على الشركة: ${company.name}`);
      addLog(`📊 معرف الشركة: ${companyId}`);
      addLog('');

      // Fetch all rental payment receipts
      addLog('🔄 جاري جلب المدفوعات...');
      const { data: payments, error: fetchError } = await supabase
        .from('rental_payment_receipts')
        .select('*')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: true });

      if (fetchError) throw fetchError;

      if (!payments || payments.length === 0) {
        addLog('⚠️ لا توجد مدفوعات للمزامنة');
        toast({
          title: 'تنبيه',
          description: 'لا توجد مدفوعات للمزامنة',
          variant: 'default'
        });
        setIsSyncing(false);
        return;
      }

      syncResult.total = payments.length;
      addLog(`📊 تم العثور على ${syncResult.total} مدفوعات`);
      addLog('');

      // Process each payment
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        const currentProgress = ((i + 1) / payments.length) * 100;
        setProgress(currentProgress);

        try {
          // Check if already synced
          const { data: existingEntry } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('reference_type', 'rental_payment')
            .eq('reference_id', payment.id)
            .maybeSingle();

          if (existingEntry) {
            addLog(`⏭️ [${i+1}/${syncResult.total}] تم تخطي ${payment.customer_name} - تم المزامنة مسبقاً`);
            syncResult.skipped++;
            continue;
          }

          // Create journal entry
          addLog(`🔄 [${i+1}/${syncResult.total}] جاري إنشاء قيد لـ ${payment.customer_name} - ${payment.month}...`);
          const journalResult = await createJournalEntryForPayment(companyId, payment);

          if (journalResult.success) {
            addLog(`✅ [${i+1}/${syncResult.total}] تم إنشاء القيد ${journalResult.entry_number}`);
            syncResult.synced++;
          } else {
            addLog(`❌ [${i+1}/${syncResult.total}] فشل: ${journalResult.error}`);
            syncResult.failed++;
            syncResult.errors.push({ payment_id: payment.id, error: journalResult.error || 'Unknown error' });
          }

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: unknown) {
          addLog(`❌ [${i+1}/${syncResult.total}] خطأ: ${error.message}`);
          syncResult.failed++;
          syncResult.errors.push({ payment_id: payment.id, error: error.message });
        }
      }

      addLog('');
      addLog('📊 ملخص المزامنة:');
      addLog(`   إجمالي المدفوعات: ${syncResult.total}`);
      addLog(`   ✅ تمت المزامنة: ${syncResult.synced}`);
      addLog(`   ⏭️ تم التخطي: ${syncResult.skipped}`);
      addLog(`   ❌ فشلت: ${syncResult.failed}`);

      setResult(syncResult);
      setProgress(100);

      toast({
        title: 'اكتملت المزامنة',
        description: `تمت مزامنة ${syncResult.synced} من ${syncResult.total} مدفوعات`,
        variant: syncResult.failed > 0 ? 'destructive' : 'default'
      });

    } catch (error: unknown) {
      addLog(`❌ خطأ فادح: ${error.message}`);
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">مزامنة المدفوعات مع دفتر الأستاذ</CardTitle>
          <CardDescription>
            هذه الأداة تقوم بنقل جميع المدفوعات الموجودة في نظام تتبع المدفوعات إلى دفتر الأستاذ المحاسبي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>ملاحظة مهمة:</strong> تأكد من اختيار شركة العراف من القائمة قبل بدء المزامنة.
              <br />
              يجب أن تكون الحسابات التالية موجودة في دليل الحسابات:
              <ul className="list-disc mr-6 mt-2">
                <li>1010 - النقدية/البنك</li>
                <li>1200 - الذمم المدينة</li>
                <li>4110 - إيرادات التأجير</li>
                <li>4200 - إيرادات الغرامات</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="lg"
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المزامنة...
                </>
              ) : (
                '🔄 بدء المزامنة'
              )}
            </Button>
          </div>

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>التقدم</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {result && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{result.total}</div>
                    <div className="text-sm text-muted-foreground">إجمالي</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-5 w-5" />
                      {result.synced}
                    </div>
                    <div className="text-sm text-muted-foreground">تمت المزامنة</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.skipped}</div>
                    <div className="text-sm text-muted-foreground">تم التخطي</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                      <XCircle className="h-5 w-5" />
                      {result.failed}
                    </div>
                    <div className="text-sm text-muted-foreground">فشلت</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">سجل العمليات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result && result.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>حدثت أخطاء أثناء المزامنة:</strong>
                <ul className="list-disc mr-6 mt-2">
                  {result.errors.map((error, index) => (
                    <li key={index}>
                      {error.payment_id}: {error.error}
                    </li>
                  ))}
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

