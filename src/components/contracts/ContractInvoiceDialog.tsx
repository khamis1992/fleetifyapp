import { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, PlayCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useTourGuide } from '@/components/tour-guide';
import type { Contract } from '@/types/contracts';

interface ContractInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null | undefined;
  onSuccess?: () => void;
}

function monthKey(value: string): string {
  return value.slice(0, 7);
}

function defaultInvoiceMonth(contract: Contract | null | undefined): string {
  const today = new Date().toISOString().slice(0, 7);
  if (!contract?.start_date) return today;
  return monthKey(contract.start_date) > today ? monthKey(contract.start_date) : today;
}

export const ContractInvoiceDialog = ({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: ContractInvoiceDialogProps) => {
  const companyId = useCurrentCompanyId();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { startTour } = useTourGuide();
  const [invoiceMonth, setInvoiceMonth] = useState(() => defaultInvoiceMonth(contract));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setInvoiceMonth(defaultInvoiceMonth(contract));
  }, [open, contract?.id, contract?.start_date]);

  const monthStart = `${invoiceMonth}-01`;
  const nextMonthStart = useMemo(() => {
    const date = new Date(`${monthStart}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date.toISOString().slice(0, 10);
  }, [monthStart]);

  const { data: existingInvoice, isLoading: checkingInvoice } = useQuery({
    queryKey: ['contract-invoice-month', companyId, contract?.id, invoiceMonth],
    queryFn: async () => {
      if (!companyId || !contract?.id) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount')
        .eq('company_id', companyId)
        .eq('contract_id', contract.id)
        .gte('invoice_date', monthStart)
        .lt('invoice_date', nextMonthStart)
        .not('status', 'in', '(cancelled,canceled,void,voided,deleted)')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && Boolean(companyId && contract?.id && invoiceMonth),
  });

  const monthWithinContract = useMemo(() => {
    if (!contract?.start_date || !contract.end_date) return false;
    return invoiceMonth >= monthKey(contract.start_date) && invoiceMonth <= monthKey(contract.end_date);
  }, [contract?.start_date, contract?.end_date, invoiceMonth]);

  const createInvoice = async () => {
    if (!companyId || !contract?.id) {
      toast.error('تعذر تحديد العقد أو الشركة');
      return;
    }
    if (!monthWithinContract) {
      toast.error('شهر الفاتورة خارج فترة العقد');
      return;
    }
    if (existingInvoice) {
      toast.info(`الفاتورة ${existingInvoice.invoice_number} موجودة لهذا الشهر`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: invoiceId, error } = await supabase.rpc('generate_invoice_for_contract_month', {
        p_contract_id: contract.id,
        p_invoice_month: monthStart,
      });
      if (error) throw error;

      if (!invoiceId) {
        const { data: duplicate } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('company_id', companyId)
          .eq('contract_id', contract.id)
          .gte('invoice_date', monthStart)
          .lt('invoice_date', nextMonthStart)
          .not('status', 'in', '(cancelled,canceled,void,voided,deleted)')
          .limit(1)
          .maybeSingle();
        if (duplicate) {
          toast.info(`الفاتورة ${duplicate.invoice_number} موجودة لهذا الشهر`);
          return;
        }
        throw new Error('لم تُنشأ الفاتورة؛ تحقق من فترة العقد وقيمة القسط');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] }),
        queryClient.invalidateQueries({ queryKey: ['contract-invoice-month', companyId, contract.id] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
      ]);
      toast.success('تم إنشاء فاتورة الشهر بنجاح');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Contract invoice generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl" data-tour="contract-invoice-dialog">
        <DialogHeader>
          <div className="mb-2 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => startTour('contract-add-invoice')}>
              <PlayCircle className="ml-2 h-4 w-4" />
              الجولة التعريفية
            </Button>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إنشاء فاتورة للعقد {contract.contract_number}
          </DialogTitle>
          <DialogDescription>يُسمح بفاتورة نشطة واحدة فقط لكل شهر داخل فترة العقد.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invoice-month">شهر الفاتورة</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoice-month"
                type="month"
                value={invoiceMonth}
                min={monthKey(contract.start_date)}
                max={monthKey(contract.end_date)}
                onChange={event => setInvoiceMonth(event.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-y py-4 text-sm">
            <div>
              <p className="text-muted-foreground">قيمة القسط</p>
              <p className="font-semibold">{formatCurrency(contract.monthly_amount || contract.contract_amount || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">حالة الشهر</p>
              {checkingInvoice ? (
                <span>جارٍ التحقق...</span>
              ) : existingInvoice ? (
                <Badge variant="secondary">{existingInvoice.invoice_number}</Badge>
              ) : monthWithinContract ? (
                <Badge variant="outline">متاح</Badge>
              ) : (
                <Badge variant="destructive">خارج فترة العقد</Badge>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button
              type="button"
              onClick={createInvoice}
              disabled={isSubmitting || checkingInvoice || Boolean(existingInvoice) || !monthWithinContract}
            >
              {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء الفاتورة'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
