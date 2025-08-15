import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateInGregorian } from '@/utils/dateFormatter';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  User, 
  Calendar,
  AlertTriangle,
  Send
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ContractApprovalWorkflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
}

interface ApprovalStep {
  id: string;
  step_order: number;
  approver_role: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  rejected_at?: string;
  comments?: string;
  created_at: string;
}

export const ContractApprovalWorkflow: React.FC<ContractApprovalWorkflowProps> = ({
  open,
  onOpenChange,
  contract
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch real approval workflow steps
  const { data: approvalSteps, isLoading } = useQuery({
    queryKey: ['contract-approval-steps', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      
      const { data, error } = await supabase
        .from('contract_approval_steps')
        .select(`
          *,
          approver:profiles!contract_approval_steps_approver_id_fkey(first_name, last_name, email)
        `)
        .eq('contract_id', contract.id)
        .order('step_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!contract?.id
  });
  

  // Check if current user can approve current step
  const { data: canApprove } = useQuery({
    queryKey: ['can-approve', contract?.id, user?.id],
    queryFn: async () => {
      if (!contract?.id || !user?.id) return false;
      
      // Check if user has manager or admin role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const hasApprovalRole = userRoles?.some(r => 
        r.role === 'company_admin' || r.role === 'manager'
      );
      
      if (!hasApprovalRole) return false;
      
      // Check if there's a pending step that user can approve
      const pendingStep = approvalSteps?.find(step => 
        step.status === 'pending' && 
        (step.approver_id === user.id || !step.approver_id)
      );
      
      return !!pendingStep;
    },
    enabled: !!contract?.id && !!user?.id && !!approvalSteps
  });

  // Approve contract mutation
  const approveContract = useMutation({
    mutationFn: async ({ action, comments }: { action: 'approve' | 'reject', comments: string }) => {
      const pendingStep = approvalSteps?.find(step => step.status === 'pending');
      if (!pendingStep) throw new Error('No pending approval step found');

      // Update the current step
      const { error: stepError } = await supabase
        .from('contract_approval_steps')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          approver_id: user?.id,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null,
          comments
        })
        .eq('id', pendingStep.id);

      if (stepError) throw stepError;

      // Update contract status based on workflow completion
      let newContractStatus = contract.status;
      
      if (action === 'reject') {
        newContractStatus = 'cancelled';
      } else {
        // Check if all steps are approved
        const { data: allSteps } = await supabase
          .from('contract_approval_steps')
          .select('status')
          .eq('contract_id', contract.id);
        
        const allApproved = allSteps?.every((step: any) => 
          step.status === 'approved'
        );
        
        if (allApproved) {
          newContractStatus = 'active';
        }
      }

      // Update contract status if changed
      if (newContractStatus !== contract.status) {
        const { error: contractError } = await supabase
          .from('contracts')
          .update({ status: newContractStatus })
          .eq('id', contract.id);

        if (contractError) throw contractError;
      }

      return { action, newContractStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract-approval-steps'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      
      toast.success(
        data.action === 'approve' 
          ? 'تم الموافقة على العقد بنجاح' 
          : 'تم رفض العقد'
      );
      
      setComment('');
    },
    onError: (error) => {
      console.error('Error updating approval:', error);
      toast.error('حدث خطأ في تحديث حالة الموافقة');
    }
  });

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!comment.trim()) {
      toast.error('يرجى إضافة تعليق');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await approveContract.mutateAsync({ action, comments: comment });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };


  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'approved': return 'تمت الموافقة';
      case 'rejected': return 'مرفوض';
      case 'pending': return 'في انتظار الموافقة';
      default: return 'غير محدد';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            سير عمل الموافقة - العقد رقم <NumberDisplay value={contract.contract_number} className="inline" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ملخص العقد</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">نوع العقد</span>
                <p className="font-medium">
                  {contract.contract_type === 'rental' ? 'إيجار' :
                   contract.contract_type === 'service' ? 'خدمة' :
                   contract.contract_type === 'maintenance' ? 'صيانة' : 'مبيعات'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">قيمة العقد</span>
                <p className="font-medium">{formatCurrency(contract.contract_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">المدة</span>
                <p className="font-medium">
                  {formatDateInGregorian(contract.start_date)} - {formatDateInGregorian(contract.end_date)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approval Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">خطوات الموافقة</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : approvalSteps && approvalSteps.length > 0 ? (
                <div className="space-y-4">
                  {approvalSteps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getStepIcon(step.status)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">الخطوة {step.step_order}</h4>
                            <p className="text-sm text-muted-foreground">
                              {step.approver_role === 'manager' ? 'موافقة المدير' :
                               step.approver_role === 'company_admin' ? 'موافقة إدارة الشركة' :
                               step.approver_role}
                            </p>
                          </div>
                          <Badge className={getStepColor(step.status)}>
                            {getStepStatus(step.status)}
                          </Badge>
                        </div>
                        
                        {step.approver && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {(step.approver as any).first_name?.[0]}{(step.approver as any).last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {(step.approver as any).first_name} {(step.approver as any).last_name}
                            </span>
                          </div>
                        )}
                        
                        {step.comments && (
                          <div className="bg-muted p-3 rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">تعليق</span>
                            </div>
                            <p className="text-sm">{step.comments}</p>
                          </div>
                        )}
                        
                        {(step.approved_at || step.rejected_at) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                             <span>
                               {step.approved_at 
                                 ? `تمت الموافقة في ${formatDateInGregorian(step.approved_at)}`
                                 : `تم الرفض في ${formatDateInGregorian(step.rejected_at!)}`
                               }
                             </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لم يتم إعداد سير عمل الموافقة لهذا العقد</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current User Action */}
          {canApprove && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  إجراء مطلوب منك
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">مطلوب موافقتك على هذا العقد</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    يرجى مراجعة تفاصيل العقد وإضافة تعليقك ثم اختيار الموافقة أو الرفض
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">التعليق *</label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="أضف تعليقك على العقد..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApproval('approve')}
                    disabled={isSubmitting || !comment.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    موافقة
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleApproval('reject')}
                    disabled={isSubmitting || !comment.trim()}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    رفض
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};