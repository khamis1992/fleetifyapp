import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  DollarSign,
  Eye,
  Lock,
  Minus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  UserRole,
} from '@/types/permissions';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type PermissionOverrideValue = boolean | null;

interface PermissionsMatrixProps {
  selectedUser?: {
    user_id: string;
    first_name: string;
    last_name: string;
    roles: UserRole[];
  };
  onPermissionChange?: (permission: string, granted: PermissionOverrideValue) => void;
  onRoleChange?: (role: UserRole, assigned: boolean) => void;
  readOnly?: boolean;
  showRoleComparison?: boolean;
  pendingPermissions?: Array<{ permissionId: string; granted: PermissionOverrideValue }>;
  pendingRoles?: UserRole[];
}

const roleLabels: Record<UserRole, string> = {
  super_admin: 'مدير النظام',
  company_admin: 'مدير الشركة',
  manager: 'مدير',
  accountant: 'محاسب',
  fleet_manager: 'مدير الأسطول',
  sales_agent: 'مندوب مبيعات',
  employee: 'موظف',
};

const categoryIcons = {
  Users,
  DollarSign,
  Settings,
  BarChart3,
  Shield,
  Car: Settings,
  Scale: Shield,
};

function getCategoryIcon(iconName: string) {
  return categoryIcons[iconName as keyof typeof categoryIcons] || Shield;
}

function getLevelMeta(level: string) {
  if (level === 'admin') return { label: 'إدارة', icon: ShieldCheck, className: 'text-[#FB6B7A]' };
  if (level === 'write') return { label: 'تعديل', icon: Settings, className: 'text-[#22C7A1]' };
  return { label: 'قراءة', icon: Eye, className: 'text-[#38BDF8]' };
}

export default function PermissionsMatrix({
  selectedUser,
  onPermissionChange,
  onRoleChange,
  readOnly = false,
  showRoleComparison = false,
  pendingPermissions = [],
  pendingRoles = [],
}: PermissionsMatrixProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { data: storedOverrides = [], isLoading } = useUserPermissions(selectedUser?.user_id);

  const effectiveRoles = pendingRoles.length > 0 ? pendingRoles : selectedUser?.roles || [];
  const baseRolePermissions = useMemo(() => {
    const permissions = new Set<string>();
    effectiveRoles.forEach((role) => {
      ROLE_PERMISSIONS[role]?.permissions.forEach((permission) => permissions.add(permission));
    });
    return permissions;
  }, [effectiveRoles]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, PermissionOverrideValue>();
    storedOverrides.forEach((permission) => map.set(permission.permission_id, permission.granted));
    pendingPermissions.forEach((permission) => map.set(permission.permissionId, permission.granted));
    return map;
  }, [storedOverrides, pendingPermissions]);

  const assignableRoles = useMemo(() => {
    const roles = user?.roles || [];
    if (roles.includes('super_admin')) return Object.keys(ROLE_PERMISSIONS) as UserRole[];
    if (roles.includes('company_admin')) return ['company_admin', 'manager', 'accountant', 'fleet_manager', 'sales_agent', 'employee'] as UserRole[];
    return roles.flatMap((role) => ROLE_PERMISSIONS[role as UserRole]?.canAssignRoles || []);
  }, [user?.roles]);

  const filteredPermissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return PERMISSIONS.filter((permission) => {
      const matchesCategory = selectedCategory === 'all' || permission.category.id === selectedCategory;
      const matchesSearch =
        !term ||
        permission.id.toLowerCase().includes(term) ||
        permission.name.toLowerCase().includes(term) ||
        permission.description.toLowerCase().includes(term) ||
        permission.category.nameAr.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const permissionStats = useMemo(() => {
    let allowed = 0;
    let denied = 0;
    let inherited = 0;
    PERMISSIONS.forEach((permission) => {
      const override = overrideMap.get(permission.id);
      if (override === true) allowed++;
      else if (override === false) denied++;
      else if (baseRolePermissions.has(permission.id)) inherited++;
    });
    return { allowed, denied, inherited };
  }, [baseRolePermissions, overrideMap]);

  const getPermissionState = (permissionId: string) => {
    const override = overrideMap.get(permissionId);
    const inherited = baseRolePermissions.has(permissionId);
    const granted = override === true || (override === undefined && inherited);
    const mode: 'inherit' | 'allow' | 'deny' =
      override === true ? 'allow' : override === false ? 'deny' : 'inherit';
    return { override, inherited, granted, mode };
  };

  const handlePermissionMode = (permissionId: string, mode: 'inherit' | 'allow' | 'deny') => {
    if (readOnly || !onPermissionChange) return;
    onPermissionChange(permissionId, mode === 'inherit' ? null : mode === 'allow');
  };

  if (selectedUser && isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-[#64748B]">
        <LoadingSpinner size="lg" />
        <span className="font-bold">جاري تحميل صلاحيات المستخدم...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {selectedUser && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-black text-[#020617]">الأدوار الأساسية</h3>
              <p className="text-sm font-bold text-[#94A3B8]">الدور يعطي صلاحيات افتراضية، ويمكن تعديل كل صلاحية للمستخدم بشكل مستقل.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-[#22C7A1]">سماح خاص: {permissionStats.allowed}</span>
              <span className="rounded-full bg-[#FFF0F2] px-3 py-1 text-[#FB6B7A]">منع خاص: {permissionStats.denied}</span>
              <span className="rounded-full bg-[#EAF8FE] px-3 py-1 text-[#38BDF8]">موروث: {permissionStats.inherited}</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) => {
              const active = effectiveRoles.includes(role);
              const disabled = readOnly || !assignableRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={disabled}
                  onClick={() => onRoleChange?.(role, !active)}
                  className={cn(
                    'flex min-h-[74px] items-center justify-between rounded-xl border p-3 text-right transition',
                    active ? 'border-[#22C7A1] bg-[#E8FBF6]' : 'border-slate-200 bg-[#F8FAFC]',
                    disabled && 'cursor-not-allowed opacity-55'
                  )}
                >
                  <div>
                    <div className="font-black text-[#020617]">{roleLabels[role]}</div>
                    <div className="mt-1 text-xs font-bold text-[#94A3B8]">{ROLE_PERMISSIONS[role].permissions.length} صلاحية</div>
                  </div>
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', active ? 'bg-[#22C7A1] text-white' : 'bg-white text-[#94A3B8]')}>
                    {active ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-black text-[#020617]">الصلاحيات التفصيلية</h3>
            <p className="text-sm font-bold text-[#94A3B8]">اختر لكل صلاحية: ترث من الدور، سماح خاص، أو منع خاص.</p>
          </div>
          <div className="relative w-full xl:w-[360px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الصلاحية أو الكود..."
              className="h-11 rounded-xl border-slate-200 bg-[#F6F8FB] pr-10 text-[#020617]"
            />
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Button
            type="button"
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className={cn('h-10 shrink-0 rounded-xl', selectedCategory === 'all' && 'bg-[#22C7A1] hover:bg-[#1DAE8D]')}
          >
            الكل
          </Button>
          {PERMISSION_CATEGORIES.map((category) => {
            const Icon = getCategoryIcon(category.icon);
            return (
              <Button
                key={category.id}
                type="button"
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className={cn('h-10 shrink-0 gap-2 rounded-xl', selectedCategory === category.id && 'bg-[#22C7A1] hover:bg-[#1DAE8D]')}
              >
                <Icon className="h-4 w-4" />
                {category.nameAr}
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredPermissions.map((permission) => {
            const level = getLevelMeta(permission.level);
            const LevelIcon = level.icon;
            const state = getPermissionState(permission.id);
            const roleSources = effectiveRoles.filter((role) => ROLE_PERMISSIONS[role]?.permissions.includes(permission.id));
            const canEditSystem = !permission.isSystemLevel || user?.roles?.includes('super_admin') || user?.roles?.includes('company_admin');
            const disabled = readOnly || !canEditSystem;

            return (
              <div
                key={permission.id}
                className={cn(
                  'rounded-2xl border p-4 transition',
                  state.mode === 'deny'
                    ? 'border-[#FECACA] bg-[#FFF7F8]'
                    : state.granted
                      ? 'border-[#BBF7D0] bg-[#F7FFFC]'
                      : 'border-slate-200 bg-[#F8FAFC]'
                )}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-black text-[#020617]">{permission.name}</span>
                      <Badge variant="outline" className={cn('gap-1 rounded-lg', level.className)}>
                        <LevelIcon className="h-3 w-3" />
                        {level.label}
                      </Badge>
                      {permission.isSystemLevel && (
                        <Badge className="gap-1 rounded-lg bg-[#FFF0F2] text-[#FB6B7A] hover:bg-[#FFF0F2]">
                          <AlertTriangle className="h-3 w-3" />
                          حساسة
                        </Badge>
                      )}
                      {state.mode === 'allow' && <Badge className="rounded-lg bg-[#E8FBF6] text-[#22C7A1] hover:bg-[#E8FBF6]">سماح خاص</Badge>}
                      {state.mode === 'deny' && <Badge className="rounded-lg bg-[#FFF0F2] text-[#FB6B7A] hover:bg-[#FFF0F2]">منع خاص</Badge>}
                    </div>
                    <p className="text-sm font-bold leading-6 text-[#64748B]">{permission.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[#94A3B8]">
                      <span className="rounded-lg bg-white px-2 py-1">{permission.id}</span>
                      {roleSources.length > 0 ? (
                        <span>موروثة من: {roleSources.map((role) => roleLabels[role]).join('، ')}</span>
                      ) : (
                        <span>غير موجودة في الأدوار الحالية</span>
                      )}
                    </div>
                  </div>

                  <div className="grid min-w-full grid-cols-3 gap-2 rounded-xl bg-white p-1 xl:min-w-[330px]">
                    {[
                      { value: 'inherit' as const, label: 'يرث', icon: Minus },
                      { value: 'allow' as const, label: 'سماح', icon: Check },
                      { value: 'deny' as const, label: 'منع', icon: X },
                    ].map((option) => {
                      const Icon = option.icon;
                      const active = state.mode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => handlePermissionMode(permission.id, option.value)}
                          className={cn(
                            'flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-black transition',
                            active && option.value === 'inherit' && 'bg-[#EAF8FE] text-[#0284C7]',
                            active && option.value === 'allow' && 'bg-[#E8FBF6] text-[#22C7A1]',
                            active && option.value === 'deny' && 'bg-[#FFF0F2] text-[#FB6B7A]',
                            !active && 'text-[#94A3B8] hover:bg-[#F6F8FB]',
                            disabled && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {permission.isSystemLevel && !canEditSystem && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF7ED] px-3 py-2 text-xs font-bold text-[#C2410C]">
                    <Lock className="h-4 w-4" />
                    تعديل هذه الصلاحية يحتاج مدير شركة أو مدير نظام.
                  </div>
                )}
              </div>
            );
          })}

          {filteredPermissions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-[#CBD5E1]" />
              <p className="font-black text-[#020617]">لا توجد صلاحيات مطابقة</p>
              <p className="mt-1 text-sm font-bold text-[#94A3B8]">غيّر البحث أو اختر قسمًا آخر.</p>
            </div>
          )}
        </div>
      </div>

      {showRoleComparison && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black text-[#020617]">ملخص الأدوار</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(Object.entries(ROLE_PERMISSIONS) as Array<[UserRole, typeof ROLE_PERMISSIONS[UserRole]]>).map(([role, data]) => (
              <div key={role} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#020617]">{roleLabels[role]}</span>
                  <Badge variant="outline">{data.permissions.length}</Badge>
                </div>
                <p className="mt-2 text-xs font-bold leading-5 text-[#94A3B8]">
                  يمكنه تعيين {data.canAssignRoles?.length || 0} أدوار.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
