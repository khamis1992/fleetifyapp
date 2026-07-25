import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkUnassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkUnassignDialog: React.FC<BulkUnassignDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);

  const companyId = user?.profile?.company_id || user?.company?.id;

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['assigned-contracts-bulk-unassign', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          assigned_to_profile_id,
          balance_due,
          profiles:assigned_to_profile_id (
            first_name_ar,
            last_name_ar,
            email
          ),
          customers:customer_id (
            first_name_ar,
            last_name_ar,
            company_name_ar,
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('assigned_to_profile_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const selectedContractRows = useMemo(
    () => contracts.filter((contract) => selectedContracts.includes(contract.id)),
    [contracts, selectedContracts]
  );

  const getCustomerName = (contract: any) => {
    const customer = contract.customers;
    if (!customer) return 'غير محدد';

    if (customer.customer_type === 'company') {
      return customer.company_name_ar || customer.company_name || 'شركة غير محددة';
    }

    return [
      customer.first_name_ar || customer.first_name,
      customer.last_name_ar || customer.last_name,
    ].filter(Boolean).join(' ') || 'غير محدد';
  };

  const getEmployeeName = (contract: any) => {
    const employee = contract.profiles;
    if (!employee) return 'غير محدد';

    return [
      employee.first_name_ar,
      employee.last_name_ar,
    ].filter(Boolean).join(' ') || employee.email || 'غير محدد';
  };

  const toggleContract = (contractId: string) => {
    setSelectedContracts((prev) =>
      prev.includes(contractId)
        ? prev.filter((id) => id !== contractId)
        : [...prev, contractId]
    );
  };

  const selectAll = () => {
    setSelectedContracts(contracts.map((contract) => contract.id));
  };

  const clearSelection = () => {
    setSelectedContracts([]);
  };

  const bulkUnassignMutation = useMutation({
    mutationFn: async (contractIds: string[]) => {
      if (contractIds.length === 0) {
        throw new Error('يجب اختيار عقد واحد على الأقل');
      }

      const { error } = await supabase
        .from('contracts')
        .update({
          assigned_to_profile_id: null,
          assigned_at: null,
          assignment_notes: `إلغاء تعيين جماعي - ${new Date().toLocaleDateString('ar-QA')}`,
        })
        .in('id', contractIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إلغاء التعيين الجماعي بنجاح', {
        description: `تم إلغاء تعيين ${selectedContracts.length} عقود`,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });

      queryClient.invalidateQueries({ queryKey: ['assigned-contracts-bulk-unassign'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts-details'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees'] });
      queryClient.invalidateQueries({ queryKey: ['team-active-contract-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts-smart'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-collections'] });

      setSelectedContracts([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('فشل إلغاء التعيين الجماعي', {
        description: error.message || 'حدث خطأ أثناء إلغاء التعيين',
      });
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !bulkUnassignMutation.isPending) {
      setSelectedContracts([]);
    }
    onOpenChange(nextOpen);
  };

  const handleBulkUnassign = () => {
    const contractIds = [...selectedContracts];
    if (contractIds.length === 0 || bulkUnassignMutation.isPending) return;
    bulkUnassignMutation.mutate(contractIds);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white">
              <XCircle className="h-5 w-5" />
            </div>
            إلغاء تعيين جماعي
          </DialogTitle>
          <DialogDescription>
            اختر العقود المعيّنة حالياً لإزالة تعيينها، ثم أعد توزيعها من خيار التعيين الجماعي.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {selectedContracts.length} محدد
              </Badge>
              <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">
                {contracts.length} عقد معيّن
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={isLoading || contracts.length === 0}
              >
                تحديد الكل
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedContracts.length === 0}
              >
                مسح التحديد
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-red-600" />
            </div>
          ) : (
            <ScrollArea className="h-[360px] rounded-lg border border-neutral-200 p-3">
              <div className="space-y-2">
                {contracts.map((contract) => {
                  const isSelected = selectedContracts.includes(contract.id);

                  return (
                    <div
                      key={contract.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                        isSelected
                          ? 'border-red-300 bg-red-50'
                          : 'border-neutral-200 bg-white hover:border-red-200 hover:bg-red-50/40'
                      )}
                      onClick={() => toggleContract(contract.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => toggleContract(contract.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-neutral-900">
                            #{contract.contract_number}
                          </p>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {getEmployeeName(contract)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-neutral-600">
                          {getCustomerName(contract)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {contracts.length === 0 && (
                  <div className="py-10 text-center text-neutral-500">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    <p className="text-sm">لا توجد عقود نشطة معيّنة حالياً</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedContractRows.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
              سيتم إلغاء تعيين {selectedContractRows.length} عقود. لن يتم إلغاء العقد نفسه أو تغيير حالته.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={bulkUnassignMutation.isPending}
          >
            إلغاء
          </Button>
          <button
            type="button"
            onClick={handleBulkUnassign}
            disabled={bulkUnassignMutation.isPending || selectedContracts.length === 0}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            {bulkUnassignMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري إلغاء التعيين...
              </>
            ) : (
              <>
                <XCircle className="ml-2 h-4 w-4" />
                إلغاء تعيين {selectedContracts.length} عقود
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
