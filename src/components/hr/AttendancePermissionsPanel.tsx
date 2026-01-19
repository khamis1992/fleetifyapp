import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, User, CheckCircle, XCircle, RefreshCw, UserCheck } from 'lucide-react';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';

interface EmployeeAttendanceStatus {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  user_id?: string;
  account_status: string;
  has_system_access: boolean;
  roles: string[];
  hasAttendancePermission: boolean;
}

export const AttendancePermissionsPanel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFixingAll, setIsFixingAll] = useState(false);

  const companyFilter = useCompanyFilter();

  const { data: employeeStatuses, isLoading } = useQuery({
    queryKey: ['employee-attendance-status', companyFilter?.company_id ?? 'all'],
    queryFn: async () => {
      // Get company-scoped active employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, user_id, account_status, has_system_access')
        .match(companyFilter as Record<string, string>)
        .eq('is_active', true)
        .order('first_name');

      if (empError) throw empError;

      const results: EmployeeAttendanceStatus[] = [];

      for (const employee of employees || []) {
        let roles: string[] = [];
        let hasAttendancePermission = false;

        if (employee.user_id) {
          // Get user roles
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', employee.user_id);

          roles = userRoles?.map(r => r.role) || [];

          // Check if has attendance permission through roles
          hasAttendancePermission = roles.some(role => 
            ['employee', 'sales_agent', 'manager', 'company_admin', 'super_admin'].includes(role)
          );
        }

        results.push({
          ...employee,
          roles,
          hasAttendancePermission
        });
      }

      return results;
    },
  });

  const fixAllPermissionsMutation = useMutation({
    mutationFn: async () => {
      const issues = employeeStatuses?.filter(emp => 
        emp.user_id && !emp.hasAttendancePermission && emp.has_system_access
      ) || [];

      if (issues.length === 0) return;

      // Grant employee role to users who don't have any role
      for (const employee of issues) {
        if (employee.user_id && employee.roles.length === 0) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: employee.user_id,
              role: 'employee'
            });
        }
      }

      // Update employee data
      await supabase
        .from('employees')
        .update({ 
          has_system_access: true,
          account_status: 'active'
        })
        .in('id', issues.map(e => e.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-status'] });
      toast({
        title: 'تم إصلاح الصلاحيات بنجاح',
        description: 'تم منح جميع الموظفين صلاحيات تسجيل الحضور',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'خطأ في إصلاح الصلاحيات',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFixAll = async () => {
    setIsFixingAll(true);
    try {
      await fixAllPermissionsMutation.mutateAsync();
    } finally {
      setIsFixingAll(false);
    }
  };

  const issuesCount = employeeStatuses?.filter(emp => 
    emp.user_id && (!emp.hasAttendancePermission || !emp.has_system_access || emp.account_status !== 'active')
  ).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          صلاحيات تسجيل الحضور
        </CardTitle>
        <CardDescription>
          إدارة صلاحيات تسجيل الحضور للموظفين
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={issuesCount > 0 ? "destructive" : "default"}>
              {issuesCount > 0 ? `${issuesCount} مشاكل` : 'جميع الصلاحيات صحيحة'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              إجمالي الموظفين: {employeeStatuses?.length || 0}
            </span>
          </div>
          
          {issuesCount > 0 && (
            <Button 
              onClick={handleFixAll}
              disabled={isFixingAll}
              className="gap-2"
            >
              {isFixingAll ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              إصلاح جميع المشاكل
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {employeeStatuses?.map((employee) => {
            const canAttendance = employee.hasAttendancePermission && employee.has_system_access && employee.account_status === 'active';
            
            return (
              <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {employee.employee_number}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {employee.user_id ? (
                    canAttendance ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        يمكن تسجيل الحضور
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        لا يمكن تسجيل الحضور
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">
                      لا يوجد حساب مستخدم
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};