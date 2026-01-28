/**
 * Call Log Dialog
 * حوار تسجيل مكالمة مع العميل
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Loader2, Phone, CheckCircle } from 'lucide-react';

// Validation Schema
const callLogSchema = z.object({
  contract_id: z.string().min(1, 'يجب اختيار العقد'),
  call_type: z.enum(['outgoing', 'incoming']),
  call_outcome: z.enum(['answered', 'no_answer', 'busy', 'voicemail', 'wrong_number']),
  call_purpose: z.enum([
    'payment_reminder',
    'contract_renewal',
    'complaint_resolution',
    'general_inquiry',
    'follow_up',
    'other'
  ]),
  duration_minutes: z.coerce.number().min(0).optional(),
  notes: z.string().min(5, 'يجب كتابة ملاحظات عن المكالمة (5 أحرف على الأقل)'),
  follow_up_required: z.boolean().default(false),
  follow_up_date: z.string().optional(),
});

type CallLogFormData = z.infer<typeof callLogSchema>;

interface CallLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Array<{
    id: string;
    contract_number: string;
    customer_name: string;
    customer_id: string;
  }>;
  preselectedContractId?: string;
}

export const CallLogDialog: React.FC<CallLogDialogProps> = ({
  open,
  onOpenChange,
  contracts,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CallLogFormData>({
    resolver: zodResolver(callLogSchema),
    defaultValues: {
      contract_id: preselectedContractId || '',
      call_type: 'outgoing',
      call_outcome: 'answered',
      call_purpose: 'payment_reminder',
      duration_minutes: 0,
      notes: '',
      follow_up_required: false,
      follow_up_date: '',
    },
  });

  const selectedContract = contracts.find(
    (c) => c.id === form.watch('contract_id')
  );

  // Mutation to log call
  const logCallMutation = useMutation({
    mutationFn: async (data: CallLogFormData) => {
      const contract = contracts.find((c) => c.id === data.contract_id);
      if (!contract) throw new Error('Contract not found');

      // 1. Insert communication record
      const { data: communication, error: commError } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: contract.customer_id,
          contract_id: data.contract_id,
          communication_type: 'phone_call',
          communication_date: new Date().toISOString(),
          notes: `${data.call_purpose} - ${data.call_outcome}\n${data.notes}`,
          contacted_by: user?.profile?.id,
          metadata: {
            call_type: data.call_type,
            call_outcome: data.call_outcome,
            call_purpose: data.call_purpose,
            duration_minutes: data.duration_minutes,
          },
        })
        .select()
        .single();

      if (commError) throw commError;

      // 2. If follow-up required, create scheduled follow-up
      if (data.follow_up_required && data.follow_up_date) {
        await supabase.from('scheduled_followups').insert({
          contract_id: data.contract_id,
          assigned_to: user?.profile?.id,
          scheduled_date: data.follow_up_date,
          followup_type: data.call_purpose,
          status: 'pending',
          notes: `متابعة بعد مكالمة: ${data.notes}`,
        });
      }

      return communication;
    },
    onSuccess: () => {
      toast.success('تم تسجيل المكالمة بنجاح', {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });
      
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل تسجيل المكالمة', {
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
      });
    },
  });

  const onSubmit = async (data: CallLogFormData) => {
    setIsSubmitting(true);
    try {
      await logCallMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Phone className="w-5 h-5" />
            </div>
            تسجيل مكالمة
          </DialogTitle>
          <DialogDescription>
            سجّل تفاصيل المكالمة مع العميل لتتبع التواصل والأداء
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
                  <FormLabel>العقد / العميل *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العقد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.customer_name} - #{contract.contract_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Call Type */}
              <FormField
                control={form.control}
                name="call_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المكالمة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="outgoing">صادرة</SelectItem>
                        <SelectItem value="incoming">واردة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Call Outcome */}
              <FormField
                control={form.control}
                name="call_outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نتيجة المكالمة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="answered">تم الرد</SelectItem>
                        <SelectItem value="no_answer">لم يرد</SelectItem>
                        <SelectItem value="busy">مشغول</SelectItem>
                        <SelectItem value="voicemail">بريد صوتي</SelectItem>
                        <SelectItem value="wrong_number">رقم خاطئ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Call Purpose */}
            <FormField
              control={form.control}
              name="call_purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الغرض من المكالمة *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payment_reminder">تذكير بالدفع</SelectItem>
                      <SelectItem value="contract_renewal">تجديد العقد</SelectItem>
                      <SelectItem value="complaint_resolution">حل شكوى</SelectItem>
                      <SelectItem value="general_inquiry">استفسار عام</SelectItem>
                      <SelectItem value="follow_up">متابعة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة المكالمة (بالدقائق)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="5" {...field} />
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
                  <FormLabel>ملاحظات المكالمة *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ماذا تم مناقشته؟ ما هي النتائج؟"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up Required */}
            <FormField
              control={form.control}
              name="follow_up_required"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">
                    يتطلب متابعة لاحقة
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Follow-up Date (conditional) */}
            {form.watch('follow_up_required') && (
              <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ المتابعة</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    حفظ المكالمة
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
