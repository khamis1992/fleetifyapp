import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateMaintenanceAccountMapping, useUpdateMaintenanceAccountMapping, type MaintenanceAccountMapping } from "@/hooks/useMaintenanceAccountMappings";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const formSchema = z.object({
  maintenance_type: z.string().min(1, "نوع الصيانة مطلوب"),
  expense_account_id: z.string().min(1, "حساب المصروفات مطلوب"),
  asset_account_id: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MaintenanceAccountMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping?: MaintenanceAccountMapping;
  onSuccess?: () => void;
}

const maintenanceTypes = [
  { value: "preventive", label: "صيانة وقائية" },
  { value: "corrective", label: "صيانة إصلاحية" },
  { value: "emergency", label: "صيانة طارئة" },
  { value: "scheduled", label: "صيانة دورية" },
  { value: "oil_change", label: "تغيير زيت" },
  { value: "tire_replacement", label: "تغيير إطارات" },
  { value: "brake_service", label: "صيانة فرامل" },
  { value: "engine_repair", label: "إصلاح محرك" },
  { value: "transmission", label: "صيانة ناقل الحركة" },
  { value: "electrical", label: "صيانة كهربائية" },
  { value: "ac_service", label: "صيانة تكييف" },
  { value: "body_work", label: "أعمال هيكل" },
];

export const MaintenanceAccountMappingDialog: React.FC<MaintenanceAccountMappingDialogProps> = ({
  open,
  onOpenChange,
  mapping,
  onSuccess,
}) => {
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const createMapping = useCreateMaintenanceAccountMapping();
  const updateMapping = useUpdateMaintenanceAccountMapping();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maintenance_type: mapping?.maintenance_type || "",
      expense_account_id: mapping?.expense_account_id || "",
      asset_account_id: mapping?.asset_account_id || "",
      description: mapping?.description || "",
    },
  });

  const expenseAccounts = accounts?.filter(account => 
    account.account_type === 'expense' && !account.is_header
  ) || [];

  const assetAccounts = accounts?.filter(account => 
    account.account_type === 'assets' && !account.is_header
  ) || [];

  const onSubmit = async (data: FormData) => {
    try {
      if (mapping) {
        await updateMapping.mutateAsync({
          id: mapping.id,
          updates: data
        });
      } else {
        await createMapping.mutateAsync({
          maintenance_type: data.maintenance_type,
          expense_account_id: data.expense_account_id,
          asset_account_id: data.asset_account_id,
          description: data.description,
          is_active: true,
        });
      }
      
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving maintenance account mapping:", error);
    }
  };

  React.useEffect(() => {
    if (mapping) {
      form.reset({
        maintenance_type: mapping.maintenance_type,
        expense_account_id: mapping.expense_account_id,
        asset_account_id: mapping.asset_account_id || "",
        description: mapping.description || "",
      });
    }
  }, [mapping, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mapping ? "تعديل ربط حساب الصيانة" : "إضافة ربط حساب الصيانة"}
          </DialogTitle>
        </DialogHeader>

        {accountsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="maintenance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الصيانة</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الصيانة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expense_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حساب المصروفات</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حساب المصروفات" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حساب الأصل (اختياري)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حساب الأصل" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">بدون</SelectItem>
                        {assetAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="وصف إضافي للربط"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createMapping.isPending || updateMapping.isPending}
                >
                  {(createMapping.isPending || updateMapping.isPending) && <LoadingSpinner className="mr-2" />}
                  {mapping ? "تحديث" : "إضافة"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};