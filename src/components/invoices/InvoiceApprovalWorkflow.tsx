/**
 * Invoice Approval Workflow Component
 * 
 * Features:
 * - Preview PDF before sending
 * - Send for approval workflow
 * - Manager approval for high-value invoices
 * - Approval history and audit trail
 * - Prevents costly errors
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  DollarSign,
  Clock,
  User
} from 'lucide-react';

interface InvoiceApprovalWorkflowProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: (invoiceId: string) => void;
  onRejected?: (invoiceId: string) => void;
}

interface ApprovalHistoryItem {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'sent';
  user_name: string;
  notes?: string;
  created_at: string;
}

export const InvoiceApprovalWorkflow: React.FC<InvoiceApprovalWorkflowProps> = ({
  invoice,
  open,
  onOpenChange,
  onApproved,
  onRejected
}) => {
  const { toast } = useToast();
  const [view, setView] = useState<'preview' | 'approval'>('preview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);

  // Check if invoice needs approval (high value threshold)
  const HIGH_VALUE_THRESHOLD = 1000; // KWD
  const needsApproval = invoice?.total_amount > HIGH_VALUE_THRESHOLD;

  // Load approval history
  React.useEffect(() => {
    if (open && invoice?.id) {
      loadApprovalHistory();
    }
  }, [open, invoice?.id]);

  const loadApprovalHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_approval_history')
        .select(`
          id,
          action,
          notes,
          created_at,
          user:profiles(first_name_ar, last_name_ar)
        `)
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApprovalHistory(data?.map(item => ({
        id: item.id,
        action: item.action,
        user_name: `${item.user?.first_name_ar || ''} ${item.user?.last_name_ar || ''}`.trim() || 'مستخدم',
        notes: item.notes,
        created_at: item.created_at
      })) || []);
    } catch (error) {
      console.error('Error loading approval history:', error);
    }
  };

  // Submit for approval
  const handleSubmitForApproval = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'pending_approval',
          submitted_for_approval_at: new Date().toISOString(),
          submitted_by: user.id
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Add to approval history
      const { error: historyError } = await supabase
        .from('invoice_approval_history')
        .insert({
          invoice_id: invoice.id,
          action: 'submitted',
          user_id: user.id,
          notes: 'تم إرسال الفاتورة للاعتماد'
        });

      if (historyError) throw historyError;

      toast({
        title: '✅ تم إرسال الفاتورة للاعتماد',
        description: 'سيتم مراجعتها من قبل المدير',
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: '❌ فشل إرسال الفاتورة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve invoice
  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          approval_notes: approvalNotes || null
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Add to approval history
      const { error: historyError } = await supabase
        .from('invoice_approval_history')
        .insert({
          invoice_id: invoice.id,
          action: 'approved',
          user_id: user.id,
          notes: approvalNotes || 'تم اعتماد الفاتورة'
        });

      if (historyError) throw historyError;

      toast({
        title: '✅ تم اعتماد الفاتورة',
        description: 'يمكن الآن إرسالها للعميل',
      });

      onApproved?.(invoice.id);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: '❌ فشل اعتماد الفاتورة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject invoice
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: '⚠️ سبب الرفض مطلوب',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Add to approval history
      const { error: historyError } = await supabase
        .from('invoice_approval_history')
        .insert({
          invoice_id: invoice.id,
          action: 'rejected',
          user_id: user.id,
          notes: rejectionReason
        });

      if (historyError) throw historyError;

      // Log audit trail
      await logAudit({
        action: 'REJECT',
        resource_type: 'invoice',
        resource_id: invoice.id,
        entity_name: invoice.invoice_number,
        changes_summary: `Rejected invoice ${invoice.invoice_number}`,
        old_values: { status: invoice.status },
        new_values: { status: 'rejected', rejected_at: new Date().toISOString() },
        metadata: {
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          rejection_reason: rejectionReason,
        },
        severity: 'high',
      });

      toast({
        title: '❌ تم رفض الفاتورة',
        description: 'يجب تعديلها قبل الإرسال',
        variant: 'destructive',
      });

      onRejected?.(invoice.id);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: '❌ فشل رفض الفاتورة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Send invoice (after approval)
  const handleSendInvoice = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Add to approval history
      const { error: historyError } = await supabase
        .from('invoice_approval_history')
        .insert({
          invoice_id: invoice.id,
          action: 'sent',
          user_id: user.id,
          notes: 'تم إرسال الفاتورة للعميل'
        });

      if (historyError) throw historyError;

      toast({
        title: '✅ تم إرسال الفاتورة',
        description: 'تم إرسال الفاتورة للعميل بنجاح',
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: '❌ فشل إرسال الفاتورة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { label: 'مسودة', variant: 'secondary' as const, icon: FileText },
      pending_approval: { label: 'قيد الاعتماد', variant: 'default' as const, icon: Clock },
      approved: { label: 'معتمد', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'مرفوض', variant: 'destructive' as const, icon: XCircle },
      sent: { label: 'تم الإرسال', variant: 'default' as const, icon: Send },
    };

    const config = variants[status as keyof typeof variants] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            معاينة واعتماد الفاتورة
            {getStatusBadge(invoice?.status || 'draft')}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={view === 'preview' ? 'default' : 'ghost'}
            onClick={() => setView('preview')}
            className="rounded-b-none"
          >
            <Eye className="h-4 w-4 mr-2" />
            معاينة الفاتورة
          </Button>
          <Button
            variant={view === 'approval' ? 'default' : 'ghost'}
            onClick={() => setView('approval')}
            className="rounded-b-none"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            الاعتماد
          </Button>
        </div>

        {/* Preview Tab */}
        {view === 'preview' && (
          <div className="space-y-4">
            {/* Invoice Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">رقم الفاتورة</p>
                <p className="font-medium">{invoice?.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">{new Date(invoice?.invoice_date).toLocaleDateString('ar-KW')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">العميل</p>
                <p className="font-medium">{invoice?.customer?.first_name_ar}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
                <p className="font-bold text-lg">{invoice?.total_amount?.toFixed(3)} د.ك</p>
              </div>
            </div>

            {/* High Value Warning */}
            {needsApproval && invoice?.status === 'draft' && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <p className="font-medium text-yellow-900">فاتورة عالية القيمة - تتطلب اعتماد</p>
                  <p className="text-sm text-yellow-700">
                    الفواتير التي تزيد عن {HIGH_VALUE_THRESHOLD.toFixed(3)} د.ك تحتاج موافقة المدير
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Invoice Preview (Placeholder - integrate with ProfessionalInvoiceTemplate) */}
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p>معاينة الفاتورة</p>
                <p className="text-sm">هنا ستظهر معاينة PDF للفاتورة</p>
                <Button variant="outline" className="mt-4">
                  <Eye className="h-4 w-4 mr-2" />
                  عرض PDF
                </Button>
              </div>
            </div>

            {/* Approval History */}
            {approvalHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">سجل الاعتماد</h4>
                <div className="space-y-2">
                  {approvalHistory.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{item.user_name}</p>
                        <p className="text-muted-foreground">{item.notes}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString('ar-KW')}
                        </p>
                      </div>
                      {getStatusBadge(item.action)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approval Tab */}
        {view === 'approval' && (
          <div className="space-y-4">
            {invoice?.status === 'draft' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  راجع الفاتورة بعناية قبل إرسالها للاعتماد أو للعميل
                </AlertDescription>
              </Alert>
            )}

            {invoice?.status === 'pending_approval' && (
              <div className="space-y-4">
                <Alert className="border-blue-500 bg-blue-50">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <p className="font-medium text-blue-900">في انتظار الاعتماد</p>
                    <p className="text-sm text-blue-700">قم بمراجعة الفاتورة واعتمادها أو رفضها</p>
                  </AlertDescription>
                </Alert>

                {/* Approval Notes */}
                <div className="space-y-2">
                  <Label>ملاحظات الاعتماد (اختياري)</Label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="أضف أي ملاحظات على الفاتورة..."
                    rows={3}
                  />
                </div>

                {/* Rejection Reason */}
                <div className="space-y-2">
                  <Label>سبب الرفض (مطلوب عند الرفض)</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اذكر سبب رفض الفاتورة..."
                    rows={3}
                    className="border-red-200"
                  />
                </div>
              </div>
            )}

            {invoice?.status === 'approved' && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <p className="font-medium text-green-900">تم اعتماد الفاتورة</p>
                  <p className="text-sm text-green-700">يمكنك الآن إرسالها للعميل</p>
                </AlertDescription>
              </Alert>
            )}

            {invoice?.status === 'rejected' && (
              <Alert className="border-red-500 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <p className="font-medium text-red-900">تم رفض الفاتورة</p>
                  <p className="text-sm text-red-700">السبب: {invoice?.rejection_reason}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>

          {/* Draft Status Actions */}
          {invoice?.status === 'draft' && (
            <>
              {needsApproval ? (
                <Button 
                  onClick={handleSubmitForApproval}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isProcessing ? 'جاري الإرسال...' : 'إرسال للاعتماد'}
                </Button>
              ) : (
                <Button 
                  onClick={handleSendInvoice}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isProcessing ? 'جاري الإرسال...' : 'إرسال للعميل'}
                </Button>
              )}
            </>
          )}

          {/* Pending Approval Actions */}
          {invoice?.status === 'pending_approval' && (
            <>
              <Button 
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isProcessing ? 'جاري الرفض...' : 'رفض'}
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isProcessing ? 'جاري الاعتماد...' : 'اعتماد'}
              </Button>
            </>
          )}

          {/* Approved Status Actions */}
          {invoice?.status === 'approved' && (
            <Button 
              onClick={handleSendInvoice}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {isProcessing ? 'جاري الإرسال...' : 'إرسال للعميل'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
