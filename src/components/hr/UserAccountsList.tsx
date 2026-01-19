import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, ShieldAlert, ShieldCheck, UserX, Edit, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserAccountsListProps {
  employees: any[];
  onEditRoles?: (employee: any) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-success text-success-foreground">نشط</Badge>;
    case 'inactive':
      return <Badge variant="secondary">غير نشط</Badge>;
    case 'suspended':
      return <Badge variant="destructive">معلق</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getRolesBadges = (roles: any[]) => {
  const roleLabels: Record<string, string> = {
    'company_admin': 'مدير الشركة',
    'manager': 'مدير',
    'sales_agent': 'مندوب مبيعات',
    'employee': 'موظف'
  };

  return roles?.map((roleObj) => (
    <Badge key={roleObj.role} variant="outline" className="text-xs">
      {roleLabels[roleObj.role] || roleObj.role}
    </Badge>
  ));
};

export default function UserAccountsList({ employees, onEditRoles }: UserAccountsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAccountStatusMutation = useMutation({
    mutationFn: async ({ employeeId, newStatus }: { employeeId: string, newStatus: string }) => {
      const { error } = await supabase
        .from('employees')
        .update({ account_status: newStatus })
        .eq('id', employeeId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_user_account_action', {
        employee_id_param: employeeId,
        action_type_param: newStatus === 'active' ? 'account_activated' : 
                          newStatus === 'inactive' ? 'account_deactivated' : 'account_suspended',
        performed_by_param: user?.id,
        details_param: { new_status: newStatus }
      });
    },
    onSuccess: (_, { newStatus }) => {
      toast({
        title: "تم تحديث حالة الحساب",
        description: `تم ${newStatus === 'active' ? 'تفعيل' : newStatus === 'inactive' ? 'إلغاء تفعيل' : 'تعليق'} الحساب بنجاح`
      });
      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الحساب",
        description: error.message
      });
    }
  });

  const handleStatusChange = (employeeId: string, newStatus: string) => {
    updateAccountStatusMutation.mutate({ employeeId, newStatus });
  };

  if (!employees || employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            الموظفون الذين لديهم حسابات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا يوجد موظفون لديهم حسابات في النظام حاليًا
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          الموظفون الذين لديهم حسابات ({employees.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Employee Info */}
                  <div>
                    <h3 className="font-semibold">{employee.first_name} {employee.last_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      رقم الموظف: {employee.employee_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      المنصب: {employee.position || 'غير محدد'}
                    </p>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">حالة الحساب:</span>
                      {getStatusBadge(employee.account_status)}
                    </div>
                    
                    {employee.profiles?.[0]?.email && (
                      <p className="text-xs text-muted-foreground">
                        البريد: {employee.profiles[0].email}
                      </p>
                    )}
                  </div>

                  {/* Roles */}
                  <div>
                    <span className="text-xs text-muted-foreground">الأدوار:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getRolesBadges(employee.user_roles)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-1">
                      {employee.account_status === 'active' && (
                        <ShieldCheck className="w-4 h-4 text-success" />
                      )}
                      {employee.account_status === 'inactive' && (
                        <ShieldAlert className="w-4 h-4 text-warning" />
                      )}
                      {employee.account_status === 'suspended' && (
                        <UserX className="w-4 h-4 text-destructive" />
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditRoles?.(employee)}>
                          <Edit className="w-4 h-4 mr-2" />
                          تعديل الأدوار
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {employee.account_status === 'active' && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <ShieldAlert className="w-4 h-4 mr-2" />
                                  إلغاء التفعيل
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد إلغاء التفعيل</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من إلغاء تفعيل حساب {employee.first_name} {employee.last_name}؟
                                    لن يتمكن من الدخول إلى النظام.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleStatusChange(employee.id, 'inactive')}
                                    className="bg-warning hover:bg-warning/90"
                                  >
                                    إلغاء التفعيل
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <UserX className="w-4 h-4 mr-2" />
                                  تعليق الحساب
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد تعليق الحساب</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من تعليق حساب {employee.first_name} {employee.last_name}؟
                                    سيتم منعه من الدخول فورًا.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleStatusChange(employee.id, 'suspended')}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    تعليق الحساب
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        
                        {employee.account_status !== 'active' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(employee.id, 'active')}
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            تفعيل الحساب
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}