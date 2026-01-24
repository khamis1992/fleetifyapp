import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  claimAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'المبلغ يجب أن يكون رقماً أكبر من صفر',
  }),
  caseNumber: z.string().optional(),
  notes: z.string().optional(),
});

interface AddLegalCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddLegalCaseDialog: React.FC<AddLegalCaseDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      claimAmount: '',
      caseNumber: '',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!companyId) throw new Error('Company ID is missing');
      
      const { error } = await supabase.from('legal_collection_cases').insert({
        company_id: companyId,
        customer_id: values.customerId,
        claim_amount: Number(values.claimAmount),
        case_number: values.caseNumber,
        notes: values.notes,
        created_by: user?.profile?.id,
        status: 'open'
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إضافة العميل لقائمة التحصيل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['legal-collection-cases'] });
      onOpenChange(false);
      form.reset();
      setSelectedCustomerName('');
    },
    onError: (error) => {
      console.error('Error creating legal case:', error);
      toast.error('حدث خطأ أثناء إضافة العميل');
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-destructive/10 p-2 rounded-lg">
              <Plus className="h-5 w-5 text-destructive" />
            </div>
            إضافة عميل لقائمة التحصيل القانوني
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>العميل <span className="text-red-500">*</span></FormLabel>
                  <CustomerSelector
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      // Customer name logic is handled inside selector but not exposed easily
                      // We can fetch it or just rely on the ID being set
                    }}
                    companyId={companyId || ''}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claimAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ المطالب به (ر.ق) <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" className="text-left" dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الملف/القضية (اختياري)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="مثال: 2024/123" />
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
                    <Textarea {...field} placeholder="أي تفاصيل إضافية..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="destructive" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                إضافة للقائمة
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
