import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { UserRole } from '@/types/permissions';
import PermissionsMatrix from './PermissionsMatrix';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    position?: string;
    user_id?: string;
    user_roles?: { role: UserRole }[];
  } | null;
}

export default function UserPermissionsDialog({
  open,
  onOpenChange,
  employee
}: UserPermissionsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Initialize state when employee changes
  useEffect(() => {
    if (employee) {
      const currentRoles = employee.user_roles?.map(ur => ur.role) || [];
      setSelectedRoles(currentRoles);
      setCustomPermissions([]);
      setReason('');
      
      // Check if changes require approval
      const hasSystemLevelChanges = false; // You can implement logic here
      setRequiresApproval(hasSystemLevelChanges);
    }
  }, [employee]);

  const updateRolesMutation = useMutation({
    mutationFn: async ({
      employeeId,
      userId,
      newRoles,
      reason
    }: {
      employeeId: string;
      userId: string;
      newRoles: UserRole[];
      reason: string;
    }) => {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new roles
      if (newRoles.length > 0) {
        const roleInserts = newRoles.map(role => ({
          user_id: userId,
          role: role
        }));
        
        const { error } = await supabase
          .from('user_roles')
          .insert(roleInserts);
          
        if (error) throw error;
      }

      // Log the action
      await supabase.rpc('log_user_account_action', {
        employee_id_param: employeeId,
        action_type_param: 'roles_updated',
        performed_by_param: user?.id,
        details_param: {
          new_roles: newRoles,
          reason: reason
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الأدوار",
        description: "تم تحديث أدوار المستخدم بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الأدوار",
        description: error.message
      });
    }
  });

  const createApprovalRequestMutation = useMutation({
    mutationFn: async ({
      employeeId,
      currentRoles,
      requestedRoles,
      reason
    }: {
      employeeId: string;
      currentRoles: UserRole[];
      requestedRoles: UserRole[];
      reason: string;
    }) => {
      // Get company_id first
      const { data: employeeData } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', employeeId)
        .single();
        
      if (!employeeData) throw new Error('Employee not found');
      
      const { error } = await supabase
        .from('permission_change_requests')
        .insert({
          company_id: employeeData.company_id,
          employee_id: employeeId,
          requested_by: user?.id,
          request_type: 'role_change',
          current_roles: currentRoles as string[],
          requested_roles: requestedRoles as string[],
          current_permissions: [],
          requested_permissions: [],
          reason: reason,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال طلب الموافقة",
        description: "تم إرسال طلب تغيير الأدوار للمراجعة"
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في إرسال الطلب",
        description: error.message
      });
    }
  });

  const handleRoleChange = (role: UserRole, assigned: boolean) => {
    if (assigned) {
      setSelectedRoles(prev => [...prev, role]);
    } else {
      setSelectedRoles(prev => prev.filter(r => r !== role));
    }
  };

  const handlePermissionChange = (permission: string, granted: boolean) => {
    if (granted) {
      setCustomPermissions(prev => [...prev, permission]);
    } else {
      setCustomPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const handleSave = () => {
    if (!employee || !employee.user_id) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "معرف المستخدم غير موجود"
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "سبب مطلوب",
        description: "يرجى إدخال سبب التغيير"
      });
      return;
    }

    const currentRoles = employee.user_roles?.map(ur => ur.role) || [];
    
    if (requiresApproval) {
      createApprovalRequestMutation.mutate({
        employeeId: employee.id,
        currentRoles,
        requestedRoles: selectedRoles,
        reason
      });
    } else {
      updateRolesMutation.mutate({
        employeeId: employee.id,
        userId: employee.user_id,
        newRoles: selectedRoles,
        reason
      });
    }
  };

  const hasChanges = () => {
    const currentRoles = employee?.user_roles?.map(ur => ur.role) || [];
    return JSON.stringify(currentRoles.sort()) !== JSON.stringify(selectedRoles.sort());
  };

  if (!employee) return null;

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'مدير النظام',
    company_admin: 'مدير الشركة',
    manager: 'مدير',
    sales_agent: 'مندوب مبيعات',
    employee: 'موظف'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            إدارة صلاحيات المستخدم
          </DialogTitle>
        </DialogHeader>

        {/* Employee Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {employee.first_name} {employee.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  رقم الموظف: {employee.employee_number}
                </p>
                {employee.position && (
                  <p className="text-sm text-muted-foreground">
                    المنصب: {employee.position}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {employee.user_roles?.map(ur => (
                  <Badge key={ur.role} variant="outline">
                    {roleLabels[ur.role]}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <PermissionsMatrix
          selectedUser={{
            id: employee.user_id || '',
            name: `${employee.first_name} ${employee.last_name}`,
            roles: selectedRoles,
            customPermissions
          }}
          onRoleChange={handleRoleChange}
          onPermissionChange={handlePermissionChange}
          readOnly={false}
        />

        {/* Change Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">سبب التغيير *</Label>
          <Textarea
            id="reason"
            placeholder="يرجى إدخال سبب تغيير الصلاحيات..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {/* Approval Notice */}
        {requiresApproval && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              هذا التغيير يتطلب موافقة من مدير أعلى. سيتم إرسال طلب للمراجعة.
            </AlertDescription>
          </Alert>
        )}

        {/* Changes Summary */}
        {hasChanges() && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                ملخص التغييرات
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">الأدوار الحالية:</span>
                  <div className="flex gap-1">
                    {employee.user_roles?.map(ur => (
                  <Badge key={ur.role} variant="outline">
                    {roleLabels[ur.role]}
                  </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">الأدوار الجديدة:</span>
                  <div className="flex gap-1">
                    {selectedRoles.map(role => (
                      <Badge key={role} variant="default">
                        {roleLabels[role]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges() || !reason.trim() || updateRolesMutation.isPending || createApprovalRequestMutation.isPending}
          >
            {requiresApproval ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                إرسال للموافقة
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}