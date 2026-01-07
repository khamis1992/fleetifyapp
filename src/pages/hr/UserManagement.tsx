import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Search, 
  Settings, 
  Save, 
  X, 
  ChevronLeft,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Mail,
  Building2,
  KeyRound,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserAccountForm from '@/components/hr/UserAccountForm';
import UserPermissionsDialog from '@/components/hr/permissions/UserPermissionsDialog';
import PermissionsMatrix from '@/components/hr/permissions/PermissionsMatrix';
import { useUpdateUserPermissions, useUpdateUserRoles } from '@/hooks/useUserPermissions';
import { UserRole } from '@/types/permissions';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { cn } from '@/lib/utils';

// Type definitions
interface EmployeeWithAccess {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  position: string;
  has_system_access: boolean;
  user_roles: string[];
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconBg, iconColor, trend }) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 cursor-default"
  >
    <div className="flex items-center justify-between">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-3xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{title}</p>
    </div>
  </motion.div>
);

// User Card Component
interface UserCardProps {
  employee: EmployeeWithAccess;
  isSelected: boolean;
  onSelect: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ employee, isSelected, onSelect }) => {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'company_admin': return 'bg-rose-100 text-coral-700 border-rose-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'accountant': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'fleet_manager': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'sales_agent': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'super_admin': 'مدير النظام',
      'company_admin': 'مدير الشركة',
      'manager': 'مدير',
      'accountant': 'محاسب',
      'fleet_manager': 'مدير الأسطول',
      'sales_agent': 'موظف مبيعات',
      'employee': 'موظف'
    };
    return labels[role] || role;
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        'bg-white rounded-xl p-4 cursor-pointer transition-all border-2',
        isSelected 
          ? 'border-coral-400 shadow-lg shadow-rose-100' 
          : 'border-transparent shadow-sm hover:border-neutral-200 hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
          isSelected ? 'bg-rose-500 text-white' : 'bg-neutral-100 text-neutral-600'
        )}>
          {employee.first_name.charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-neutral-900 truncate">
              {employee.first_name} {employee.last_name}
            </h4>
            {isSelected && (
              <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-neutral-500 truncate">{employee.position || 'غير محدد'}</p>
        </div>

        {/* Roles */}
        <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
          {employee.user_roles?.slice(0, 2).map((role, idx) => (
            <span
              key={idx}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border',
                getRoleBadgeColor(role)
              )}
            >
              {getRoleLabel(role)}
            </span>
          ))}
          {employee.user_roles?.length > 2 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              +{employee.user_roles.length - 2}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function UserManagement() {
  return (
    <AdminGuard>
      <UserManagementContent />
    </AdminGuard>
  );
}

function UserManagementContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedEmployeeForPermissions, setSelectedEmployeeForPermissions] = useState<any>(null);
  const [selectedUserForMatrix, setSelectedUserForMatrix] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPermissionChanges, setPendingPermissionChanges] = useState<{permissionId: string; granted: boolean}[]>([]);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<UserRole[]>([]);
  const [activeView, setActiveView] = useState<'users' | 'permissions'>('users');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Mutation hooks
  const updatePermissionsMutation = useUpdateUserPermissions();
  const updateRolesMutation = useUpdateUserRoles();

  // Fetch employees without system access
  const { data: employeesWithoutAccess, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-without-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('has_system_access', false)
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch employees with system access
  const { data: employeesWithAccess, isLoading: loadingAccounts, error: accountsError, refetch } = useQuery<EmployeeWithAccess[]>({
    queryKey: ['employees-with-access'],
    queryFn: async () => {
      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            employee_number,
            position,
            has_system_access
          `)
          .eq('has_system_access', true)
          .not('user_id', 'is', null)
          .order('first_name');
        
        if (employeeError) throw employeeError;

        if (!employeeData || employeeData.length === 0) {
          return [];
        }

        const employeeIds = employeeData.map(emp => emp.user_id).filter(Boolean);
        
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', employeeIds);

        const rolesByUser = (rolesData || []).reduce((acc, roleRecord) => {
          if (!acc[roleRecord.user_id]) {
            acc[roleRecord.user_id] = [];
          }
          acc[roleRecord.user_id].push(roleRecord.role);
          return acc;
        }, {} as Record<string, string[]>);

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', employeeIds);

        const profilesByUser = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          };
          return acc;
        }, {} as Record<string, { first_name: string; last_name: string; email: string }>);

        const enrichedData: EmployeeWithAccess[] = employeeData.map(employee => ({
          id: employee.id,
          user_id: employee.user_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          employee_number: employee.employee_number,
          position: employee.position,
          has_system_access: employee.has_system_access,
          user_roles: rolesByUser[employee.user_id] || [],
          profiles: profilesByUser[employee.user_id] || null
        }));

        return enrichedData;
      } catch (error) {
        console.error('Error fetching employees with access:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending account requests
  const { data: accountRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['account-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_creation_requests')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_number,
            position
          )
        `)
        .eq('status', 'pending')
        .order('request_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Filtered users
  const filteredUsers = useMemo(() => {
    let users = employeesWithAccess || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(emp =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term) ||
        emp.employee_number?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    }

    if (filterRole !== 'all') {
      users = users.filter(emp => emp.user_roles?.includes(filterRole));
    }

    return users;
  }, [employeesWithAccess, searchTerm, filterRole]);

  // Handlers
  const handleUserSelection = (userId: string) => {
    const employee = employeesWithAccess?.find(emp => emp.user_id === userId);
    
    if (!employee) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على بيانات المستخدم",
        variant: "destructive",
      });
      return;
    }

    const userObj = {
      user_id: employee.user_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      roles: Array.isArray(employee.user_roles) ? employee.user_roles : []
    };

    setSelectedUserForMatrix(userObj);
    setHasUnsavedChanges(false);
    setPendingPermissionChanges([]);
    setPendingRoleChanges(userObj.roles as UserRole[]);
    setActiveView('permissions');
  };

  const handlePermissionChange = (permission: string, granted: boolean) => {
    setHasUnsavedChanges(true);
    setPendingPermissionChanges(prev => {
      const existing = prev.find(p => p.permissionId === permission);
      if (existing) {
        return prev.map(p => p.permissionId === permission ? { ...p, granted } : p);
      }
      return [...prev, { permissionId: permission, granted }];
    });
  };

  const handleRoleChange = (role: UserRole, assigned: boolean) => {
    setHasUnsavedChanges(true);
    setPendingRoleChanges(prev => {
      if (assigned) {
        return prev.includes(role) ? prev : [...prev, role];
      } else {
        return prev.filter(r => r !== role);
      }
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedUserForMatrix) return;

    try {
      await updatePermissionsMutation.mutateAsync({
        userId: selectedUserForMatrix.user_id,
        permissions: pendingPermissionChanges
      });

      await updateRolesMutation.mutateAsync({
        userId: selectedUserForMatrix.user_id,
        roles: pendingRoleChanges
      });

      setHasUnsavedChanges(false);
      setPendingPermissionChanges([]);
      
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحديث الصلاحيات والأدوار",
      });

      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    }
  };

  const handleCancelChanges = () => {
    setHasUnsavedChanges(false);
    setPendingPermissionChanges([]);
    if (selectedUserForMatrix) {
      const originalEmployee = employeesWithAccess?.find(emp => emp.user_id === selectedUserForMatrix.user_id);
      if (originalEmployee) {
        setPendingRoleChanges(originalEmployee.user_roles as UserRole[] || []);
      }
    }
  };

  const handleBackToUsers = () => {
    if (hasUnsavedChanges) {
      if (!confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟')) {
        return;
      }
    }
    setActiveView('users');
    setSelectedUserForMatrix(null);
    setHasUnsavedChanges(false);
    setPendingPermissionChanges([]);
    setPendingRoleChanges([]);
  };

  // Loading state
  if (loadingEmployees || loadingAccounts || loadingRequests) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (accountsError) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-neutral-600 mb-4">{(accountsError as Error).message}</p>
          <Button onClick={() => refetch()} className="bg-rose-500 hover:bg-coral-600">
            <RefreshCw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {activeView === 'permissions' && (
                <button
                  onClick={handleBackToUsers}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-neutral-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  {activeView === 'users' ? 'إدارة المستخدمين' : 'تعديل الصلاحيات'}
                </h1>
                <p className="text-xs text-neutral-500">
                  {activeView === 'users' 
                    ? 'إدارة حسابات المستخدمين والصلاحيات'
                    : selectedUserForMatrix 
                      ? `${selectedUserForMatrix.first_name} ${selectedUserForMatrix.last_name}`
                      : ''
                  }
                </p>
              </div>
            </div>

            {/* Save/Cancel buttons for permissions view */}
            {activeView === 'permissions' && hasUnsavedChanges && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelChanges}
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={updatePermissionsMutation.isPending || updateRolesMutation.isPending}
                  className="gap-1 bg-rose-500 hover:bg-coral-600"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeView === 'users' ? (
            <motion.div
              key="users-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <StatCard
                  title="بدون حساب"
                  value={employeesWithoutAccess?.length || 0}
                  icon={UserPlus}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
                <StatCard
                  title="لديهم حساب"
                  value={employeesWithAccess?.length || 0}
                  icon={UserCheck}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <StatCard
                  title="طلبات معلقة"
                  value={accountRequests?.length || 0}
                  icon={Clock}
                  iconBg="bg-orange-50"
                  iconColor="text-orange-600"
                />
                <StatCard
                  title="إجمالي الموظفين"
                  value={(employeesWithoutAccess?.length || 0) + (employeesWithAccess?.length || 0)}
                  icon={Users}
                  iconBg="bg-rose-50"
                  iconColor="text-coral-600"
                />
              </motion.div>

              {/* Search & Filter */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    placeholder="البحث بالاسم أو المنصب..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 bg-neutral-50 border-neutral-200 focus:border-coral-400 focus:ring-coral-400"
                    dir="rtl"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-neutral-50">
                    <Filter className="w-4 h-4 ml-2 text-neutral-400" />
                    <SelectValue placeholder="تصفية حسب الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأدوار</SelectItem>
                    <SelectItem value="super_admin">مدير النظام</SelectItem>
                    <SelectItem value="company_admin">مدير الشركة</SelectItem>
                    <SelectItem value="manager">مدير</SelectItem>
                    <SelectItem value="accountant">محاسب</SelectItem>
                    <SelectItem value="fleet_manager">مدير الأسطول</SelectItem>
                    <SelectItem value="sales_agent">موظف مبيعات</SelectItem>
                    <SelectItem value="employee">موظف</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Users List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    المستخدمون ({filteredUsers.length})
                  </h2>
                  <p className="text-sm text-neutral-500">
                    اضغط على مستخدم لتعديل صلاحياته
                  </p>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center">
                    <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">لا توجد نتائج</h3>
                    <p className="text-neutral-500">جرب تغيير معايير البحث أو التصفية</p>
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-3"
                  >
                    {filteredUsers.map((employee) => (
                      <UserCard
                        key={employee.id}
                        employee={employee}
                        isSelected={selectedUserForMatrix?.user_id === employee.user_id}
                        onSelect={() => handleUserSelection(employee.user_id)}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="permissions-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Selected User Info */}
              {selectedUserForMatrix && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-2xl font-bold text-coral-600">
                      {selectedUserForMatrix.first_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-neutral-900">
                        {selectedUserForMatrix.first_name} {selectedUserForMatrix.last_name}
                      </h2>
                      <p className="text-neutral-500">تعديل الأدوار والصلاحيات</p>
                    </div>
                    {hasUnsavedChanges && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-amber-700">تغييرات غير محفوظة</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Permissions Matrix */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <PermissionsMatrix 
                  selectedUser={selectedUserForMatrix}
                  onPermissionChange={handlePermissionChange}
                  onRoleChange={handleRoleChange}
                  showRoleComparison={true} 
                  readOnly={!selectedUserForMatrix}
                  pendingPermissions={pendingPermissionChanges}
                  pendingRoles={pendingRoleChanges}
                />
              </motion.div>

              {/* Unsaved Changes Warning */}
              <AnimatePresence>
                {hasUnsavedChanges && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4"
                  >
                    <span className="text-sm font-medium">لديك تغييرات غير محفوظة</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelChanges}
                        className="px-3 py-1 text-sm bg-neutral-700 rounded-full hover:bg-neutral-600 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        disabled={updatePermissionsMutation.isPending || updateRolesMutation.isPending}
                        className="px-3 py-1 text-sm bg-rose-500 rounded-full hover:bg-coral-600 transition-colors disabled:opacity-50"
                      >
                        حفظ التغييرات
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* User Account Form Dialog */}
      {showAccountForm && selectedEmployee && (
        <UserAccountForm
          employee={selectedEmployee}
          open={showAccountForm}
          onOpenChange={setShowAccountForm}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['employees-without-access'] });
            queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
            setShowAccountForm(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {/* User Permissions Dialog */}
      {showPermissionsDialog && selectedEmployeeForPermissions && (
        <UserPermissionsDialog
          employee={selectedEmployeeForPermissions}
          open={showPermissionsDialog}
          onOpenChange={setShowPermissionsDialog}
        />
      )}
    </div>
  );
}
