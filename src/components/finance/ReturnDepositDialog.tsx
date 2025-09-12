import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReturnDeposit } from '@/hooks/useDeposits';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';

const returnSchema = z.object({
  returnAmount: z.number().min(0.001, 'المبلغ مطلوب ويجب أن يكون أكبر من صفر'),
  notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface ReturnDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit: any;
  maxAmount: number;
}

export function ReturnDepositDialog({ 
  open, 
  onOpenChange, 
  deposit,
  maxAmount 
}: ReturnDepositDialogProps) {
  const returnDeposit = useReturnDeposit();

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema.refine(
      (data) => data.returnAmount <= maxAmount,
      {
        message: `المبلغ يجب أن يكون أقل من أو يساوي ${formatCurrency(maxAmount)}`,
        path: ['returnAmount']
      }
    )),
    defaultValues: {
      returnAmount: maxAmount,
      notes: '',
    },
  });

  const onSubmit = async (data: ReturnFormData) => {
    try {
      await returnDeposit.mutateAsync({
        id: deposit.id,
        returnAmount: data.returnAmount,
        notes: data.notes,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error returning deposit:', error);
    }
  };

  const isLoading = returnDeposit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>استرداد الوديعة</DialogTitle>
          <DialogDescription>
            استرداد وديعة العميل رقم {deposit?.deposit_number}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">المبلغ الإجمالي:</span>
                <span className="font-mono">{formatCurrency(deposit?.amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">المُسترد سابقاً:</span>
                <span className="font-mono">{formatCurrency(deposit?.returned_amount || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">المتبقي للاسترداد:</span>
                <span className="font-mono font-bold">{formatCurrency(maxAmount)}</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="returnAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مبلغ الاسترداد (د.ك)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات الاسترداد</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="سبب الاسترداد أو أي ملاحظات..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                تأكيد الاسترداد
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}