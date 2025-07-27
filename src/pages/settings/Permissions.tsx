import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Users, UserPlus, Shield, History, Search, Settings, BarChart3, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserAccountForm from '@/components/hr/UserAccountForm';
import UserAccountsList from '@/components/hr/UserAccountsList';
import AccountRequestsList from '@/components/hr/AccountRequestsList';
import UserAuditLog from '@/components/hr/UserAuditLog';
import PermissionsDashboard from '@/components/hr/permissions/PermissionsDashboard';
import UserPermissionsDialog from '@/components/hr/permissions/UserPermissionsDialog';
import PermissionsMatrix from '@/components/hr/permissions/PermissionsMatrix';
import { useUpdateUserPermissions, useUpdateUserRoles } from '@/hooks/useUserPermissions';
import { UserRole } from '@/types/permissions';

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

export default function Permissions() {
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

  // Mutation hooks for saving changes
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
  const { data: employeesWithAccess, isLoading: loadingAccounts, error: accountsError } = useQuery<EmployeeWithAccess[]>({
    queryKey: ['employees-with-access'],
    queryFn: async () => {
      try {
        // First, get employees with system access
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

        // Get user IDs for fetching roles
        const employeeIds = employeeData.map(emp => emp.user_id).filter(Boolean);
        
        // Fetch roles separately to avoid duplicates
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', employeeIds);

        if (rolesError) {
          console.warn('Error fetching roles:', rolesError);
        }

        // Aggregate roles by user_id
        const rolesByUser = (rolesData || []).reduce((acc, roleRecord) => {
          if (!acc[roleRecord.user_id]) {
            acc[roleRecord.user_id] = [];
          }
          acc[roleRecord.user_id].push(roleRecord.role);
          return acc;
        }, {} as Record<string, string[]>);

        // Fetch profiles separately
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', employeeIds);

        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError);
        }

        // Create profiles map
        const profilesByUser = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          };
          return acc;
        }, {} as Record<string, { first_name: string; last_name: string; email: string }>);

        // Combine all data
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
          ),
          profiles!account_creation_requests_requested_by_fkey (
            first_name as requester_first_name,
            last_name as requester_last_name
          )
        `)
        .eq('status', 'pending')
        .order('request_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleCreateAccount = (employee: any) => {
    setSelectedEmployee(employee);
    setShowAccountForm(true);
  };

  const handleEditRoles = (employee: any) => {
    setSelectedEmployeeForPermissions(employee);
    setShowPermissionsDialog(true);
  };

  const handlePermissionChange = (permission: string, granted: boolean) => {
    setPendingPermissionChanges(prev => {
      const existing = prev.find(p => p.permissionId === permission);
      if (existing) {
        return prev.map(p => p.permissionId === permission ? { permissionId: permission, granted } : p);
      } else {
        return [...prev, { permissionId: permission, granted }];
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleRoleChange = (roles: UserRole[]) => {
    setPendingRoleChanges(roles);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUserForMatrix) return;

    try {
      // Save permissions
      if (pendingPermissionChanges.length > 0) {
        await updatePermissionsMutation.mutateAsync({
          userId: selectedUserForMatrix.user_id,
          permissions: pendingPermissionChanges
        });
      }

      // Save roles
      if (pendingRoleChanges.length > 0) {
        await updateRolesMutation.mutateAsync({
          userId: selectedUserForMatrix.user_id,
          roles: pendingRoleChanges
        });
      }

      // Reset state
      setPendingPermissionChanges([]);
      setPendingRoleChanges([]);
      setHasUnsavedChanges(false);
      setSelectedUserForMatrix(null);

      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ التغييرات بنجاح"
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive"
      });
    }
  };

  const handleCancelChanges = () => {
    setPendingPermissionChanges([]);
    setPendingRoleChanges([]);
    setHasUnsavedChanges(false);
    setSelectedUserForMatrix(null);
  };

  const filteredEmployeesWithAccess = employeesWithAccess?.filter(employee => 
    employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الصلاحيات</h1>
          <p className="text-muted-foreground">
            إدارة حسابات المستخدمين وصلاحياتهم في النظام
          </p>
        </div>
        
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2">
            <Alert className="py-2 px-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                لديك تغييرات غير محفوظة
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={handleCancelChanges}>
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
            <Button onClick={handleSaveChanges}>
              <Save className="h-4 w-4 mr-2" />
              حفظ التغييرات
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeesWithAccess?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              مستخدم نشط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدون حساب</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeesWithoutAccess?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              موظف بحاجة لحساب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات معلقة</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              طلب حساب جديد
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">آخر العمليات</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">
              عملية خلال 24 ساعة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 space-x-reverse">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="matrix">مصفوفة الصلاحيات</TabsTrigger>
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          <TabsTrigger value="requests">طلبات الحسابات</TabsTrigger>
          <TabsTrigger value="audit">سجل العمليات</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">لوحة تحكم الصلاحيات</h3>
            <p className="text-muted-foreground">عرض شامل لحالة المستخدمين والصلاحيات</p>
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">مصفوفة الصلاحيات</h3>
            <p className="text-muted-foreground">إدارة متقدمة لصلاحيات المستخدمين</p>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">إدارة الحسابات</h3>
            <p className="text-muted-foreground">قائمة بجميع حسابات المستخدمين النشطة</p>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">طلبات الحسابات</h3>
            <p className="text-muted-foreground">مراجعة طلبات إنشاء حسابات جديدة</p>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">سجل العمليات</h3>
            <p className="text-muted-foreground">تتبع جميع العمليات المتعلقة بالصلاحيات</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedEmployee && (
        <UserAccountForm
          employee={selectedEmployee}
          open={showAccountForm}
          onOpenChange={setShowAccountForm}
          onSuccess={() => {
            setShowAccountForm(false);
            setSelectedEmployee(null);
            queryClient.invalidateQueries({ queryKey: ['employees-without-access'] });
            queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
          }}
        />
      )}

      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        employee={selectedEmployeeForPermissions}
      />
    </div>
  );
}