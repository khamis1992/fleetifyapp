/**
 * Invoice Dispute Management Component
 * 
 * Features:
 * - View all disputes with filtering
 * - Create new disputes from invoices
 * - Assign disputes to staff
 * - Add internal/customer notes
 * - Resolve disputes with adjustments/credit notes
 * - Track dispute history
 * - Statistics dashboard
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  TrendingUp,
  User,
  XCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  Eye
} from 'lucide-react';

interface Dispute {
  id: string;
  dispute_number: string;
  invoice_id: string;
  invoice_number: string;
  customer_name_ar: string;
  dispute_reason: string;
  dispute_category: string;
  disputed_amount: number;
  status: string;
  priority: string;
  submission_date: string;
  assigned_to_name: string;
  days_open: number;
  notes_count: number;
}

interface DisputeStats {
  total_disputes: number;
  pending_count: number;
  under_review_count: number;
  investigating_count: number;
  resolved_count: number;
  rejected_count: number;
  urgent_count: number;
  overdue_count: number;
  total_disputed_amount: number;
  avg_resolution_days: number;
}

export const InvoiceDisputeManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispute_dashboard_stats')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as DisputeStats;
    }
  });

  // Fetch pending disputes
  const { data: disputes, isLoading } = useQuery({
    queryKey: ['pending-disputes', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('pending_disputes')
        .select('*');
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Dispute[];
    }
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: string; color: string }> = {
      pending: { label: 'في الانتظار', variant: 'secondary', color: 'bg-slate-500' },
      under_review: { label: 'قيد المراجعة', variant: 'default', color: 'bg-blue-500' },
      investigating: { label: 'قيد التحقيق', variant: 'default', color: 'bg-yellow-500' },
      resolved: { label: 'تم الحل', variant: 'default', color: 'bg-green-500' },
      rejected: { label: 'مرفوض', variant: 'destructive', color: 'bg-red-500' },
      partially_resolved: { label: 'حل جزئي', variant: 'default', color: 'bg-orange-500' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <Badge className={badge.color}>
        {badge.label}
      </Badge>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      urgent: { label: 'عاجل', color: 'bg-red-600' },
      high: { label: 'عالي', color: 'bg-orange-500' },
      medium: { label: 'متوسط', color: 'bg-yellow-500' },
      low: { label: 'منخفض', color: 'bg-green-500' }
    };
    
    const badge = badges[priority] || badges.medium;
    return (
      <Badge className={badge.color}>
        {badge.label}
      </Badge>
    );
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      amount_incorrect: 'المبلغ غير صحيح',
      service_not_received: 'الخدمة لم تُستلم',
      duplicate_invoice: 'فاتورة مكررة',
      quality_issue: 'مشكلة في الجودة',
      contract_violation: 'مخالفة العقد',
      other: 'أخرى'
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النزاعات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_disputes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.urgent_count || 0} عاجل
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">قيد المعالجة</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(stats?.pending_count || 0) + (stats?.under_review_count || 0) + (stats?.investigating_count || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdue_count || 0} متأخر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تم الحل</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.resolved_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.avg_resolution_days?.toFixed(1) || 0} يوم متوسط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المبالغ المتنازع عليها</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(stats?.total_disputed_amount || 0).toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">د.ك</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>إدارة النزاعات</span>
            <Button onClick={() => setShowCreateDialog(true)}>
              <AlertCircle className="h-4 w-4 mr-2" />
              إنشاء نزاع جديد
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="under_review">قيد المراجعة</SelectItem>
                <SelectItem value="investigating">قيد التحقيق</SelectItem>
                <SelectItem value="resolved">تم الحل</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Disputes Table */}
          <div className="space-y-4">
            {isLoading && <p>جاري التحميل...</p>}
            
            {disputes && disputes.length === 0 && (
              <Alert>
                <AlertDescription>
                  لا توجد نزاعات حالياً
                </AlertDescription>
              </Alert>
            )}

            {disputes?.map((dispute) => (
              <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{dispute.dispute_number}</span>
                        {getStatusBadge(dispute.status)}
                        {getPriorityBadge(dispute.priority)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">الفاتورة</p>
                          <p className="font-medium">{dispute.invoice_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">العميل</p>
                          <p className="font-medium">{dispute.customer_name_ar}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">الفئة</p>
                          <p className="font-medium">{getCategoryLabel(dispute.dispute_category)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">المبلغ المتنازع عليه</p>
                          <p className="font-medium text-orange-600">
                            {dispute.disputed_amount?.toFixed(3)} د.ك
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dispute.dispute_reason}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dispute.days_open} يوم مفتوح
                        </span>
                        {dispute.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {dispute.assigned_to_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {dispute.notes_count} ملاحظات
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDispute(dispute)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        عرض
                      </Button>
                      
                      {dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setShowResolveDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          حل
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Dispute Dialog */}
      <DisputeCreateDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Resolve Dispute Dialog */}
      <DisputeResolveDialog
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        dispute={selectedDispute}
      />
    </div>
  );
};

// Placeholder for Create Dispute Dialog
const DisputeCreateDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إنشاء نزاع جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              يتم إنشاء النزاعات من صفحة الفواتير مباشرة باستخدام زر "نزاع"
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Placeholder for Resolve Dispute Dialog
const DisputeResolveDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: Dispute | null;
}> = ({ open, onOpenChange, dispute }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>حل النزاع: {dispute?.dispute_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              سيتم إضافة نموذج الحل الكامل قريباً
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDisputeManagement;
