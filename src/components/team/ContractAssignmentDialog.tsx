/**
 * Contract Assignment Dialog
 * حوار تعيين عقد لموظف
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyContractAssigned } from '@/utils/createNotification';

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
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, CheckCircle, AlertCircle } from 'lucide-react';

// Validation Schema
const assignmentSchema = z.object({
  contract_id: z.string().min(1, 'يجب اختيار العقد'),
  employee_id: z.string().min(1, 'يجب اختيار الموظف'),
  notes: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface ContractAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedContractId?: string;
  preselectedEmployeeId?: string;
}

export const ContractAssignmentDialog: React.FC<ContractAssignmentDialogProps> = ({
  open,
  onOpenChange,
  preselectedContractId,
  preselectedEmployeeId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get company_id from user
  const companyId = user?.profile?.company_id || user?.company?.id;

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      contract_id: preselectedContractId || '',
      employee_id: preselectedEmployeeId || '',
      notes: '',
    },
  });

  // Fetch unassigned contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['unassigned-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customers:customer_id (
            first_name_ar,
            last_name_ar,
            company_name_ar
          ),
          status,
          assigned_to_profile_id
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'pending', 'legal_proceedings', 'under_legal_procedure'])
        .is('assigned_to_profile_id', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data;
    },
    enabled: open && !!companyId,
  });

  // Fetch employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name_ar,
          last_name_ar,
          email,
          contracts:contracts!assigned_to_profile_id(count)
        `)
        .eq('company_id', companyId)
        .not('role', 'eq', 'customer')
        .order('first_name_ar', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open && !!companyId,
  });

  const selectedContract = contracts?.find(c => c.id === form.watch('contract_id'));
  const selectedEmployee = employees?.find(e => e.id === form.watch('employee_id'));

  // Mutation to assign contract
  const assignContractMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const { error } = await supabase
        .from('contracts')
        .update({
          assigned_to_profile_id: data.employee_id,
          assigned_at: new Date().toISOString(),
          assigned_by_profile_id: user?.profile?.id,
          assignment_notes: data.notes || null,
        })
        .eq('id', data.contract_id);

      if (error) throw error;

      // Create notification for employee
      const customerName = selectedContract?.customers?.company_name_ar || 
        `${selectedContract?.customers?.first_name_ar || ''} ${selectedContract?.customers?.last_name_ar || ''}`.trim() || 
        'غير محدد';
      
      await notifyContractAssigned(
        data.employee_id,
        selectedContract?.contract_number || '',
        customerName,
        data.contract_id
      );

      return data;
    },
    onSuccess: () => {
      toast.success('تم تعيين العقد بنجاح', {
        description: `تم تعيين العقد للموظف ${selectedEmployee?.first_name_ar}`,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });

      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });

      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل تعيين العقد', {
        description: error.message || 'حدث خطأ أثناء تعيين العقد',
      });
    },
  });

  const onSubmit = async (data: AssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await assignContractMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCustomerName = (contract: any) => {
    const customer = contract?.customers;
    if (!customer) return 'غير محدد';
    return customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير محدد';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            تعيين عقد لموظف
          </DialogTitle>
          <DialogDescription>
            اختر العقد والموظف الذي تريد تعيين العقد له
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
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={contractsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={contractsLoading ? "جاري التحميل..." : "اختر العقد"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts?.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-medium">
                              #{contract.contract_number} - {getCustomerName(contract)}
                            </span>
                            {contract.assigned_to_profile_id && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                معيّن
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {contracts?.length === 0 && (
                        <div className="p-4 text-center text-sm text-neutral-500">
                          لا توجد عقود متاحة
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show contract info if selected */}
            {selectedContract && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      {getCustomerName(selectedContract)}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      عقد #{selectedContract.contract_number}
                    </p>
                  </div>
                  {selectedContract.assigned_to_profile_id && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      <AlertCircle className="w-3 h-3 ml-1" />
                      معيّن حالياً
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Employee Selection */}
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الموظف *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={employeesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={employeesLoading ? "جاري التحميل..." : "اختر الموظف"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div>
                              <span className="font-medium">
                                {employee.first_name_ar} {employee.last_name_ar}
                              </span>
                              <span className="text-xs text-neutral-500 mr-2">
                                ({employee.email})
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {employee.contracts?.[0]?.count || 0} عقود
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      {employees?.length === 0 && (
                        <div className="p-4 text-center text-sm text-neutral-500">
                          لا يوجد موظفون
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show employee info if selected */}
            {selectedEmployee && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-bold text-emerald-900">
                  {selectedEmployee.first_name_ar} {selectedEmployee.last_name_ar}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  لديه حالياً {selectedEmployee.contracts?.[0]?.count || 0} عقود معيّنة
                </p>
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي ملاحظات عن التعيين..."
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
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التعيين...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    تعيين العقد
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
