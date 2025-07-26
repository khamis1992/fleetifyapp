import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CreateUserData, Company } from '@/hooks/useSuperAdminUsers';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateUser: (data: CreateUserData) => Promise<void>;
  companies: Company[];
  isLoading: boolean;
}

const roleOptions = [
  { id: 'company_admin', label: 'مدير شركة', description: 'صلاحيات إدارة كاملة للشركة' },
  { id: 'manager', label: 'مدير', description: 'صلاحيات إدارية محدودة' },
  { id: 'sales_agent', label: 'موظف مبيعات', description: 'صلاحيات المبيعات والعملاء' },
];

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  onCreateUser,
  companies,
  isLoading
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CreateUserData>();

  const selectedRoles = watch('roles') || [];

  const handleRoleChange = (roleId: string, checked: boolean) => {
    const currentRoles = selectedRoles || [];
    if (checked) {
      setValue('roles', [...currentRoles, roleId]);
    } else {
      setValue('roles', currentRoles.filter(role => role !== roleId));
    }
  };

  const onSubmit = async (data: CreateUserData) => {
    try {
      await onCreateUser(data);
      reset();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          <DialogDescription>
            إنشاء حساب مستخدم جديد في النظام
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">المعلومات الشخصية</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">الاسم الأول (بالإنجليزية) *</Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: 'الاسم الأول مطلوب' })}
                  placeholder="الاسم الأول"
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">اسم العائلة (بالإنجليزية) *</Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: 'اسم العائلة مطلوب' })}
                  placeholder="اسم العائلة"
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name_ar">الاسم الأول (بالعربية)</Label>
                <Input
                  id="first_name_ar"
                  {...register('first_name_ar')}
                  placeholder="الاسم الأول بالعربية"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name_ar">اسم العائلة (بالعربية)</Label>
                <Input
                  id="last_name_ar"
                  {...register('last_name_ar')}
                  placeholder="اسم العائلة بالعربية"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'صيغة البريد الإلكتروني غير صحيحة'
                  }
                })}
                placeholder="user@company.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Company Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إعدادات الشركة</h3>
            
            <div className="space-y-2">
              <Label>الشركة *</Label>
              <Select
                onValueChange={(value) => setValue('company_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الشركة" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.company_id && (
                <p className="text-sm text-destructive">يجب اختيار شركة</p>
              )}
            </div>
          </div>

          {/* Roles Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">الأدوار والصلاحيات</h3>
            
            <div className="space-y-3">
              {roleOptions.map((role) => (
                <div key={role.id} className="flex items-start space-x-3 space-x-reverse">
                  <Checkbox
                    id={role.id}
                    checked={selectedRoles?.includes(role.id) || false}
                    onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={role.id} className="font-medium">
                      {role.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {(!selectedRoles || selectedRoles.length === 0) && (
              <p className="text-sm text-muted-foreground">
                يجب اختيار دور واحد على الأقل
              </p>
            )}
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إعدادات الأمان</h3>
            
            <div className="space-y-2">
              <Label htmlFor="temporary_password">كلمة المرور المؤقتة</Label>
              <Input
                id="temporary_password"
                type="password"
                {...register('temporary_password')}
                placeholder="اتركه فارغاً لإنشاء كلمة مرور تلقائية"
              />
              <p className="text-sm text-muted-foreground">
                إذا تركت هذا الحقل فارغاً، سيتم إنشاء كلمة مرور مؤقتة تلقائياً
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedRoles?.length}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء المستخدم'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};