/**
 * Contract Amendments List Component
 * 
 * Displays all amendments for a contract with:
 * - Status badges
 * - Approval/Rejection actions
 * - Apply amendment functionality
 * - Detailed change view
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useContractAmendments } from '@/hooks/useContractAmendments';
import { 
  FileEdit, 
  Check, 
  Clock, 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  XCircle,
  Play,
  Ban,
  Calendar,
  DollarSign,
  FileText,
  Truck
} from 'lucide-react';
import type { ContractAmendment, AmendmentType } from '@/types/amendment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ContractAmendmentsListProps {
  contractId: string;
}

export const ContractAmendmentsList: React.FC<ContractAmendmentsListProps> = ({
  contractId
}) => {
  const { 
    amendments, 
    isLoading, 
    approveReject,
    isApprovingRejecting,
    applyAmendment,
    isApplying: _isApplying,
    cancelAmendment,
    isCancelling: _isCancelling,
    fetchAmendmentWithChanges
  } = useContractAmendments(contractId);

  const [selectedAmendment, setSelectedAmendment] = useState<ContractAmendment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any; icon: any }> = {
      pending: { label: 'قيد الانتظار', variant: 'secondary', icon: Clock },
      approved: { label: 'معتمد', variant: 'default', icon: CheckCircle },
      rejected: { label: 'مرفوض', variant: 'destructive', icon: XCircle },
      cancelled: { label: 'ملغي', variant: 'outline', icon: Ban }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getAmendmentTypeIcon = (type: AmendmentType) => {
    const icons: Record<AmendmentType, any> = {
      extend_duration: Calendar,
      change_amount: DollarSign,
      change_terms: FileText,
      change_vehicle: Truck,
      change_dates: Calendar,
      change_payment: DollarSign,
      other: FileEdit
    };
    return icons[type] || FileEdit;
  };

  const getAmendmentTypeLabel = (type: AmendmentType): string => {
    const labels: Record<AmendmentType, string> = {
      extend_duration: 'تمديد المدة',
      change_amount: 'تعديل المبلغ',
      change_terms: 'تعديل الشروط',
      change_vehicle: 'تغيير المركبة',
      change_dates: 'تعديل التواريخ',
      change_payment: 'تعديل الدفعات',
      other: 'أخرى'
    };
    return labels[type];
  };

  const handleApproveReject = () => {
    if (!selectedAmendment) return;

    approveReject({
      amendment_id: selectedAmendment.id,
      action: approvalAction,
      notes: approvalAction === 'approve' ? approvalNotes : undefined,
      rejection_reason: approvalAction === 'reject' ? rejectionReason : undefined
    });

    setShowApprovalDialog(false);
    setApprovalNotes('');
    setRejectionReason('');
  };

  const handleApply = (amendment: ContractAmendment) => {
    if (confirm('هل أنت متأكد من تطبيق هذا التعديل على العقد؟ لا يمكن التراجع عن هذه العملية.')) {
      applyAmendment(amendment.id);
    }
  };

  const handleViewDetails = async (amendment: ContractAmendment) => {
    const details = await fetchAmendmentWithChanges(amendment.id);
    setSelectedAmendment(details);
    setShowDetails(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">جاري التحميل...</p>
        </CardContent>
      </Card>
    );
  }

  if (amendments.length === 0) {
    return (
      <Alert>
        <FileEdit className="h-4 w-4" />
        <AlertDescription>
          لا توجد تعديلات لهذا العقد
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {amendments.map((amendment) => {
          const Icon = getAmendmentTypeIcon(amendment.amendment_type);
          const canApprove = amendment.status === 'pending';
          const canApply = amendment.status === 'approved' && !amendment.applied_at;
          const canCancel = amendment.status === 'pending';

          return (
            <Card key={amendment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {amendment.amendment_number}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{getAmendmentTypeLabel(amendment.amendment_type)}</span>
                      <span>•</span>
                      <span>{new Date(amendment.created_at).toLocaleDateString('en-US')}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(amendment.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(amendment)}>
                          <Eye className="h-4 w-4 mr-2" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        
                        {canApprove && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedAmendment(amendment);
                                setApprovalAction('approve');
                                setShowApprovalDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              اعتماد
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedAmendment(amendment);
                                setApprovalAction('reject');
                                setShowApprovalDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              رفض
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {canApply && (
                          <DropdownMenuItem onClick={() => handleApply(amendment)}>
                            <Play className="h-4 w-4 mr-2" />
                            تطبيق التعديل
                          </DropdownMenuItem>
                        )}
                        
                        {canCancel && (
                          <DropdownMenuItem 
                            onClick={() => cancelAmendment(amendment.id)}
                            className="text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            إلغاء التعديل
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">سبب التعديل:</p>
                    <p className="text-sm text-muted-foreground">{amendment.amendment_reason}</p>
                  </div>

                  {amendment.amount_difference !== 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant={amendment.amount_difference > 0 ? 'default' : 'destructive'}>
                        {amendment.amount_difference > 0 ? '+' : ''}
                        {amendment.amount_difference.toFixed(3)} د.ك
                      </Badge>
                      <span className="text-xs text-muted-foreground">فرق المبلغ</span>
                    </div>
                  )}

                  {amendment.requires_customer_signature && (
                    <div className="flex items-center gap-2">
                      <Badge variant={amendment.customer_signed ? 'default' : 'secondary'}>
                        {amendment.customer_signed ? (
                          <><Check className="h-3 w-3 mr-1" /> تم توقيع العميل</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> في انتظار توقيع العميل</>
                        )}
                      </Badge>
                    </div>
                  )}

                  {amendment.applied_at && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        تم تطبيق التعديل في {new Date(amendment.applied_at).toLocaleDateString('en-US')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'اعتماد التعديل' : 'رفض التعديل'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {approvalAction === 'approve' ? 'ملاحظات (اختياري)' : 'سبب الرفض *'}
              </Label>
              <Textarea
                value={approvalAction === 'approve' ? approvalNotes : rejectionReason}
                onChange={(e) => {
                  if (approvalAction === 'approve') {
                    setApprovalNotes(e.target.value);
                  } else {
                    setRejectionReason(e.target.value);
                  }
                }}
                rows={4}
                placeholder={approvalAction === 'approve' ? 'أضف ملاحظات...' : 'اذكر سبب الرفض...'}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant={approvalAction === 'approve' ? 'default' : 'destructive'}
                onClick={handleApproveReject}
                disabled={
                  isApprovingRejecting || 
                  (approvalAction === 'reject' && !rejectionReason.trim())
                }
              >
                {isApprovingRejecting ? 'جاري التنفيذ...' : (approvalAction === 'approve' ? 'اعتماد' : 'رفض')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل التعديل</DialogTitle>
          </DialogHeader>
          {selectedAmendment && 'change_logs' in selectedAmendment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">رقم التعديل</p>
                  <p className="text-sm text-muted-foreground">{selectedAmendment.amendment_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">النوع</p>
                  <p className="text-sm text-muted-foreground">
                    {getAmendmentTypeLabel(selectedAmendment.amendment_type)}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">التغييرات المطبقة:</h4>
                <div className="space-y-2">
                  {(Array.isArray(selectedAmendment.change_logs) ? selectedAmendment.change_logs : []).map((log: any) => (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">الحقل</p>
                            <p className="text-sm">{log.field_label_ar || log.field_name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">القيمة السابقة</p>
                            <p className="text-sm">{log.old_value || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">القيمة الجديدة</p>
                            <p className="text-sm font-medium">{log.new_value || '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
