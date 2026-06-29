import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  KeyRound,
  Mail,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import UserAccountForm from '@/components/hr/UserAccountForm';
import PermissionsMatrix from '@/components/hr/permissions/PermissionsMatrix';
import { useUpdateUserPermissions, useUpdateUserRoles } from '@/hooks/useUserPermissions';
import { UserRole } from '@/types/permissions';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { cn } from '@/lib/utils';
import {
  HRMetricCard,
  HRPageHeader,
  HRPageShell,
  HRSectionCard,
  hrButtonClassName,
  hrFieldClassName,
} from '@/components/hr/HRDesignSystem';

type PermissionOverrideValue = boolean | null;

interface EmployeeWithAccess {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_number: string | null;
  position: string | null;
  has_system_access: boolean | null;
  user_roles: UserRole[];
  permission_override_count: number;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
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

const roleTone: Record<UserRole, string> = {
  super_admin: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
  company_admin: 'bg-[#FFF0F2] text-[#FB6B7A] border-[#FECDD3]',
  manager: 'bg-[#EAF8FE] text-[#0284C7] border-[#BAE6FD]',
  accountant: 'bg-[#E8FBF6] text-[#22C7A1] border-[#BBF7D0]',
  fleet_manager: 'bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]',
  sales_agent: 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]',
  employee: 'bg-[#F6F8FB] text-[#64748B] border-[#E2E8F0]',
};

export default function UserManagement() {
  return (
    <AdminGuard>
      <UserManagementContent />
    </AdminGuard>
  );
}

function UserManagementContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updatePermissionsMutation = useUpdateUserPermissions();
  const updateRolesMutation = useUpdateUserRoles();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<EmployeeWithAccess | null>(null);
  const [employeeForAccount, setEmployeeForAccount] = useState<any>(null);
  const [pendingPermissionChanges, setPendingPermissionChanges] = useState<
    { permissionId: string; granted: PermissionOverrideValue }[]
  >([]);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<UserRole[]>([]);

  const {
    data: employeesWithoutAccess = [],
    isLoading: loadingWithoutAccess,
  } = useQuery({
    queryKey: ['employees-without-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('has_system_access', false)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
  });

  const {
    data: employeesWithAccess = [],
    isLoading: loadingAccounts,
    error: accountsError,
    refetch,
  } = useQuery<EmployeeWithAccess[]>({
    queryKey: ['employees-with-access'],
    queryFn: async () => {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, user_id, first_name, last_name, employee_number, position, has_system_access')
        .eq('has_system_access', true)
        .not('user_id', 'is', null)
        .order('first_name');

      if (employeeError) throw employeeError;
      if (!employeeData?.length) return [];

      const userIds = employeeData.map((employee) => employee.user_id).filter(Boolean) as string[];

      const [{ data: rolesData }, { data: profilesData }, { data: overridesData }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
        supabase.from('profiles').select('user_id, first_name, last_name, email').in('user_id', userIds),
        supabase.from('user_permissions').select('user_id, permission_id, granted').in('user_id', userIds),
      ]);

      const rolesByUser = (rolesData || []).reduce<Record<string, UserRole[]>>((acc, row) => {
        acc[row.user_id] = acc[row.user_id] || [];
        acc[row.user_id].push(row.role as UserRole);
        return acc;
      }, {});

      const profilesByUser = (profilesData || []).reduce<
        Record<string, { first_name: string | null; last_name: string | null; email: string | null }>
      >((acc, profile) => {
        acc[profile.user_id] = {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
        };
        return acc;
      }, {});

      const overridesByUser = (overridesData || []).reduce<Record<string, number>>((acc, override) => {
        acc[override.user_id] = (acc[override.user_id] || 0) + 1;
        return acc;
      }, {});

      return employeeData.map((employee) => ({
        id: employee.id,
        user_id: employee.user_id!,
        first_name: employee.first_name,
        last_name: employee.last_name,
        employee_number: employee.employee_number,
        position: employee.position,
        has_system_access: employee.has_system_access,
        user_roles: rolesByUser[employee.user_id!] || [],
        permission_override_count: overridesByUser[employee.user_id!] || 0,
        profiles: profilesByUser[employee.user_id!] || null,
      }));
    },
    retry: 2,
    staleTime: 3 * 60 * 1000,
  });

  const { data: accountRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['account-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_creation_requests')
        .select('id, status')
        .eq('status', 'pending');

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingWithoutAccess || loadingAccounts || loadingRequests;
  const hasUnsavedChanges = pendingPermissionChanges.length > 0 || rolesChanged(selectedUser?.user_roles || [], pendingRoleChanges);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return employeesWithAccess.filter((employee) => {
      const searchable = [
        employee.first_name,
        employee.last_name,
        employee.employee_number,
        employee.position,
        employee.profiles?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesRole = filterRole === 'all' || employee.user_roles.includes(filterRole as UserRole);

      return matchesSearch && matchesRole;
    });
  }, [employeesWithAccess, filterRole, searchTerm]);

  const selectedUserForMatrix = selectedUser
    ? {
        user_id: selectedUser.user_id,
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        roles: selectedUser.user_roles,
      }
    : undefined;

  const selectUser = (employee: EmployeeWithAccess) => {
    if (hasUnsavedChanges && !window.confirm('لديك تغييرات غير محفوظة. هل تريد تجاهلها والمتابعة؟')) {
      return;
    }

    setSelectedUser(employee);
    setPendingRoleChanges(employee.user_roles);
    setPendingPermissionChanges([]);
  };

  const handlePermissionChange = (permissionId: string, granted: PermissionOverrideValue) => {
    setPendingPermissionChanges((current) => {
      const existing = current.find((permission) => permission.permissionId === permissionId);
      if (existing) {
        return current.map((permission) =>
          permission.permissionId === permissionId ? { permissionId, granted } : permission,
        );
      }

      return [...current, { permissionId, granted }];
    });
  };

  const handleRoleChange = (role: UserRole, assigned: boolean) => {
    setPendingRoleChanges((current) => {
      if (assigned) return current.includes(role) ? current : [...current, role];
      return current.filter((currentRole) => currentRole !== role);
    });
  };

  const resetPendingChanges = () => {
    setPendingPermissionChanges([]);
    setPendingRoleChanges(selectedUser?.user_roles || []);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;

    try {
      if (pendingPermissionChanges.length > 0) {
        await updatePermissionsMutation.mutateAsync({
          userId: selectedUser.user_id,
          permissions: pendingPermissionChanges,
        });
      }

      if (rolesChanged(selectedUser.user_roles, pendingRoleChanges)) {
        await updateRolesMutation.mutateAsync({
          userId: selectedUser.user_id,
          roles: pendingRoleChanges,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees-with-access'] }),
        queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUser.user_id] }),
        queryClient.invalidateQueries({ queryKey: ['user-permissions-check'] }),
      ]);

      const refreshed = await refetch();
      const updatedUser = refreshed.data?.find((employee) => employee.user_id === selectedUser.user_id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
        setPendingRoleChanges(updatedUser.user_roles);
      }
      setPendingPermissionChanges([]);

      toast({
        title: 'تم حفظ الصلاحيات',
        description: 'تم تحديث أدوار وصلاحيات المستخدم بنجاح.',
      });
    } catch (error) {
      toast({
        title: 'تعذر حفظ التغييرات',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء الحفظ.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB]" dir="rtl">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-[#22C7A1] border-t-transparent" />
          <p className="font-black text-[#020617]">جاري تحميل المستخدمين والصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-4" dir="rtl">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#FB6B7A]" />
          <h3 className="mb-2 text-lg font-black text-[#020617]">تعذر تحميل المستخدمين</h3>
          <p className="mb-4 text-sm font-bold text-[#64748B]">{(accountsError as Error).message}</p>
          <Button onClick={() => refetch()} className={hrButtonClassName}>
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <HRPageShell>
      <HRPageHeader
        title="إدارة المستخدمين والصلاحيات"
        description="تحكم مرن في صلاحيات كل موظف: الدور يعطي الصلاحيات الأساسية، ويمكنك إضافة سماح خاص أو منع خاص لكل صلاحية."
        icon={Shield}
        badge="نظام الصلاحيات"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            {employeesWithoutAccess.length > 0 && (
              <Button className={cn(hrButtonClassName, 'gap-2')} onClick={() => setEmployeeForAccount(employeesWithoutAccess[0])}>
                <UserPlus className="h-4 w-4" />
                إنشاء حساب
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HRMetricCard title="مستخدمون نشطون" value={employeesWithAccess.length} icon={UserCheck} tone="success" />
        <HRMetricCard title="بدون حساب نظام" value={employeesWithoutAccess.length} icon={UserPlus} tone="danger" />
        <HRMetricCard title="طلبات معلقة" value={accountRequests.length} icon={Clock} tone="focus" />
        <HRMetricCard
          title="تخصيصات صلاحيات"
          value={employeesWithAccess.reduce((total, employee) => total + employee.permission_override_count, 0)}
          icon={KeyRound}
          tone="info"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-5">
          <HRSectionCard className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#020617]">سجل المستخدمين</h2>
                <p className="text-sm font-bold text-[#94A3B8]">اختر مستخدماً لتعديل صلاحياته مباشرة.</p>
              </div>
              <Badge className="rounded-full bg-[#E8FBF6] text-[#22C7A1] hover:bg-[#E8FBF6]">
                {filteredUsers.length} مستخدم
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث بالاسم، الرقم الوظيفي، البريد..."
                  className={cn(hrFieldClassName, 'pr-10')}
                />
              </div>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className={cn(hrFieldClassName, 'w-full')}>
                  <Filter className="ml-2 h-4 w-4 text-[#94A3B8]" />
                  <SelectValue placeholder="تصفية حسب الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأدوار</SelectItem>
                  {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <EmptyState icon={Users} title="لا توجد نتائج" description="غيّر البحث أو التصفية لعرض مستخدمين آخرين." />
              ) : (
                filteredUsers.map((employee) => (
                  <UserAccessCard
                    key={employee.id}
                    employee={employee}
                    active={selectedUser?.user_id === employee.user_id}
                    onClick={() => selectUser(employee)}
                  />
                ))
              )}
            </div>
          </HRSectionCard>

          <HRSectionCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#020617]">موظفون بدون حساب</h2>
                <p className="text-sm font-bold text-[#94A3B8]">أنشئ حساب نظام للموظف ثم عيّن صلاحياته.</p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {employeesWithoutAccess.length}
              </Badge>
            </div>
            <div className="max-h-[230px] space-y-2 overflow-y-auto pr-1">
              {employeesWithoutAccess.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="كل الموظفين لديهم حسابات" description="لا توجد حسابات ناقصة حالياً." compact />
              ) : (
                employeesWithoutAccess.slice(0, 8).map((employee: any) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setEmployeeForAccount(employee)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-right transition hover:border-[#22C7A1] hover:bg-[#F7FFFC]"
                  >
                    <div>
                      <div className="font-black text-[#020617]">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs font-bold text-[#94A3B8]">{employee.position || 'بدون منصب'}</div>
                    </div>
                    <span className="rounded-lg bg-white px-3 py-1 text-xs font-black text-[#22C7A1]">إنشاء</span>
                  </button>
                ))
              )}
            </div>
          </HRSectionCard>
        </div>

        <div className="space-y-5">
          <HRSectionCard className="overflow-hidden">
            {selectedUser ? (
              <>
                <div className="border-b border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#102B4E] text-xl font-black text-white">
                        {getInitials(selectedUser.first_name, selectedUser.last_name)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-black text-[#020617]">
                            {selectedUser.first_name} {selectedUser.last_name}
                          </h2>
                          {selectedUser.permission_override_count > 0 && (
                            <Badge className="rounded-full bg-[#EAF8FE] text-[#0284C7] hover:bg-[#EAF8FE]">
                              {selectedUser.permission_override_count} تخصيص
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-bold text-[#64748B]">
                          <span>{selectedUser.position || 'بدون منصب'}</span>
                          {selectedUser.profiles?.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {selectedUser.profiles.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {hasUnsavedChanges && (
                        <Badge className="rounded-full bg-[#FFF7ED] text-[#EA580C] hover:bg-[#FFF7ED]">
                          تغييرات غير محفوظة
                        </Badge>
                      )}
                      <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={resetPendingChanges} disabled={!hasUnsavedChanges}>
                        <X className="h-4 w-4" />
                        إلغاء
                      </Button>
                      <Button
                        className={cn(hrButtonClassName, 'gap-2')}
                        onClick={handleSaveChanges}
                        disabled={!hasUnsavedChanges || updatePermissionsMutation.isPending || updateRolesMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                        حفظ الصلاحيات
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(pendingRoleChanges.length ? pendingRoleChanges : selectedUser.user_roles).map((role) => (
                      <span key={role} className={cn('rounded-full border px-3 py-1 text-xs font-black', roleTone[role])}>
                        {roleLabels[role]}
                      </span>
                    ))}
                    {(pendingRoleChanges.length ? pendingRoleChanges : selectedUser.user_roles).length === 0 && (
                      <span className="rounded-full bg-[#FFF0F2] px-3 py-1 text-xs font-black text-[#FB6B7A]">بدون دور</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-4">
                  <PermissionsMatrix
                    selectedUser={selectedUserForMatrix}
                    onPermissionChange={handlePermissionChange}
                    onRoleChange={handleRoleChange}
                    pendingPermissions={pendingPermissionChanges}
                    pendingRoles={pendingRoleChanges}
                    showRoleComparison={false}
                  />
                </div>
              </>
            ) : (
              <div className="flex min-h-[620px] items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E8FBF6] text-[#22C7A1]">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-black text-[#020617]">اختر مستخدماً لبدء التعديل</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#64748B]">
                    يمكنك تعيين أدوار عامة، ثم تخصيص كل صلاحية بشكل مستقل عبر السماح أو المنع أو الرجوع للوراثة من الدور.
                  </p>
                </div>
              </div>
            )}
          </HRSectionCard>
        </div>
      </div>

      {employeeForAccount && (
        <UserAccountForm
          employee={employeeForAccount}
          open={!!employeeForAccount}
          onOpenChange={(open) => {
            if (!open) setEmployeeForAccount(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['employees-without-access'] });
            queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
            setEmployeeForAccount(null);
          }}
        />
      )}
    </HRPageShell>
  );
}

function UserAccessCard({
  employee,
  active,
  onClick,
}: {
  employee: EmployeeWithAccess;
  active: boolean;
  onClick: () => void;
}) {
  const primaryRoles = employee.user_roles.slice(0, 2);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border p-3 text-right transition',
        active ? 'border-[#22C7A1] bg-[#F7FFFC] shadow-sm' : 'border-slate-200 bg-white hover:border-[#BDEFE4]',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black', active ? 'bg-[#22C7A1] text-white' : 'bg-[#F1F5F9] text-[#102B4E]')}>
          {getInitials(employee.first_name, employee.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-black text-[#020617]">
            {employee.first_name} {employee.last_name}
          </div>
          <div className="truncate text-xs font-bold text-[#94A3B8]">
            {employee.position || 'بدون منصب'} {employee.employee_number ? `• ${employee.employee_number}` : ''}
          </div>
        </div>
        {active && <CheckCircle2 className="h-5 w-5 text-[#22C7A1]" />}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {primaryRoles.map((role) => (
          <span key={role} className={cn('rounded-full border px-2 py-1 text-[11px] font-black', roleTone[role])}>
            {roleLabels[role]}
          </span>
        ))}
        {employee.user_roles.length > 2 && (
          <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[11px] font-black text-[#64748B]">
            +{employee.user_roles.length - 2}
          </span>
        )}
        {employee.permission_override_count > 0 && (
          <span className="rounded-full bg-[#EAF8FE] px-2 py-1 text-[11px] font-black text-[#0284C7]">
            {employee.permission_override_count} تخصيص
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] text-center', compact ? 'p-4' : 'p-8')}>
      <Icon className="mx-auto mb-3 h-9 w-9 text-[#94A3B8]" />
      <h3 className="font-black text-[#020617]">{title}</h3>
      <p className="mt-1 text-sm font-bold text-[#94A3B8]">{description}</p>
    </div>
  );
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'م';
}

function rolesChanged(originalRoles: UserRole[], pendingRoles: UserRole[]) {
  if (originalRoles.length !== pendingRoles.length) return true;
  const original = [...originalRoles].sort().join('|');
  const pending = [...pendingRoles].sort().join('|');
  return original !== pending;
}
