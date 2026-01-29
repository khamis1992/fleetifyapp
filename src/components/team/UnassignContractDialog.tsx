/**
 * Unassign Contract Dialog
 * حوار إلغاء تعيين عقد من موظف
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyContractUnassigned } from '@/utils/createNotification';

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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle, CheckCircle, AlertCircle } from 'lucide-react';

// Validation Schema
const unassignSchema = z.object({
  reason: z.enum([
    'employee_request',
    'performance_issue',
    'workload_balance',
    'contract_completed',
    'employee_leaving',
    'other'
  ]),
  notes: z.string().optional(),
});

type UnassignFormData = z.infer<typeof unassignSchema>;

interface UnassignContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  contractNumber?: string;
  employeeName?: string;
}

export const UnassignContractDialog: React.FC<UnassignContractDialogProps> = ({
  open,
  onOpenChange,
  contractId,
  contractNumber,
  employeeName,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UnassignFormData>({
    resolver: zodResolver(unassignSchema),
    defaultValues: {
      reason: 'workload_balance',
      notes: '',
    },
  });

  // Mutation to unassign contract
  const unassignMutation = useMutation({
    mutationFn: async (data: UnassignFormData) => {
      if (!contractId) throw new Error('Contract ID is required');

      // Get contract details first
      const { data: contract } = await supabase
        .from('contracts')
        .select('assigned_to_profile_id')
        .eq('id', contractId)
        .single();

      // Update contract
      const { error } = await supabase
        .from('contracts')
        .update({
          assigned_to_profile_id: null,
          assigned_at: null,
          assignment_notes: `تم إلغاء التعيين - ${data.reason} - ${data.notes || ''}`,
        })
        .eq('id', contractId);

      if (error) throw error;

      // Send notification to employee
      if (contract?.assigned_to_profile_id) {
        const reasonMap: any = {
          'employee_request': 'طلب الموظف',
          'performance_issue': 'مشكلة في الأداء',
          'workload_balance': 'توازن العبء',
          'contract_completed': 'العقد مكتمل',
          'employee_leaving': 'الموظف يغادر',
          'other': 'أخرى'
        };

        await notifyContractUnassigned(
          contract.assigned_to_profile_id,
          contractNumber || '',
          reasonMap[data.reason] || data.reason
        );
      }

      return data;
    },
    onSuccess: () => {
      toast.success('تم إلغاء التعيين بنجاح', {
        description: `تم إلغاء تعيين العقد ${contractNumber || ''} من ${employeeName || 'الموظف'}`,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });

      queryClient.invalidateQueries({ queryKey: ['employee-contracts-details'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts'] });

      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل إلغاء التعيين', {
        description: error.message || 'حدث خطأ أثناء إلغاء التعيين',
      });
    },
  });

  const onSubmit = async (data: UnassignFormData) => {
    setIsSubmitting(true);
    try {
      await unassignMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white">
              <XCircle className="w-5 h-5" />
            </div>
            إلغاء تعيين عقد
          </DialogTitle>
          <DialogDescription>
            أنت على وشك إلغاء تعيين العقد {contractNumber || ''} من {employeeName || 'الموظف'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">تنبيه</p>
                <p className="text-xs text-amber-700 mt-1">
                  سيتم إزالة العقد من مساحة عمل الموظف ولن يتمكن من رؤيته أو العمل عليه.
                </p>
              </div>
            </div>

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب الإلغاء *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee_request">طلب الموظف</SelectItem>
                      <SelectItem value="performance_issue">مشكلة في الأداء</SelectItem>
                      <SelectItem value="workload_balance">توازن العبء</SelectItem>
                      <SelectItem value="contract_completed">العقد مكتمل</SelectItem>
                      <SelectItem value="employee_leaving">الموظف يغادر</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
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
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإلغاء...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    تأكيد الإلغاء
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
