import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { useLinkPaymentToCustomer, PaymentLinkingData } from '@/hooks/usePaymentLinking';
import { Loader2, Link, Receipt } from 'lucide-react';

const linkingSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  shouldCreateInvoice: z.boolean().default(true),
  invoiceNumber: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type LinkingFormData = z.infer<typeof linkingSchema>;

interface PaymentLinkingDialogProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentLinkingDialog: React.FC<PaymentLinkingDialogProps> = ({
  payment,
  open,
  onOpenChange,
}) => {
  const linkPaymentMutation = useLinkPaymentToCustomer();
  
  const form = useForm<LinkingFormData>({
    resolver: zodResolver(linkingSchema),
    defaultValues: {
      customerId: '',
      shouldCreateInvoice: true,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `فاتورة مُنشأة تلقائياً للدفعة ${payment?.payment_number || ''}`,
    },
  });

  const shouldCreateInvoice = form.watch('shouldCreateInvoice');

  const onSubmit = async (data: LinkingFormData) => {
    if (!payment) return;

    const linkingData: PaymentLinkingData = {
      paymentId: payment.id,
      customerId: data.customerId,
      shouldCreateInvoice: data.shouldCreateInvoice,
      invoiceData: data.shouldCreateInvoice ? {
        invoice_number: data.invoiceNumber,
        due_date: data.dueDate,
        notes: data.notes,
      } : undefined,
    };

    try {
      await linkPaymentMutation.mutateAsync(linkingData);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error linking payment:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            ربط الدفعة بالعميل
          </DialogTitle>
          <DialogDescription>
            ربط الدفعة رقم {payment?.payment_number} بعميل وإنشاء فاتورة اختيارية
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العميل *</FormLabel>
                  <FormControl>
                    <CustomerSelector
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="اختر العميل"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shouldCreateInvoice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      إنشاء فاتورة
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      إنشاء فاتورة مربوطة بهذه الدفعة
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {shouldCreateInvoice && (
              <>
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الفاتورة (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="سيتم توليده تلقائياً إذا ترك فارغاً" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الاستحقاق</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="ملاحظات على الفاتورة" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={linkPaymentMutation.isPending}
                className="flex-1"
              >
                {linkPaymentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                ربط الدفعة
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};