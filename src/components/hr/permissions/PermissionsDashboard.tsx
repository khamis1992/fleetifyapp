import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { ROLE_PERMISSIONS, PERMISSION_CATEGORIES, UserRole } from '@/types/permissions';

export default function PermissionsDashboard() {
  // Fetch users and their roles
  const { data: usersData } = useQuery({
    queryKey: ['users-roles-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          account_status,
          has_system_access,
          user_id
        `)
        .eq('has_system_access', true)
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Fetch roles separately
      const employeeIds = data?.map(emp => emp.user_id).filter(Boolean) || [];
      let rolesData: any[] = [];
      
      if (employeeIds.length > 0) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', employeeIds);
        
        rolesData = roles || [];
      }
      
      // Combine data
      const enhancedData = data?.map(emp => ({
        ...emp,
        user_roles: rolesData.filter(role => role.user_id === emp.user_id)
      }));
      
      return enhancedData;
    }
  });

  // Fetch permission change requests
  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-permission-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_change_requests')
        .select(`
          id,
          employee_id,
          requested_by,
          request_type,
          reason,
          status,
          created_at,
          expires_at
        `)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      // Fetch employee and requester data separately
      const employeeIds = data?.map(req => req.employee_id).filter(Boolean) || [];
      const requesterIds = data?.map(req => req.requested_by).filter(Boolean) || [];
      
      let employeesData: any[] = [];
      let requestersData: any[] = [];
      
      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', employeeIds);
        employeesData = employees || [];
      }
      
      if (requesterIds.length > 0) {
        const { data: requesters } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', requesterIds);
        requestersData = requesters || [];
      }
      
      // Combine data
      const enhancedData = data?.map(req => ({
        ...req,
        employees: employeesData.find(emp => emp.id === req.employee_id),
        requester: requestersData.find(reqer => reqer.user_id === req.requested_by)
      }));
      
      return enhancedData;
    }
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!usersData) return null;

    const roleDistribution: Record<UserRole, number> = {
      super_admin: 0,
      company_admin: 0,
      manager: 0,
      accountant: 0,
      fleet_manager: 0,
      sales_agent: 0,
      employee: 0
    };

    const statusDistribution = {
      active: 0,
      inactive: 0,
      suspended: 0
    };

    usersData.forEach(user => {
      // Count role distribution
      user.user_roles?.forEach(ur => {
        if (ur.role in roleDistribution) {
          roleDistribution[ur.role as UserRole]++;
        }
      });

      // Count status distribution
      if (user.account_status in statusDistribution) {
        statusDistribution[user.account_status as keyof typeof statusDistribution]++;
      }
    });

    const totalUsers = usersData.length;
    const activeUsers = statusDistribution.active;
    const usersWithRoles = usersData.filter(u => u.user_roles && u.user_roles.length > 0).length;

    return {
      totalUsers,
      activeUsers,
      usersWithRoles,
      roleDistribution,
      statusDistribution,
      activePercentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      rolesAssignedPercentage: totalUsers > 0 ? (usersWithRoles / totalUsers) * 100 : 0
    };
  }, [usersData]);

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'مدير النظام',
    company_admin: 'مدير الشركة',
    manager: 'مدير',
    accountant: 'محاسب',
    fleet_manager: 'مدير الأسطول',
    sales_agent: 'مندوب مبيعات',
    employee: 'موظف'
  };

  const getRoleColor = (role: UserRole): string => {
    const colors = {
      super_admin: 'bg-red-500',
      company_admin: 'bg-orange-500',
      manager: 'bg-blue-500',
      accountant: 'bg-emerald-500',
      fleet_manager: 'bg-cyan-500',
      sales_agent: 'bg-green-500',
      employee: 'bg-gray-500'
    };
    return colors[role];
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
                <p className="text-sm text-muted-foreground">مستخدمين نشطين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{pendingRequests?.length || 0}</p>
                <p className="text-sm text-muted-foreground">طلبات معلقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">{stats?.usersWithRoles || 0}</p>
                <p className="text-sm text-muted-foreground">لديهم أدوار</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              معدل المستخدمين النشطين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>المستخدمين النشطين</span>
                <span>{stats?.activePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={stats?.activePercentage || 0} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {stats?.activeUsers} من {stats?.totalUsers} مستخدم نشط
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              معدل تعيين الأدوار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>المستخدمين بأدوار</span>
                <span>{stats?.rolesAssignedPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={stats?.rolesAssignedPercentage || 0} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {stats?.usersWithRoles} من {stats?.totalUsers} لديهم أدوار معينة
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            توزيع الأدوار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats?.roleDistribution || {}).map(([role, count]) => {
              const roleKey = role as UserRole;
              const percentage = stats?.totalUsers ? (count / stats.totalUsers) * 100 : 0;
              
              return (
                <Card key={role}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge 
                          className={`${getRoleColor(roleKey)} text-white`}
                          variant="secondary"
                        >
                          {roleLabels[roleKey]}
                        </Badge>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% من المستخدمين
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permission Categories Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            استخدام فئات الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PERMISSION_CATEGORIES.map(category => {
              // Calculate how many users have permissions in this category
              const usersWithCategoryPerms = usersData?.filter(user => {
                return user.user_roles?.some(ur => {
                  const rolePerms = ROLE_PERMISSIONS[ur.role as UserRole]?.permissions || [];
                  return rolePerms.some(permId => permId.startsWith(category.id + '.'));
                });
              }).length || 0;
              
              const percentage = stats?.totalUsers ? (usersWithCategoryPerms / stats.totalUsers) * 100 : 0;
              
              return (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <h4 className="font-medium text-sm">{category.nameAr}</h4>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{usersWithCategoryPerms}</p>
                        <p className="text-xs text-muted-foreground">مستخدم</p>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {percentage.toFixed(1)}% تغطية
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Permission Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              طلبات الصلاحيات المعلقة ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.slice(0, 5).map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <div>
                      <p className="font-medium">
                        {request.employees?.first_name} {request.employees?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        طلب {request.request_type === 'role_change' ? 'تغيير دور' : 'تعديل صلاحيات'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">معلق</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              ))}
              {pendingRequests.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  و {pendingRequests.length - 5} طلبات أخرى معلقة
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}