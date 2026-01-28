/**
 * Add Note Dialog
 * حوار إضافة ملاحظة على العقد
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, CheckCircle } from 'lucide-react';

// Validation Schema
const noteSchema = z.object({
  contract_id: z.string().min(1, 'يجب اختيار العقد'),
  note_type: z.enum([
    'general',
    'payment_related',
    'complaint',
    'vehicle_condition',
    'customer_request',
    'important',
    'other'
  ]),
  note_content: z.string().min(10, 'يجب كتابة ملاحظة (10 أحرف على الأقل)'),
  is_important: z.boolean().default(false),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface AddNoteDialogProps {
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

export const AddNoteDialog: React.FC<AddNoteDialogProps> = ({
  open,
  onOpenChange,
  contracts,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      contract_id: preselectedContractId || '',
      note_type: 'general',
      note_content: '',
      is_important: false,
    },
  });

  const selectedContract = contracts.find(
    (c) => c.id === form.watch('contract_id')
  );

  // Mutation to add note
  const addNoteMutation = useMutation({
    mutationFn: async (data: NoteFormData) => {
      const contract = contracts.find((c) => c.id === data.contract_id);
      if (!contract) throw new Error('Contract not found');

      const { data: note, error } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: contract.customer_id,
          contract_id: data.contract_id,
          communication_type: 'note',
          communication_date: new Date().toISOString(),
          notes: data.note_content,
          contacted_by: user?.profile?.id,
          metadata: {
            note_type: data.note_type,
            is_important: data.is_important,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      toast.success('تم إضافة الملاحظة بنجاح', {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });
      
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل إضافة الملاحظة', {
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
      });
    },
  });

  const onSubmit = async (data: NoteFormData) => {
    setIsSubmitting(true);
    try {
      await addNoteMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            إضافة ملاحظة
          </DialogTitle>
          <DialogDescription>
            أضف ملاحظة على العقد لتوثيق المعلومات المهمة
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

            {/* Note Type */}
            <FormField
              control={form.control}
              name="note_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الملاحظة *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">عامة</SelectItem>
                      <SelectItem value="payment_related">متعلقة بالدفع</SelectItem>
                      <SelectItem value="complaint">شكوى</SelectItem>
                      <SelectItem value="vehicle_condition">حالة المركبة</SelectItem>
                      <SelectItem value="customer_request">طلب العميل</SelectItem>
                      <SelectItem value="important">مهمة ⭐</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note Content */}
            <FormField
              control={form.control}
              name="note_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>محتوى الملاحظة *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اكتب ملاحظتك هنا..."
                      className="resize-none min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-gray-500 mt-1">
                    {field.value.length} / 500 حرف
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Important Flag */}
            <FormField
              control={form.control}
              name="is_important"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer flex items-center gap-2">
                    <span>⭐</span>
                    <span>ملاحظة مهمة (سيتم تمييزها)</span>
                  </FormLabel>
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
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    حفظ الملاحظة
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
