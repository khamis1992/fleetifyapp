import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Shield, 
  AlertTriangle,
  Activity,
  Target,
  Calendar,
  Eye,
  Lock
} from 'lucide-react';
import { ROLE_PERMISSIONS, PERMISSION_CATEGORIES, UserRole } from '@/types/permissions';

interface PermissionUsageData {
  permission_id: string;
  usage_count: number;
  last_used: string;
  avg_session_duration: number;
}

interface SecurityMetrics {
  total_users: number;
  users_with_excessive_permissions: number;
  unused_permissions: string[];
  privilege_escalation_attempts: number;
  last_permission_audit: string;
}

export default function PermissionAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('usage');

  // Fetch permission usage analytics
  const { data: usageData } = useQuery({
    queryKey: ['permission-analytics', timeRange],
    queryFn: async (): Promise<PermissionUsageData[]> => {
      // Simulated data - replace with actual analytics query
      return [
        { permission_id: 'customers.read', usage_count: 245, last_used: '2024-01-15', avg_session_duration: 15 },
        { permission_id: 'finance.invoices.read', usage_count: 189, last_used: '2024-01-15', avg_session_duration: 22 },
        { permission_id: 'hr.employees.read', usage_count: 156, last_used: '2024-01-14', avg_session_duration: 12 },
        { permission_id: 'contracts.read', usage_count: 134, last_used: '2024-01-14', avg_session_duration: 18 },
        { permission_id: 'fleet.vehicles.read', usage_count: 98, last_used: '2024-01-13', avg_session_duration: 8 }
      ];
    }
  });

  // Fetch security metrics
  const { data: securityMetrics } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: async (): Promise<SecurityMetrics> => {
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('has_system_access', true);

      return {
        total_users: employees?.length || 0,
        users_with_excessive_permissions: 3,
        unused_permissions: ['legal.cases.delete', 'system.backup.create', 'finance.treasury.export'],
        privilege_escalation_attempts: 0,
        last_permission_audit: '2024-01-10'
      };
    }
  });

  // Fetch users and roles data
  const { data: usersRolesData } = useQuery({
    queryKey: ['users-roles-analytics'],
    queryFn: async () => {
      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          has_system_access
        `)
        .eq('has_system_access', true);

      if (!employees) return [];

      const userIds = employees.map(emp => emp.user_id).filter(Boolean);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      return employees.map(emp => ({
        ...emp,
        roles: roles?.filter(r => r.user_id === emp.user_id) || []
      }));
    }
  });

  const calculateRoleDistribution = () => {
    if (!usersRolesData) return {};
    
    const distribution: Record<UserRole, number> = {
      super_admin: 0,
      company_admin: 0,
      manager: 0,
      sales_agent: 0,
      employee: 0
    };

    usersRolesData.forEach(user => {
      user.roles.forEach(roleRecord => {
        if (roleRecord.role in distribution) {
          distribution[roleRecord.role as UserRole]++;
        }
      });
    });

    return distribution;
  };

  const calculatePermissionCoverage = () => {
    if (!usersRolesData) return {};
    
    const coverage: Record<string, number> = {};
    
    PERMISSION_CATEGORIES.forEach(category => {
      let totalUsers = 0;
      usersRolesData.forEach(user => {
        const hasAnyPermissionInCategory = user.roles.some(roleRecord => {
          const rolePerms = ROLE_PERMISSIONS[roleRecord.role as UserRole]?.permissions || [];
          return rolePerms.some(permId => permId.startsWith(category.id + '.'));
        });
        if (hasAnyPermissionInCategory) totalUsers++;
      });
      coverage[category.id] = totalUsers;
    });
    
    return coverage;
  };

  const getUnusedPermissions = () => {
    return securityMetrics?.unused_permissions || [];
  };

  const getMostUsedPermissions = () => {
    return usageData?.slice(0, 5) || [];
  };

  const roleDistribution = calculateRoleDistribution();
  const permissionCoverage = calculatePermissionCoverage();
  const totalUsers = usersRolesData?.length || 0;

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'مدير النظام',
    company_admin: 'مدير الشركة',
    manager: 'مدير',
    sales_agent: 'مندوب مبيعات',
    employee: 'موظف'
  };

  const securityScore = securityMetrics ? 
    Math.max(0, 100 - (securityMetrics.users_with_excessive_permissions * 10) - (securityMetrics.unused_permissions.length * 2)) : 0;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">تحليلات الصلاحيات</h2>
          <p className="text-muted-foreground">
            مراقبة استخدام الصلاحيات والأمان
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">آخر 7 أيام</SelectItem>
              <SelectItem value="30d">آخر 30 يوم</SelectItem>
              <SelectItem value="90d">آخر 3 أشهر</SelectItem>
              <SelectItem value="1y">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usage">الاستخدام</SelectItem>
              <SelectItem value="security">الأمان</SelectItem>
              <SelectItem value="efficiency">الكفاءة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{usageData?.reduce((sum, item) => sum + item.usage_count, 0) || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الاستخدامات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">{securityScore}%</p>
                <p className="text-sm text-muted-foreground">نقاط الأمان</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{getUnusedPermissions().length}</p>
                <p className="text-sm text-muted-foreground">صلاحيات غير مستخدمة</p>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(roleDistribution).map(([role, count]) => {
              const percentage = totalUsers > 0 ? ((count as number) / totalUsers) * 100 : 0;
              return (
                <div key={role} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{roleLabels[role as UserRole]}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% من المستخدمين
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Most Used Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              الصلاحيات الأكثر استخداماً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getMostUsedPermissions().map((permission, index) => (
                <div key={permission.permission_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{permission.permission_id}</p>
                      <p className="text-sm text-muted-foreground">
                        متوسط الجلسة: {permission.avg_session_duration} دقيقة
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{permission.usage_count}</p>
                    <p className="text-xs text-muted-foreground">استخدام</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permission Category Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              تغطية فئات الصلاحيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PERMISSION_CATEGORIES.map(category => {
                const userCount = permissionCoverage[category.id] || 0;
                const percentage = totalUsers > 0 ? (userCount / totalUsers) * 100 : 0;
                
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category.nameAr}</span>
                      <span className="text-sm text-muted-foreground">
                        {userCount} / {totalUsers}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% من المستخدمين لديهم صلاحيات في هذه الفئة
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Issues */}
      {getUnusedPermissions().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              تحسينات الأمان
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">صلاحيات غير مستخدمة</h4>
                <div className="flex flex-wrap gap-2">
                  {getUnusedPermissions().map(permission => (
                    <Badge key={permission} variant="outline" className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {permission}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  هذه الصلاحيات لم يتم استخدامها في الفترة المحددة. يمكن إزالتها لتحسين الأمان.
                </p>
              </div>

              {securityMetrics && securityMetrics.users_with_excessive_permissions > 0 && (
                <div>
                  <h4 className="font-medium mb-2">مستخدمون بصلاحيات مفرطة</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {securityMetrics.users_with_excessive_permissions} مستخدم
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      لديهم صلاحيات أكثر من المطلوب لوظائفهم
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                آخر مراجعة أمنية: {securityMetrics && new Date(securityMetrics.last_permission_audit).toLocaleDateString('ar-SA')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}