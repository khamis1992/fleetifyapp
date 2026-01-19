import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { CustomerAccountSelector } from '@/components/finance/CustomerAccountSelector';
import { useCustomerAccountTypes } from '@/hooks/useCustomerAccountTypes';
import { useCreateCustomerAccount, useUpdateCustomerAccount, useCustomerAccounts } from '@/hooks/useEnhancedCustomerAccounts';
import { Customer } from '@/types/customer';
import { CustomerAccount, CustomerAccountFormData } from '@/types/customerAccount';

const formSchema = z.object({
  account_id: z.string().min(1, 'يجب اختيار الحساب المحاسبي'),
  account_type_id: z.string().min(1, 'يجب اختيار نوع الحساب'),
  is_default: z.boolean().default(false),
  currency: z.string().default('KWD'),
  credit_limit: z.coerce.number().min(0).optional(),
  account_purpose: z.string().optional(),
});

interface CustomerAccountFormProps {
  customer: Customer;
  account?: CustomerAccount | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CustomerAccountForm: React.FC<CustomerAccountFormProps> = ({
  customer,
  account,
  onSuccess,
  onCancel,
}) => {
  const { data: accountTypes = [] } = useCustomerAccountTypes();
  const { data: existingAccounts = [] } = useCustomerAccounts(customer.id);
  const createMutation = useCreateCustomerAccount();
  const updateMutation = useUpdateCustomerAccount();

  const form = useForm<CustomerAccountFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: account?.account_id || '',
      account_type_id: account?.account_type_id || '',
      is_default: account?.is_default || false,
      currency: account?.currency || 'KWD',
      credit_limit: account?.credit_limit || undefined,
      account_purpose: account?.account_purpose || '',
    },
  });

  const onSubmit = (data: CustomerAccountFormData) => {
    if (account) {
      updateMutation.mutate({
        accountId: account.id,
        customerId: customer.id,
        accountData: data,
      }, {
        onSuccess,
      });
    } else {
      createMutation.mutate({
        customerId: customer.id,
        accountData: data,
      }, {
        onSuccess,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Account Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="account_type_id">نوع الحساب *</Label>
            <Select
              value={form.watch('account_type_id')}
              onValueChange={(value) => form.setValue('account_type_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الحساب" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.type_name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.account_type_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.account_type_id.message}
              </p>
            )}
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account_id">الحساب المحاسبي *</Label>
            <CustomerAccountSelector
              value={form.watch('account_id')}
              onValueChange={(value) => {
                // Check if this account is already linked (for edit mode)
                const isAlreadyLinked = existingAccounts.some(
                  existingAcc => existingAcc.account_id === value && existingAcc.id !== account?.id
                );
                
                if (isAlreadyLinked) {
                  form.setError('account_id', {
                    type: 'manual',
                    message: 'هذا الحساب المحاسبي مربوط مسبقاً بهذا العميل'
                  });
                  return;
                }
                
                form.clearErrors('account_id');
                form.setValue('account_id', value);
              }}
              placeholder="اختر الحساب المحاسبي"
            />
            {form.formState.errors.account_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.account_id.message}
              </p>
            )}
            {existingAccounts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                تجنب اختيار الحسابات المربوطة مسبقاً بهذا العميل
              </p>
            )}
          </div>

          {/* Currency and Credit Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Select
                value={form.watch('currency')}
                onValueChange={(value) => form.setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KWD">KWD - دينار كويتي</SelectItem>
                  <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                  <SelectItem value="EUR">EUR - يورو</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_limit">حد الائتمان</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                placeholder="0.000"
                {...form.register('credit_limit', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Account Purpose */}
          <div className="space-y-2">
            <Label htmlFor="account_purpose">غرض الحساب</Label>
            <Textarea
              placeholder="وصف مختصر لاستخدام هذا الحساب..."
              className="resize-none"
              rows={3}
              {...form.register('account_purpose')}
            />
          </div>

          {/* Default Account Switch */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="is_default" className="text-base">
                حساب افتراضي
              </Label>
              <p className="text-sm text-muted-foreground">
                استخدام هذا الحساب كافتراضي لهذا النوع من المعاملات
              </p>
            </div>
            <Switch
              id="is_default"
              checked={form.watch('is_default')}
              onCheckedChange={(checked) => form.setValue('is_default', checked)}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'جاري الحفظ...' : account ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};