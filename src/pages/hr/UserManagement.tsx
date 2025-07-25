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

export default function UserManagement() {
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

  const handleUserSelection = (userId: string) => {
    try {
      if (!userId) {
        setSelectedUserForMatrix(null);
        setHasUnsavedChanges(false);
        return;
      }

      const employee = employeesWithAccess?.find(emp => emp.user_id === userId);
      
      if (!employee) {
        console.warn(`Employee not found for user_id: ${userId}`);
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بيانات المستخدم المحدد",
          variant: "destructive",
        });
        return;
      }

      const user = {
        user_id: employee.user_id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        roles: Array.isArray(employee.user_roles) ? employee.user_roles : []
      };

      console.log('Selected user for matrix:', user);
      setSelectedUserForMatrix(user);
      setHasUnsavedChanges(false);
      
      toast({
        title: "تم اختيار المستخدم",
        description: `تم اختيار ${user.first_name} ${user.last_name} بنجاح`,
      });
    } catch (error) {
      console.error('Error in handleUserSelection:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء اختيار المستخدم",
        variant: "destructive",
      });
    }
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
      // Save permission changes
      if (pendingPermissionChanges.length > 0) {
        await updatePermissionsMutation.mutateAsync({
          userId: selectedUserForMatrix.user_id,
          permissions: pendingPermissionChanges
        });
      }

      // Save role changes
      await updateRolesMutation.mutateAsync({
        userId: selectedUserForMatrix.user_id,
        roles: pendingRoleChanges
      });

      // Reset state
      setHasUnsavedChanges(false);
      setPendingPermissionChanges([]);
      setPendingRoleChanges([]);
      
      // Refresh the selected user data
      const updatedEmployee = employeesWithAccess?.find(emp => emp.user_id === selectedUserForMatrix.user_id);
      if (updatedEmployee) {
        setSelectedUserForMatrix({
          user_id: updatedEmployee.user_id,
          first_name: updatedEmployee.first_name,
          last_name: updatedEmployee.last_name,
          roles: pendingRoleChanges
        });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const handleCancelChanges = () => {
    setHasUnsavedChanges(false);
    setPendingPermissionChanges([]);
    setPendingRoleChanges([]);
    // Reset user selection
    if (selectedUserForMatrix) {
      const originalEmployee = employeesWithAccess?.find(emp => emp.user_id === selectedUserForMatrix.user_id);
      if (originalEmployee) {
        setSelectedUserForMatrix({
          user_id: originalEmployee.user_id,
          first_name: originalEmployee.first_name,
          last_name: originalEmployee.last_name,
          roles: originalEmployee.user_roles || []
        });
      }
    }
  };

  const filteredEmployeesWithoutAccess = employeesWithoutAccess?.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployeesWithAccess = employeesWithAccess?.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingEmployees || loadingAccounts || loadingRequests) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Show error states
  if (accountsError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            خطأ في تحميل بيانات المستخدمين: {accountsError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة المستخدمين والصلاحيات</h1>
          <p className="text-muted-foreground">
            إدارة حسابات المستخدمين، الأدوار، والصلاحيات بشكل شامل
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{employeesWithoutAccess?.length || 0}</p>
                <p className="text-sm text-muted-foreground">بدون حساب</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{employeesWithAccess?.length || 0}</p>
                <p className="text-sm text-muted-foreground">لديهم حساب</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{accountRequests?.length || 0}</p>
                <p className="text-sm text-muted-foreground">طلبات معلقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">
                  {(employeesWithoutAccess?.length || 0) + (employeesWithAccess?.length || 0)}
                </p>
                <p className="text-sm text-muted-foreground">إجمالي الموظفين</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="البحث في الموظفين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Settings className="w-4 h-4 mr-2" />
            مصفوفة الصلاحيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PermissionsDashboard />
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  مصفوفة الصلاحيات والأدوار
                </div>
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelChanges}
                    >
                      <X className="w-4 h-4 mr-2" />
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      حفظ التغييرات
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">اختيار المستخدم لتعديل صلاحياته:</label>
                <Select value={selectedUserForMatrix?.user_id || ""} onValueChange={handleUserSelection}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر مستخدماً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesWithAccess && employeesWithAccess.length > 0 ? (
                      employeesWithAccess
                        .filter(employee => employee.user_id) // Only show employees with valid user_id
                        .map((employee, index) => (
                          <SelectItem key={`employee-${employee.user_id}-${index}`} value={employee.user_id}>
                            {employee.first_name} {employee.last_name} - {employee.position || 'غير محدد'}
                            {employee.user_roles && employee.user_roles.length > 0 && (
                              <span className="text-muted-foreground ml-2">
                                ({employee.user_roles.join(', ')})
                              </span>
                            )}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="" disabled>
                        لا توجد حسابات مستخدمين متاحة
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions Matrix */}
              <PermissionsMatrix 
                selectedUser={selectedUserForMatrix}
                onPermissionChange={handlePermissionChange}
                onRoleChange={handleRoleChange}
                showRoleComparison={true} 
                readOnly={!selectedUserForMatrix}
                pendingPermissions={pendingPermissionChanges}
                pendingRoles={pendingRoleChanges}
              />

              {/* Save/Cancel Actions */}
              {hasUnsavedChanges && selectedUserForMatrix && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        <span className="text-orange-800 font-medium">
                          لديك تغييرات غير محفوظة
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelChanges}
                          className="flex items-center"
                        >
                          <X className="w-4 h-4 mr-2" />
                          إلغاء
                        </Button>
                        <Button
                          onClick={handleSaveChanges}
                          disabled={updatePermissionsMutation.isPending || updateRolesMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          حفظ التغييرات
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!selectedUserForMatrix && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {employeesWithAccess && employeesWithAccess.length > 0 
                      ? "يرجى اختيار مستخدم من القائمة أعلاه لعرض وتعديل صلاحياته"
                      : "لا توجد حسابات مستخدمين متاحة للتعديل"
                    }
                  </AlertDescription>
                </Alert>
              )}

              {loadingAccounts && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="mr-2 text-muted-foreground">جاري تحميل بيانات المستخدمين...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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