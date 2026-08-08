import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRunAgentReview } from '@/hooks/useAgentReviews';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export function PaymentMatchAssistant() {
  const navigate = useNavigate();
  const { companyId } = useUnifiedCompanyAccess();
  const runAgent = useRunAgentReview('payment_match');
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [payerName, setPayerName] = React.useState('');
  const [result, setResult] = React.useState<{
    matched: boolean;
    invoiceNumber: string | null;
    customerId: string | null;
    contractId: string | null;
    confidence: number;
    reasoning: string;
  } | null>(null);

  const runMatch = async () => {
    if (!companyId || !Number(amount)) return;
    const data = await runAgent.mutateAsync({
      companyId,
      amount: Number(amount),
      payerName: payerName.trim() || undefined,
    });
    setResult({
      matched: Boolean(data.matched),
      invoiceNumber: data.invoiceNumber || null,
      customerId: data.customerId || null,
      contractId: data.contractId || null,
      confidence: Number(data.confidence || 0),
      reasoning: data.reasoning || '',
    });
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => { setResult(null); setOpen(true); }}
        className="w-full gap-2 rounded-xl border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] hover:bg-[#E0E7FF]"
      >
        <Brain className="h-4 w-4" />
        مطابقة دفعة غامضة بالوكيل
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#3730A3]" />
              مطابقة دفعة غامضة
            </DialogTitle>
            <DialogDescription className="text-right">
              للدفعات الواردة بدون رقم عقد أو باسم مختلف — الوكيل يقترح الفاتورة الأقرب.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="match-amount">المبلغ</Label>
                <Input id="match-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="match-name">اسم الدافع (اختياري)</Label>
                <Input id="match-name" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="كما ورد في الحوالة" />
              </div>
            </div>

            {result && (
              <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3 text-sm">
                {result.matched ? (
                  <>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        تطابق {Math.round(result.confidence * 100)}%
                      </Badge>
                      <span className="font-bold text-[#142033]">فاتورة {result.invoiceNumber}</span>
                    </div>
                    <p className="leading-6 text-[#475569]">{result.reasoning}</p>
                  </>
                ) : (
                  <p className="text-[#8A3028]">لم يجد الوكيل تطابقاً موثوقاً — راجع يدوياً.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {result?.matched && result.customerId && (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  navigate(`/customers/${result.customerId}`);
                }}
              >
                فتح ملف العميل
              </Button>
            )}
            <Button onClick={runMatch} disabled={runAgent.isPending || !Number(amount)} className="gap-2 bg-[#3730A3] text-white hover:bg-[#312E81]">
              {runAgent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              مطابقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
