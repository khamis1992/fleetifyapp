import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SuperAdminUser, Company, ResetPasswordData } from '@/hooks/useSuperAdminUsers';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { UserIcon, MailIcon, BuildingIcon, ShieldIcon, TrashIcon, KeyIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from 'lucide-react';
import { TransferUserDialog } from './TransferUserDialog';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SuperAdminUser | null;
  companies: Company[];
  onUpdateRoles: (userId: string, roles: string[]) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userData: ResetPasswordData) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  isResettingPassword: boolean;
}

const roleOptions = [
  { id: 'super_admin', label: 'مدير عام', description: 'صلاحيات كاملة في النظام' },
  { id: 'company_admin', label: 'مدير شركة', description: 'صلاحيات إدارة كاملة للشركة' },
  { id: 'manager', label: 'مدير', description: 'صلاحيات إدارية محدودة' },
  { id: 'sales_agent', label: 'موظف مبيعات', description: 'صلاحيات المبيعات والعملاء' },
];

export const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({
  open,
  onOpenChange,
  user,
  companies,
  onUpdateRoles,
  onDeleteUser,
  onResetPassword,
  isUpdating,
  isDeleting,
  isResettingPassword
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Update selected roles when user changes
  useEffect(() => {
    if (user?.user_roles) {
      const currentRoles = user.user_roles.map(role => role.role);
      setSelectedRoles(currentRoles);
    } else {
      setSelectedRoles([]);
    }
    setHasChanges(false);
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (user?.user_roles) {
      const currentRoles = user.user_roles.map(role => role.role).sort();
      const newRoles = [...selectedRoles].sort();
      setHasChanges(JSON.stringify(currentRoles) !== JSON.stringify(newRoles));
    }
  }, [selectedRoles, user]);

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleId]);
    } else {
      setSelectedRoles(prev => prev.filter(role => role !== roleId));
    }
  };

  const handleSaveRoles = async () => {
    if (!user) return;
    try {
      await onUpdateRoles(user.id, selectedRoles);
      setHasChanges(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    try {
      await onDeleteUser(user.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handlePasswordReset = async () => {
    if (!user || !newPassword || newPassword !== confirmPassword) return;
    
    try {
      await onResetPassword({
        user_id: user.id,
        new_password: newPassword
      });
      setShowPasswordReset(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const resetPasswordForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleTransferComplete = () => {
    setShowTransferDialog(false);
    onOpenChange(false);
  };

  if (!user) return null;

  const company = companies.find(c => c.id === user.profiles?.company_id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              تفاصيل المستخدم
            </DialogTitle>
            <DialogDescription>
              عرض وتعديل معلومات المستخدم والصلاحيات
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">المعلومات الشخصية</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">الاسم (بالإنجليزية)</Label>
                  <p className="text-base">
                    {user.profiles?.first_name} {user.profiles?.last_name}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">الاسم (بالعربية)</Label>
                  <p className="text-base">
                    {user.profiles?.first_name_ar} {user.profiles?.last_name_ar} 
                    {!user.profiles?.first_name_ar && !user.profiles?.last_name_ar && (
                      <span className="text-muted-foreground">غير محدد</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-base">{user.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-base">
                  {company?.name || 'غير مرتبط بشركة'}
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">تاريخ التسجيل</Label>
                <p className="text-base">
                  {format(new Date(user.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Current Roles */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <ShieldIcon className="h-5 w-5" />
                الأدوار الحالية
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {user.user_roles?.map((roleObj, index) => (
                  <Badge key={index} variant="outline">
                    {roleOptions.find(r => r.id === roleObj.role)?.label || roleObj.role}
                  </Badge>
                ))}
                {(!user.user_roles || user.user_roles.length === 0) && (
                  <Badge variant="secondary">بدون أدوار</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Edit Roles */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">تعديل الأدوار والصلاحيات</h3>
              
              <div className="space-y-3">
                {roleOptions.map((role) => (
                  <div key={role.id} className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox
                      id={`edit-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                      disabled={isUpdating}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={`edit-${role.id}`} className="font-medium">
                        {role.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {hasChanges && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleSaveRoles}
                    disabled={isUpdating}
                    size="sm"
                  >
                    {isUpdating ? (
                      <>
                        <LoadingSpinner size="sm" className="ml-2" />
                        جاري الحفظ...
                      </>
                    ) : (
                      'حفظ التغييرات'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (user?.user_roles) {
                        const currentRoles = user.user_roles.map(role => role.role);
                        setSelectedRoles(currentRoles);
                      }
                    }}
                    disabled={isUpdating}
                    size="sm"
                  >
                    إلغاء
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Password Reset Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <KeyIcon className="h-5 w-5" />
                تغيير كلمة المرور
              </h3>
              
              {!showPasswordReset ? (
                <div className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">إعادة تعيين كلمة المرور</h4>
                      <p className="text-sm text-muted-foreground">
                        تعيين كلمة مرور جديدة للمستخدم
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordReset(true)}
                      disabled={isResettingPassword}
                    >
                      <KeyIcon className="h-4 w-4 ml-2" />
                      تغيير كلمة المرور
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        disabled={isResettingPassword}
                        className="pl-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      disabled={isResettingPassword}
                    />
                  </div>
                  
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-destructive">كلمات المرور غير متطابقة</p>
                  )}
                  
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-sm text-destructive">كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePasswordReset}
                      disabled={
                        isResettingPassword || 
                        !newPassword || 
                        !confirmPassword || 
                        newPassword !== confirmPassword ||
                        newPassword.length < 6
                      }
                      size="sm"
                    >
                      {isResettingPassword ? (
                        <>
                          <LoadingSpinner size="sm" className="ml-2" />
                          جاري التغيير...
                        </>
                      ) : (
                        'تأكيد التغيير'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPasswordReset(false);
                        resetPasswordForm();
                      }}
                      disabled={isResettingPassword}
                      size="sm"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-destructive">منطقة الخطر</h3>
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">نقل المستخدم لشركة أخرى</h4>
                        <p className="text-sm text-muted-foreground">
                          نقل المستخدم إلى شركة أخرى مع إمكانية نقل البيانات المرتبطة به
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowTransferDialog(true)}
                        disabled={isUpdating || isDeleting || isResettingPassword}
                      >
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                        نقل لشركة أخرى
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">حذف المستخدم</h4>
                        <p className="text-sm text-muted-foreground">
                          حذف المستخدم نهائياً من النظام. هذا الإجراء لا يمكن التراجع عنه.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isDeleting}
                      >
                        <TrashIcon className="h-4 w-4 ml-2" />
                        حذف المستخدم
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (showPasswordReset) {
                  setShowPasswordReset(false);
                  resetPasswordForm();
                }
              }}
              disabled={isUpdating || isDeleting || isResettingPassword}
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستخدم "{user.profiles?.first_name} {user.profiles?.last_name}"؟
              <br />
              <br />
              سيتم حذف:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>حساب المستخدم</li>
                <li>الملف الشخصي</li>
                <li>جميع الأدوار والصلاحيات</li>
              </ul>
              <br />
              <strong>هذا الإجراء لا يمكن التراجع عنه.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري الحذف...
                </>
              ) : (
                'حذف نهائياً'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer User Dialog */}
      <TransferUserDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        user={user}
        companies={companies}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
};