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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { useBulkLinkPayments, PaymentLinkingData } from '@/hooks/usePaymentLinking';
import { Loader2, Users, Receipt, AlertTriangle } from 'lucide-react';

const bulkLinkingSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  shouldCreateInvoices: z.boolean().default(true),
  notes: z.string().optional(),
});

type BulkLinkingFormData = z.infer<typeof bulkLinkingSchema>;

interface BulkPaymentLinkingDialogProps {
  paymentIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const BulkPaymentLinkingDialog: React.FC<BulkPaymentLinkingDialogProps> = ({
  paymentIds,
  open,
  onOpenChange,
  onComplete,
}) => {
  const bulkLinkMutation = useBulkLinkPayments();
  
  const form = useForm<BulkLinkingFormData>({
    resolver: zodResolver(bulkLinkingSchema),
    defaultValues: {
      customerId: '',
      shouldCreateInvoices: true,
      notes: 'فواتير مُنشأة تلقائياً للمدفوعات المربوطة',
    },
  });

  const shouldCreateInvoices = form.watch('shouldCreateInvoices');

  const onSubmit = async (data: BulkLinkingFormData) => {
    if (paymentIds.length === 0) return;

    const linkingData: PaymentLinkingData[] = paymentIds.map(paymentId => ({
      paymentId,
      customerId: data.customerId,
      shouldCreateInvoice: data.shouldCreateInvoices,
      invoiceData: data.shouldCreateInvoices ? {
        notes: data.notes,
      } : undefined,
    }));

    try {
      await bulkLinkMutation.mutateAsync(linkingData);
      onComplete();
      form.reset();
    } catch (error) {
      console.error('Error in bulk linking:', error);
    }
  };

  const progressPercentage = bulkLinkMutation.isPending 
    ? Math.round(((bulkLinkMutation.data || []).length) / paymentIds.length * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ربط جماعي للمدفوعات
          </DialogTitle>
          <DialogDescription>
            ربط {paymentIds.length} دفعة بعميل واحد مع إنشاء فواتير اختيارية
          </DialogDescription>
        </DialogHeader>

        {bulkLinkMutation.isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>جاري الربط...</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">تنبيه مهم</p>
                  <p className="text-muted-foreground">
                    سيتم ربط جميع المدفوعات المحددة ({paymentIds.length} دفعة) بنفس العميل.
                    تأكد من صحة اختيارك قبل المتابعة.
                  </p>
                </div>
              </div>
            </div>

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
                      placeholder="اختر العميل لربط جميع المدفوعات به"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shouldCreateInvoices"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      إنشاء فواتير
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      إنشاء فاتورة منفصلة لكل دفعة
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

            {shouldCreateInvoices && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات للفواتير</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="ملاحظات ستظهر في جميع الفواتير المُنشأة" 
                        rows={3} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={bulkLinkMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={bulkLinkMutation.isPending}
                className="flex-1"
              >
                {bulkLinkMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                ربط {paymentIds.length} دفعة
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};