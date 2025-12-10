/**
 * مكون حماية الصفحات بناءً على الأدوار - FleetifyApp
 * 
 * يستخدم هذا المكون لحماية الصفحات الكاملة من الوصول غير المصرح به
 * 
 * @module components/auth/RoleGuard
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Permission, UserRole } from '@/lib/permissions/roles';

interface RoleGuardProps {
  children: React.ReactNode;
  
  // الصلاحيات المطلوبة
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  
  // الأدوار المطلوبة
  role?: UserRole;
  roles?: UserRole[];
  
  // الإجراء عند عدم وجود صلاحية
  redirectTo?: string; // إعادة التوجيه
  showError?: boolean; // عرض رسالة خطأ
  errorMessage?: string; // رسالة مخصصة
}

/**
 * مكون حماية الصفحات
 */
export function RoleGuard({
  children,
  permission,
  permissions = [],
  requireAll = true,
  role,
  roles = [],
  redirectTo = '/dashboard',
  showError = true,
  errorMessage,
}: RoleGuardProps) {
  const {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    isLoading,
    roleDisplayName,
  } = useRolePermissions();
  
  // انتظار تحميل الصلاحيات
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
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
  
  // عرض رسالة خطأ
  if (showError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <Lock className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold mb-2">
              وصول غير مصرح به
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                {errorMessage || 
                  `ليس لديك الصلاحية للوصول إلى هذه الصفحة. دورك الحالي: ${roleDisplayName}`}
              </p>
              
              {permission && (
                <p className="text-sm">
                  الصلاحية المطلوبة: <code className="bg-destructive/10 px-2 py-1 rounded">{permission}</code>
                </p>
              )}
              
              {permissions.length > 0 && (
                <div className="text-sm">
                  <p className="mb-2">الصلاحيات المطلوبة:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {permissions.map(p => (
                      <li key={p}>
                        <code className="bg-destructive/10 px-2 py-1 rounded">{p}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex-1"
                >
                  رجوع
                </Button>
                <Button
                  onClick={() => window.location.href = redirectTo}
                  className="flex-1"
                >
                  الذهاب للرئيسية
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مدير النظام لمراجعة صلاحياتك.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  // إعادة التوجيه
  return <Navigate to={redirectTo} replace />;
}

/**
 * مكون مبسط لحماية صفحات Super Admin فقط
 */
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role={UserRole.SUPER_ADMIN}>
      {children}
    </RoleGuard>
  );
}

/**
 * مكون مبسط لحماية صفحات المدراء (Super Admin + Company Admin + Manager)
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MANAGER]}>
      {children}
    </RoleGuard>
  );
}

/**
 * مكون مبسط لحماية صفحات المدراء والمشرفين
 */
export function ManagerGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard 
      roles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MANAGER]}
    >
      {children}
    </RoleGuard>
  );
}
