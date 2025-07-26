import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

  // Mock approval workflow steps for demo
  const approvalSteps = [
    {
      id: '1',
      step_order: 1,
      approver_role: 'manager',
      status: contract?.status === 'draft' ? 'pending' : 'approved',
      approved_at: contract?.status !== 'draft' ? contract?.created_at : null,
      rejected_at: null,
      comments: contract?.status !== 'draft' ? 'تمت الموافقة على العقد' : null,
      approver: null
    }
  ];
  const isLoading = false;

  // Simple check if user can approve (for demo)
  const canApprove = contract?.status === 'draft';

  // Simple approve contract function
  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!comment.trim()) {
      toast.error('يرجى إضافة تعليق');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newStatus = action === 'approve' ? 'active' : 'cancelled';
      const { error } = await supabase
        .from('contracts')
        .update({ status: newStatus })
        .eq('id', contract.id);

      if (error) throw error;

      toast.success(action === 'approve' ? 'تم الموافقة على العقد بنجاح' : 'تم رفض العقد');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('حدث خطأ في تحديث حالة الموافقة');
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
            سير عمل الموافقة - العقد رقم {contract.contract_number}
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
                <p className="font-medium">{contract.contract_amount?.toFixed(3)} د.ك</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">المدة</span>
                <p className="font-medium">
                  {new Date(contract.start_date).toLocaleDateString('ar-SA')} - {new Date(contract.end_date).toLocaleDateString('ar-SA')}
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
                                ? `تمت الموافقة في ${new Date(step.approved_at).toLocaleDateString('ar-SA')}`
                                : `تم الرفض في ${new Date(step.rejected_at!).toLocaleDateString('ar-SA')}`
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