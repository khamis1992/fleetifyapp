/**
 * منطق التحقق من الصلاحيات - FleetifyApp
 * 
 * يوفر هذا الملف الدوال المساعدة للتحقق من صلاحيات المستخدم
 * بناءً على دوره والسياق الحالي
 * 
 * @module permissions/permissions
 */

import { UserRole, Permission, roleHasPermission, roleHasAllPermissions, roleHasAnyPermission } from './roles';

/**
 * معلومات المستخدم للتحقق من الصلاحيات
 */
export interface UserPermissionContext {
  userId: string;
  role: UserRole;
  companyId: string | null;
  permissions?: Permission[]; // صلاحيات مخصصة (اختياري)
}

/**
 * التحقق من أن المستخدم يملك صلاحية معينة
 */
export function hasPermission(
  context: UserPermissionContext,
  permission: Permission
): boolean {
  // Super Admin يملك جميع الصلاحيات
  if (context.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // التحقق من الصلاحيات المخصصة أولاً (إن وجدت)
  if (context.permissions && context.permissions.includes(permission)) {
    return true;
  }
  
  // التحقق من صلاحيات الدور
  return roleHasPermission(context.role, permission);
}

/**
 * التحقق من أن المستخدم يملك جميع الصلاحيات المطلوبة
 */
export function hasAllPermissions(
  context: UserPermissionContext,
  permissions: Permission[]
): boolean {
  // Super Admin يملك جميع الصلاحيات
  if (context.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  return permissions.every(permission => hasPermission(context, permission));
}

/**
 * التحقق من أن المستخدم يملك أي من الصلاحيات المطلوبة
 */
export function hasAnyPermission(
  context: UserPermissionContext,
  permissions: Permission[]
): boolean {
  // Super Admin يملك جميع الصلاحيات
  if (context.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  return permissions.some(permission => hasPermission(context, permission));
}

/**
 * التحقق من أن المستخدم يملك دور معين
 */
export function hasRole(context: UserPermissionContext, role: UserRole): boolean {
  return context.role === role;
}

/**
 * التحقق من أن المستخدم يملك أي من الأدوار المطلوبة
 */
export function hasAnyRole(context: UserPermissionContext, roles: UserRole[]): boolean {
  return roles.includes(context.role);
}

/**
 * التحقق من أن المستخدم Super Admin
 */
export function isSuperAdmin(context: UserPermissionContext): boolean {
  return context.role === UserRole.SUPER_ADMIN;
}

/**
 * التحقق من أن المستخدم مدير شركة
 */
export function isCompanyManager(context: UserPermissionContext): boolean {
  return context.role === UserRole.COMPANY_MANAGER;
}

/**
 * التحقق من أن المستخدم مدير
 */
export function isManager(context: UserPermissionContext): boolean {
  return context.role === UserRole.MANAGER;
}

/**
 * التحقق من أن المستخدم موظف
 */
export function isEmployee(context: UserPermissionContext): boolean {
  return context.role === UserRole.EMPLOYEE;
}

/**
 * التحقق من أن المستخدم يملك صلاحيات إدارية (Super Admin أو Company Manager)
 */
export function isAdmin(context: UserPermissionContext): boolean {
  return isSuperAdmin(context) || isCompanyManager(context);
}

/**
 * التحقق من أن المستخدم يملك صلاحيات إدارية أو إشرافية
 */
export function isAdminOrManager(context: UserPermissionContext): boolean {
  return isAdmin(context) || isManager(context);
}

/**
 * التحقق من أن المستخدم ينتمي لنفس الشركة
 */
export function isSameCompany(
  context: UserPermissionContext,
  targetCompanyId: string | null
): boolean {
  // Super Admin يمكنه الوصول لجميع الشركات
  if (isSuperAdmin(context)) {
    return true;
  }
  
  // التحقق من أن المستخدم ينتمي لنفس الشركة
  return context.companyId === targetCompanyId;
}

/**
 * التحقق من أن المستخدم يمكنه الوصول للمورد
 * (نفس الشركة + الصلاحية المطلوبة)
 */
export function canAccessResource(
  context: UserPermissionContext,
  resourceCompanyId: string | null,
  requiredPermission: Permission
): boolean {
  // التحقق من الصلاحية أولاً
  if (!hasPermission(context, requiredPermission)) {
    return false;
  }
  
  // التحقق من الشركة
  return isSameCompany(context, resourceCompanyId);
}

/**
 * التحقق من أن المستخدم يمكنه تعديل المورد
 */
export function canEditResource(
  context: UserPermissionContext,
  resourceCompanyId: string | null,
  editPermission: Permission
): boolean {
  return canAccessResource(context, resourceCompanyId, editPermission);
}

/**
 * التحقق من أن المستخدم يمكنه حذف المورد
 */
export function canDeleteResource(
  context: UserPermissionContext,
  resourceCompanyId: string | null,
  deletePermission: Permission
): boolean {
  return canAccessResource(context, resourceCompanyId, deletePermission);
}

/**
 * التحقق من أن المستخدم يمكنه اعتماد المورد
 */
export function canApproveResource(
  context: UserPermissionContext,
  resourceCompanyId: string | null,
  approvePermission: Permission
): boolean {
  // الاعتماد يتطلب صلاحيات إدارية على الأقل
  if (!isAdminOrManager(context)) {
    return false;
  }
  
  return canAccessResource(context, resourceCompanyId, approvePermission);
}

/**
 * رسالة خطأ عند عدم وجود صلاحية
 */
export function getPermissionDeniedMessage(permission?: Permission): string {
  if (permission) {
    return `ليس لديك صلاحية "${permission}" للقيام بهذه العملية`;
  }
  return 'ليس لديك الصلاحية للقيام بهذه العملية';
}

/**
 * رسالة خطأ عند محاولة الوصول لمورد من شركة أخرى
 */
export function getCompanyAccessDeniedMessage(): string {
  return 'لا يمكنك الوصول لموارد شركة أخرى';
}

/**
 * رسالة خطأ عامة للوصول المرفوض
 */
export function getAccessDeniedMessage(): string {
  return 'تم رفض الوصول - ليس لديك الصلاحيات الكافية';
}

/**
 * تسجيل محاولة وصول غير مصرح بها (للتدقيق)
 */
export function logUnauthorizedAccess(
  context: UserPermissionContext,
  action: string,
  resource?: string,
  details?: any
): void {
  console.warn('🚫 [PERMISSION_DENIED]', {
    userId: context.userId,
    role: context.role,
    companyId: context.companyId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
  });
  
  // يمكن إضافة تسجيل في قاعدة البيانات هنا للتدقيق
}

/**
 * تسجيل عملية حساسة (للتدقيق)
 */
export function logSensitiveOperation(
  context: UserPermissionContext,
  operation: string,
  resource: string,
  details?: any
): void {
  console.info('🔐 [SENSITIVE_OPERATION]', {
    userId: context.userId,
    role: context.role,
    companyId: context.companyId,
    operation,
    resource,
    details,
    timestamp: new Date().toISOString(),
  });
  
  // يمكن إضافة تسجيل في قاعدة البيانات هنا للتدقيق
}
