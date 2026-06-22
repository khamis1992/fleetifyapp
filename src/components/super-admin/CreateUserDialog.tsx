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

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ open,
  onOpenChange,
  onCreateUser,
  companies,
  isLoading }) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<CreateUserData>({
    defaultValues: {
      roles: []
    }
  });

  const selectedRoles = watch('roles') || [];
  const selectedCompany = watch('company_id');

  const handleRoleChange = (roleId: string, checked: boolean) => {
    const currentRoles = selectedRoles || [];
    if (checked) {
      setValue('roles', [...currentRoles, roleId], { shouldValidate: true });
    } else {
      setValue('roles', currentRoles.filter(role => role !== roleId), { shouldValidate: true });
    }
  };

  // Check if form is ready for submission
  const canSubmit = selectedRoles.length > 0 && selectedCompany && !isLoading;

  const onSubmit = async (data: CreateUserData) => {
    try {
      // Validate that company_id is selected
      if (!data.company_id) {
        throw new Error('يجب اختيار شركة');
      }
      
      // Validate that roles are selected
      if (!data.roles || data.roles.length === 0) {
        throw new Error('يجب اختيار دور واحد على الأقل');
      }
      
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          <DialogDescription>
            إنشاء حساب مستخدم جديد في النظام
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4 p-4 border rounded-lg bg-background">
              <h3 className="text-lg font-medium flex items-center gap-2 text-primary">
                👤 المعلومات الشخصية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">الاسم الأول (بالإنجليزية) *</Label>
                  <Input
                    id="first_name"
                    {...register('first_name', { required: 'الاسم الأول مطلوب' })}
                    placeholder="First Name"
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
                    placeholder="Last Name"
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name_ar">الاسم الأول (بالعربية)</Label>
                  <Input
                    id="first_name_ar"
                    {...register('first_name_ar')}
                    placeholder="الاسم الأول"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name_ar">اسم العائلة (بالعربية)</Label>
                  <Input
                    id="last_name_ar"
                    {...register('last_name_ar')}
                    placeholder="اسم العائلة"
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
            <div className="space-y-4 p-4 border rounded-lg bg-background">
              <h3 className="text-lg font-medium flex items-center gap-2 text-primary">
                🏢 إعدادات الشركة
              </h3>
              
              <div className="space-y-2">
                <Label>الشركة *</Label>
                <Select 
                  onValueChange={(value) => setValue('company_id', value)}
                  {...register('company_id', { required: 'يجب اختيار شركة' })}
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
                  <p className="text-sm text-destructive">{errors.company_id.message}</p>
                )}
              </div>
            </div>

            {/* Roles Selection */}
            <div className="space-y-4 p-4 border rounded-lg bg-background">
              <h3 className="text-lg font-medium flex items-center gap-2 text-primary">
                🛡️ الأدوار والصلاحيات
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {roleOptions.map((role) => (
                  <div key={role.id} className="flex items-start space-x-3 space-x-reverse p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={role.id}
                      checked={selectedRoles?.includes(role.id) || false}
                      onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor={role.id} className="font-medium cursor-pointer">
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ⚠️ يجب اختيار دور واحد على الأقل
                  </p>
                </div>
              )}
            </div>

            {/* Security Settings */}
            <div className="space-y-4 p-4 border rounded-lg bg-background">
              <h3 className="text-lg font-medium flex items-center gap-2 text-primary">
                🔒 إعدادات الأمان
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="temporary_password">كلمة المرور المؤقتة</Label>
                <Input
                  id="temporary_password"
                  type="password"
                  {...register('temporary_password')}
                  placeholder="اتركه فارغاً لإنشاء كلمة مرور تلقائية"
                />
                 <div className="space-y-2">
                   <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                     <p className="text-sm text-blue-800">
                       💡 إذا تركت هذا الحقل فارغاً، سيتم إنشاء كلمة مرور مؤقتة تلقائياً وعرضها بعد الإنشاء
                     </p>
                   </div>
                   <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                     <p className="text-sm text-green-800">
                       📝 إذا لم يكن هناك موظف بهذا البريد الإلكتروني في الشركة المحددة، سيتم إنشاء ملف موظف جديد تلقائياً
                     </p>
                   </div>
                 </div>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Actions at bottom */}
        <div className="border-t bg-background p-4">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={!canSubmit}
              className={!canSubmit ? 'opacity-50' : ''}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  إنشاء المستخدم
                  {!canSubmit && (
                    <span className="text-xs block opacity-70">
                      (املأ جميع الحقول المطلوبة)
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};