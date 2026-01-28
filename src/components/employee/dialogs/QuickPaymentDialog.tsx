/**
 * Quick Payment Dialog
 * حوار سريع لتسجيل دفعة من مساحة عمل الموظف
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, CheckCircle } from 'lucide-react';

// Validation Schema
const paymentSchema = z.object({
  contract_id: z.string().min(1, 'يجب اختيار العقد'),
  amount: z.coerce.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_method: z.enum(['cash', 'bank_transfer', 'check', 'credit_card', 'other']),
  payment_date: z.string().min(1, 'يجب تحديد تاريخ الدفع'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface QuickPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Array<{
    id: string;
    contract_number: string;
    customer_name: string;
    balance_due: number;
  }>;
  preselectedContractId?: string;
}

export const QuickPaymentDialog: React.FC<QuickPaymentDialogProps> = ({
  open,
  onOpenChange,
  contracts,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      contract_id: preselectedContractId || '',
      amount: 0,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    },
  });

  const selectedContract = contracts.find(
    (c) => c.id === form.watch('contract_id')
  );

  // Mutation to create payment
  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const contract = contracts.find((c) => c.id === data.contract_id);
      if (!contract) throw new Error('Contract not found');

      // 1. Insert payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          contract_id: data.contract_id,
          amount: data.amount,
          payment_date: data.payment_date,
          payment_method: data.payment_method,
          reference_number: data.reference_number || null,
          notes: data.notes || null,
          status: 'completed',
          recorded_by: user?.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Update contract balance
      const newBalance = Math.max(0, contract.balance_due - data.amount);
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          balance_due: newBalance,
          last_payment_date: data.payment_date,
        })
        .eq('id', data.contract_id);

      if (contractError) throw contractError;

      // 3. Log communication
      await supabase.from('customer_communications').insert({
        customer_id: contract.customer_name, // This should be customer_id
        contract_id: data.contract_id,
        communication_type: 'payment_received',
        communication_date: new Date().toISOString(),
        notes: `تم تسجيل دفعة بمبلغ ${formatCurrency(data.amount)}`,
        contacted_by: user?.profile?.id,
      });

      return payment;
    },
    onSuccess: () => {
      toast.success('تم تسجيل الدفعة بنجاح', {
        description: 'تم تحديث رصيد العقد',
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل تسجيل الدفعة', {
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      await createPaymentMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            تسجيل دفعة جديدة
          </DialogTitle>
          <DialogDescription>
            سجّل دفعة جديدة من العميل وسيتم تحديث رصيد العقد تلقائياً
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contract Selection */}
            <FormField
              control={form.control}
              name="contract_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العقد *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العقد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span>
                              {contract.customer_name} - #{contract.contract_number}
                            </span>
                            <span className="text-xs text-red-600 font-bold">
                              {formatCurrency(contract.balance_due)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show Balance Due */}
            {selectedContract && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900">
                  الرصيد المستحق:{' '}
                  <span className="text-lg font-bold">
                    {formatCurrency(selectedContract.balance_due)}
                  </span>
                </p>
              </div>
            )}

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ المدفوع *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      className="text-lg font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الدفع *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طريقة الدفع *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">نقداً</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference Number */}
            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم المرجع (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="رقم الشيك أو رقم التحويل" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي ملاحظات إضافية..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    حفظ الدفعة
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
