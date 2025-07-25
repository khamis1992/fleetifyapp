import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Users, UserPlus, Shield, History, Search, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserAccountForm from '@/components/hr/UserAccountForm';
import UserAccountsList from '@/components/hr/UserAccountsList';
import AccountRequestsList from '@/components/hr/AccountRequestsList';
import UserAuditLog from '@/components/hr/UserAuditLog';
import PermissionsDashboard from '@/components/hr/permissions/PermissionsDashboard';
import UserPermissionsDialog from '@/components/hr/permissions/UserPermissionsDialog';
import PermissionsMatrix from '@/components/hr/permissions/PermissionsMatrix';

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedEmployeeForPermissions, setSelectedEmployeeForPermissions] = useState<any>(null);

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
  const { data: employeesWithAccess, isLoading: loadingAccounts } = useQuery({
    queryKey: ['employees-with-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          profiles!employees_user_id_fkey (
            first_name,
            last_name,
            email
          ),
          user_roles!inner (
            role
          )
        `)
        .eq('has_system_access', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    }
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
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                مصفوفة الصلاحيات والأدوار
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionsMatrix showRoleComparison={true} readOnly={true} />
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