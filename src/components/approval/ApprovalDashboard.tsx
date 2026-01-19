/**
 * Approval Dashboard
 * 
 * Central dashboard for managing all pending approvals.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowEngine } from '@/workflows/WorkflowEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/company';
import { toast } from 'sonner';
import type { Workflow } from '@/workflows/types';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';

export function ApprovalDashboard() {
  const { user } = useAuth();
  const userRoles = useUserRoles();
  const queryClient = useQueryClient();

  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return workflowEngine.getPendingApprovalsForUser(user.id, userRoles);
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (workflow: Workflow) => 
      workflowEngine.approve({
        workflow_id: workflow.id,
        user_id: user!.id,
        comments
      }),
    onSuccess: () => {
      toast.success('✅ تمت الموافقة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error('❌ فشلت الموافقة', { description: error.message });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (workflow: Workflow) =>
      workflowEngine.reject({
        workflow_id: workflow.id,
        user_id: user!.id,
        reason: comments,
        comments
      }),
    onSuccess: () => {
      toast.success('✅ تم الرفض');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error('❌ فشل الرفض', { description: error.message });
    }
  });

  const openDialog = (workflow: Workflow, action: 'approve' | 'reject') => {
    setSelectedWorkflow(workflow);
    setActionType(action);
    setComments('');
  };

  const closeDialog = () => {
    setSelectedWorkflow(null);
    setActionType(null);
    setComments('');
  };

  const handleAction = () => {
    if (!selectedWorkflow) return;

    if (actionType === 'approve') {
      approveMutation.mutate(selectedWorkflow);
    } else if (actionType === 'reject') {
      rejectMutation.mutate(selectedWorkflow);
    }
  };

  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      contract: 'عقد',
      payment: 'دفعة',
      invoice: 'فاتورة',
      purchase_order: 'أمر شراء',
      expense: 'مصروف',
      transfer: 'تحويل'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />معلق</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50"><AlertCircle className="h-3 w-3 mr-1" />قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />موافق عليه</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">جاري تحميل الموافقات المعلقة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">لوحة الموافقات</h1>
        <p className="text-slate-600 mt-2">
          إدارة جميع الطلبات المعلقة التي تحتاج موافقتك
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">الموافقات المعلقة</p>
                <p className="text-2xl font-bold">{pendingApprovals?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">تحتاج إجراء عاجل</p>
                <p className="text-2xl font-bold text-red-600">
                  {pendingApprovals?.filter(w => w.current_step > 0).length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">اليوم</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingApprovals?.filter(w => {
                    const today = new Date().toISOString().split('T')[0];
                    return w.created_at.startsWith(today);
                  }).length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">الطلبات المعلقة</h2>

        {!pendingApprovals || pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-900">لا توجد موافقات معلقة</p>
                <p className="text-sm text-slate-600 mt-2">جميع الطلبات تمت معالجتها</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          pendingApprovals.map((workflow) => {
            const currentStep = workflow.steps[workflow.current_step];
            
            return (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">
                          {getEntityTypeLabel(workflow.entity_type)} - {workflow.entity_id.slice(0, 8)}
                        </CardTitle>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <CardDescription>
                        الخطوة الحالية: {currentStep.name} (خطوة {workflow.current_step + 1} من {workflow.steps.length})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Steps */}
                    <div className="flex items-center gap-2">
                      {workflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                              step.status === 'approved' ? 'bg-green-600 text-white' :
                              index === workflow.current_step ? 'bg-blue-600 text-white' :
                              'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {step.status === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                          </div>
                          {index < workflow.steps.length - 1 && (
                            <div className={`w-12 h-1 ${
                              step.status === 'approved' ? 'bg-green-600' : 'bg-slate-200'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={() => openDialog(workflow, 'approve')}
                        className="flex-1"
                        variant="default"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        موافقة
                      </Button>

                      <Button
                        onClick={() => openDialog(workflow, 'reject')}
                        className="flex-1"
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        رفض
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedWorkflow && !!actionType} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من {actionType === 'approve' ? 'الموافقة على' : 'رفض'} هذا الطلب؟
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {actionType === 'approve' ? 'ملاحظات (اختياري)' : 'سبب الرفض *'}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={actionType === 'approve' ? 'أضف ملاحظات...' : 'اشرح سبب الرفض...'}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              إلغاء
            </Button>
            <Button
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending || (actionType === 'reject' && !comments)}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {approveMutation.isPending || rejectMutation.isPending ? 'جاري المعالجة...' : 
               actionType === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

