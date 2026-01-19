/**
 * مكون حماية الصلاحيات - FleetifyApp
 * 
 * يستخدم هذا المكون لإخفاء أو تعطيل المكونات بناءً على صلاحيات المستخدم
 * 
 * @module components/auth/PermissionGuard
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Permission, UserRole } from '@/lib/permissions/roles';

interface PermissionGuardProps {
  children: React.ReactNode;
  
  // الصلاحيات المطلوبة
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // true = يجب أن يملك جميع الصلاحيات، false = أي صلاحية
  
  // الأدوار المطلوبة
  role?: UserRole;
  roles?: UserRole[];
  
  // الإجراء عند عدم وجود صلاحية
  fallback?: React.ReactNode; // محتوى بديل
  hideOnDenied?: boolean; // إخفاء المحتوى بالكامل
  showAlert?: boolean; // عرض رسالة تنبيه
  alertMessage?: string; // رسالة مخصصة
  
  // تعطيل بدلاً من الإخفاء (للأزرار والحقول)
  disableOnDenied?: boolean;
}

/**
 * مكون حماية الصلاحيات
 */
export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = true,
  role,
  roles = [],
  fallback,
  hideOnDenied = false,
  showAlert = false,
  alertMessage,
  disableOnDenied = false,
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    isLoading,
  } = useRolePermissions();
  
  // انتظار تحميل الصلاحيات
  if (isLoading) {
    return null;
  }
  
  // التحقق من الصلاحيات
  let hasAccess = true;
  
  // التحقق من صلاحية واحدة
  if (permission) {
    hasAccess = hasPermission(permission);
  }
  
  // التحقق من عدة صلاحيات
  if (permissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAccess && hasAllPermissions(permissions);
    } else {
      hasAccess = hasAccess && hasAnyPermission(permissions);
    }
  }
  
  // التحقق من دور واحد
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }
  
  // التحقق من عدة أدوار
  if (roles.length > 0) {
    hasAccess = hasAccess && hasAnyRole(roles);
  }
  
  // إذا كان لديه الصلاحية، عرض المحتوى
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // إذا لم يكن لديه الصلاحية
  
  // إخفاء المحتوى بالكامل
  if (hideOnDenied) {
    return null;
  }
  
  // عرض محتوى بديل
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // عرض رسالة تنبيه
  if (showAlert) {
    return (
      <Alert variant="destructive" className="my-4">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          {alertMessage || 'ليس لديك الصلاحية للوصول إلى هذا المحتوى'}
        </AlertDescription>
      </Alert>
    );
  }
  
  // تعطيل المحتوى (للأزرار والحقول)
  if (disableOnDenied && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      title: alertMessage || 'ليس لديك الصلاحية لهذه العملية',
    });
  }
  
  // افتراضياً: لا تعرض شيء
  return null;
}

/**
 * مكون مبسط لحماية الأزرار
 */
export function ProtectedButton({
  children,
  permission,
  permissions,
  requireAll = true,
  ...props
}: PermissionGuardProps) {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      disableOnDenied={true}
      hideOnDenied={false}
      {...props}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * مكون مبسط لإخفاء المحتوى
 */
export function HiddenContent({
  children,
  permission,
  permissions,
  requireAll = true,
  ...props
}: PermissionGuardProps) {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      hideOnDenied={true}
      {...props}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * مكون مبسط لعرض رسالة تنبيه
 */
export function ProtectedContent({
  children,
  permission,
  permissions,
  requireAll = true,
  alertMessage,
  ...props
}: PermissionGuardProps) {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      showAlert={true}
      alertMessage={alertMessage}
      {...props}
    >
      {children}
    </PermissionGuard>
  );
}
