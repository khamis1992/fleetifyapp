/**
 * Bulk Assignment Dialog
 * حوار تعيين عدة عقود دفعة واحدة
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Validation Schema
const bulkAssignmentSchema = z.object({
  employee_id: z.string().min(1, 'يجب اختيار الموظف'),
  contract_ids: z.array(z.string()).min(1, 'يجب اختيار عقد واحد على الأقل'),
});

type BulkAssignmentFormData = z.infer<typeof bulkAssignmentSchema>;

interface BulkAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkAssignmentDialog: React.FC<BulkAssignmentDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  
  // Get company_id from user
  const companyId = user?.profile?.company_id || user?.company?.id;

  const form = useForm<BulkAssignmentFormData>({
    resolver: zodResolver(bulkAssignmentSchema),
    defaultValues: {
      employee_id: '',
      contract_ids: [],
    },
  });

  // Fetch unassigned contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['unassigned-contracts-bulk', companyId],
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
          assigned_to_profile_id,
          balance_due
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
    queryKey: ['employees-list-bulk', companyId],
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

  const selectedEmployee = employees?.find(e => e.id === form.watch('employee_id'));

  // Toggle contract selection
  const toggleContract = (contractId: string) => {
    setSelectedContracts(prev => {
      if (prev.includes(contractId)) {
        return prev.filter(id => id !== contractId);
      } else {
        return [...prev, contractId];
      }
    });
  };

  // Select all unassigned contracts
  const selectAllUnassigned = () => {
    const unassigned = contracts?.filter(c => !c.assigned_to_profile_id).map(c => c.id) || [];
    setSelectedContracts(unassigned);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedContracts([]);
  };

  // Update form when selection changes
  React.useEffect(() => {
    form.setValue('contract_ids', selectedContracts, { shouldValidate: false });
  }, [selectedContracts]);

  // Mutation to assign contracts
  const bulkAssignMutation = useMutation({
    mutationFn: async (data: BulkAssignmentFormData) => {
      const updates = data.contract_ids.map(contractId => 
        supabase
          .from('contracts')
          .update({
            assigned_to_profile_id: data.employee_id,
            assigned_at: new Date().toISOString(),
            assigned_by_profile_id: user?.profile?.id,
            assignment_notes: `تعيين جماعي - ${new Date().toLocaleDateString('ar-EG')}`,
          })
          .eq('id', contractId)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`فشل تعيين ${errors.length} عقود`);
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('تم تعيين العقود بنجاح', {
        description: `تم تعيين ${data.contract_ids.length} عقود للموظف ${selectedEmployee?.first_name_ar}`,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });

      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });

      form.reset();
      setSelectedContracts([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل تعيين العقود', {
        description: error.message || 'حدث خطأ أثناء تعيين العقود',
      });
    },
  });

  const onSubmit = async (data: BulkAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await bulkAssignMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCustomerName = (contract: any) => {
    const customer = contract?.customers;
    if (!customer) return 'غير محدد';
    return customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير محدد';
  };

  const unassignedCount = contracts?.filter(c => !c.assigned_to_profile_id).length || 0;
  const assignedCount = contracts?.filter(c => c.assigned_to_profile_id).length || 0;

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedContracts([]);
      form.reset();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            تعيين عقود جماعي
          </DialogTitle>
          <DialogDescription>
            اختر الموظف ثم حدد العقود التي تريد تعيينها له
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <span className="font-medium">
                              {employee.first_name_ar} {employee.last_name_ar}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {employee.contracts?.[0]?.count || 0} عقود
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show employee info */}
            {selectedEmployee && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-bold text-emerald-900">
                  {selectedEmployee.first_name_ar} {selectedEmployee.last_name_ar}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  لديه حالياً {selectedEmployee.contracts?.[0]?.count || 0} عقود • سيصبح {(selectedEmployee.contracts?.[0]?.count || 0) + selectedContracts.length} بعد التعيين
                </p>
              </div>
            )}

            {/* Contracts Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <FormLabel>العقود المتاحة *</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllUnassigned}
                    disabled={contractsLoading || unassignedCount === 0}
                    className="text-xs"
                  >
                    تحديد الكل ({unassignedCount})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={selectedContracts.length === 0}
                    className="text-xs"
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-2 mb-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedContracts.length} محدد
                </Badge>
                <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">
                  {unassignedCount} غير معيّن
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {assignedCount} معيّن
                </Badge>
              </div>

              {contractsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
                </div>
              ) : (
                <ScrollArea className="h-[300px] border border-neutral-200 rounded-lg p-3">
                  <div className="space-y-2">
                    {contracts?.map((contract) => {
                      const isSelected = selectedContracts.includes(contract.id);
                      const isAssigned = !!contract.assigned_to_profile_id;

                      return (
                        <div
                          key={contract.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                            isSelected
                              ? "bg-purple-50 border-purple-300"
                              : isAssigned
                              ? "bg-neutral-50 border-neutral-200 opacity-60"
                              : "bg-white border-neutral-200 hover:border-purple-200 hover:bg-purple-50/30"
                          )}
                          onClick={() => !isAssigned && toggleContract(contract.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isAssigned}
                            onCheckedChange={() => toggleContract(contract.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-neutral-900">
                                #{contract.contract_number}
                              </p>
                              {isAssigned && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  معيّن
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 mt-0.5">
                              {getCustomerName(contract)}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {contracts?.length === 0 && (
                      <div className="text-center py-8 text-neutral-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">لا توجد عقود متاحة</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {selectedContracts.length === 0 && (
                <p className="text-xs text-red-600 mt-2">يجب اختيار عقد واحد على الأقل</p>
              )}
            </div>

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
                disabled={isSubmitting || selectedContracts.length === 0 || !form.watch('employee_id')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التعيين...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    تعيين {selectedContracts.length} عقود
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
