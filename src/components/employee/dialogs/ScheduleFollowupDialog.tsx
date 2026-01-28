/**
 * Schedule Follow-up Dialog
 * حوار جدولة متابعة مع العميل
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
import { Loader2, Calendar, CheckCircle, Clock } from 'lucide-react';

// Validation Schema
const followupSchema = z.object({
  contract_id: z.string().min(1, 'يجب اختيار العقد'),
  followup_type: z.enum([
    'payment_collection',
    'contract_renewal',
    'general_check_in',
    'complaint_follow_up',
    'document_collection',
    'other'
  ]),
  scheduled_date: z.string().min(1, 'يجب تحديد التاريخ'),
  scheduled_time: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  title: z.string().min(3, 'يجب كتابة عنوان المتابعة'),
  notes: z.string().optional(),
});

type FollowupFormData = z.infer<typeof followupSchema>;

interface ScheduleFollowupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Array<{
    id: string;
    contract_number: string;
    customer_name: string;
  }>;
  preselectedContractId?: string;
}

export const ScheduleFollowupDialog: React.FC<ScheduleFollowupDialogProps> = ({
  open,
  onOpenChange,
  contracts,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FollowupFormData>({
    resolver: zodResolver(followupSchema),
    defaultValues: {
      contract_id: preselectedContractId || '',
      followup_type: 'payment_collection',
      scheduled_date: '',
      scheduled_time: '09:00',
      priority: 'medium',
      title: '',
      notes: '',
    },
  });

  const selectedContract = contracts.find(
    (c) => c.id === form.watch('contract_id')
  );

  // Mutation to schedule follow-up
  const scheduleFollowupMutation = useMutation({
    mutationFn: async (data: FollowupFormData) => {
      const contract = contracts.find((c) => c.id === data.contract_id);
      if (!contract) throw new Error('Contract not found');

      const { data: followup, error } = await supabase
        .from('scheduled_followups')
        .insert({
          contract_id: data.contract_id,
          assigned_to: user?.profile?.id,
          followup_type: data.followup_type,
          scheduled_date: data.scheduled_date,
          scheduled_time: data.scheduled_time || null,
          priority: data.priority,
          title: data.title,
          title_ar: data.title,
          notes: data.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return followup;
    },
    onSuccess: () => {
      toast.success('تم جدولة المتابعة بنجاح', {
        description: 'سيتم تذكيرك في الموعد المحدد',
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });
      
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل جدولة المتابعة', {
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
      });
    },
  });

  const onSubmit = async (data: FollowupFormData) => {
    setIsSubmitting(true);
    try {
      await scheduleFollowupMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick date buttons
  const setQuickDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    form.setValue('scheduled_date', date.toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            جدولة متابعة
          </DialogTitle>
          <DialogDescription>
            حدد موعد للمتابعة مع العميل وسيتم تذكيرك في الوقت المناسب
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

            {/* Follow-up Type */}
            <FormField
              control={form.control}
              name="followup_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع المتابعة *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payment_collection">تحصيل دفعة</SelectItem>
                      <SelectItem value="contract_renewal">تجديد عقد</SelectItem>
                      <SelectItem value="general_check_in">متابعة عامة</SelectItem>
                      <SelectItem value="complaint_follow_up">متابعة شكوى</SelectItem>
                      <SelectItem value="document_collection">استلام مستندات</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان المتابعة *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: متابعة دفعة شهر يناير" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick Date Selection */}
            <div>
              <FormLabel>اختيار سريع للتاريخ</FormLabel>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(0)}
                  className="text-xs"
                >
                  اليوم
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(1)}
                  className="text-xs"
                >
                  غداً
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(3)}
                  className="text-xs"
                >
                  بعد 3 أيام
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(7)}
                  className="text-xs"
                >
                  بعد أسبوع
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Scheduled Date */}
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scheduled Time */}
              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوقت</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الأولوية *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">منخفضة 🟢</SelectItem>
                      <SelectItem value="medium">متوسطة 🟡</SelectItem>
                      <SelectItem value="high">عالية 🟠</SelectItem>
                      <SelectItem value="urgent">عاجلة 🔴</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="أي تفاصيل إضافية عن المتابعة..."
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
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    جدولة المتابعة
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
