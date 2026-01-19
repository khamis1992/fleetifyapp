import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Send,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Eye,
  FileText,
  Plus
} from 'lucide-react';
import { UserRole } from '@/types/permissions';

interface PermissionRequest {
  id: string;
  company_id: string;
  employee_id: string;
  requested_by: string;
  request_type: string; // Database returns string, we'll handle the typing
  current_roles: string[] | null;
  requested_roles: string[] | null;
  current_permissions: string[] | null;
  requested_permissions: string[] | null;
  reason: string;
  rejection_reason?: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  // Extended fields we add in the component
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
  };
  requester?: {
    first_name: string;
    last_name: string;
  };
}

export default function ApprovalWorkflow() {
  const [selectedRequest, setSelectedRequest] = useState<PermissionRequest | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [approvalNotes, setApprovalNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch permission requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['permission-requests', statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from('permission_change_requests')
        .select(`
          *,
          employees:employee_id (
            id,
            first_name,
            last_name,
            position
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch requester data separately
      const requesterIds = data?.map(req => req.requested_by).filter(Boolean) || [];
      let requestersData: any[] = [];
      
      if (requesterIds.length > 0) {
        const { data: requesters } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', requesterIds);
        requestersData = requesters || [];
      }

      return data?.map(req => ({
        ...req,
        priority: 'medium' as const, // Default priority since it's not in the database
        employee: req.employees,
        requester: requestersData.find(r => r.user_id === req.requested_by)
      })) || [];
    }
  });

  // Approve request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      const { error } = await supabase
        .from('permission_change_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: notes
        })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      toast({
        title: "تم الموافقة",
        description: "تم الموافقة على الطلب بنجاح",
      });
      setSelectedRequest(null);
      setApprovalNotes('');
    }
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      const { error } = await supabase
        .from('permission_change_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: notes
        })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      toast({
        title: "تم الرفض",
        description: "تم رفض الطلب",
        variant: "destructive"
      });
      setSelectedRequest(null);
      setApprovalNotes('');
    }
  });

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveRequestMutation.mutate({
      requestId: selectedRequest.id,
      notes: approvalNotes
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    if (!approvalNotes.trim()) {
      toast({
        title: "مطلوب",
        description: "يرجى إدخال سبب الرفض",
        variant: "destructive"
      });
      return;
    }
    rejectRequestMutation.mutate({
      requestId: selectedRequest.id,
      notes: approvalNotes
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'معلق', variant: 'secondary' as const },
      approved: { label: 'موافق عليه', variant: 'default' as const },
      rejected: { label: 'مرفوض', variant: 'destructive' as const },
      expired: { label: 'منتهي الصلاحية', variant: 'outline' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'منخفضة', variant: 'outline' as const },
      medium: { label: 'متوسطة', variant: 'secondary' as const },
      high: { label: 'عالية', variant: 'default' as const },
      urgent: { label: 'عاجل', variant: 'destructive' as const }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRequestTypeLabel = (type: string) => {
    const typeLabels = {
      role_change: 'تغيير دور',
      permission_add: 'إضافة صلاحية',
      permission_remove: 'إزالة صلاحية',
      access_level_change: 'تغيير مستوى الوصول'
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">سير عمل الموافقات</h2>
          <p className="text-muted-foreground">
            إدارة طلبات تغيير الصلاحيات والأدوار
          </p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          طلب جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="status-filter">حالة الطلب</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="approved">موافق عليه</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="priority-filter">الأولوية</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="mr-4">جاري التحميل...</span>
            </CardContent>
          </Card>
        ) : requests && requests.length > 0 ? (
          requests.map(request => (
            <Card key={request.id} className={`cursor-pointer transition-all hover:shadow-md ${
              isExpired(request.expires_at) ? 'border-red-200 bg-red-50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {request.employee?.first_name} {request.employee?.last_name}
                      </h3>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                      {isExpired(request.expires_at) && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          منتهي الصلاحية
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{request.employee?.position}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{getRequestTypeLabel(request.request_type)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(request.created_at).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      <strong>السبب:</strong> {request.reason}
                    </p>

                    {request.rejection_reason && (
                      <p className="text-sm text-muted-foreground">
                        <strong>سبب الرفض:</strong> {request.rejection_reason}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>بواسطة: {request.requester?.first_name} {request.requester?.last_name}</span>
                      <span>•</span>
                      <span>ينتهي في: {new Date(request.expires_at).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      عرض
                    </Button>
                    {request.status === 'pending' && !isExpired(request.expires_at) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setTimeout(() => handleApprove(), 100);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          موافقة
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          رفض
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground text-center">
                لا توجد طلبات موافقة في الوقت الحالي
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب الموافقة</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label>الموظف</Label>
                    <p className="font-medium">
                      {selectedRequest.employee?.first_name} {selectedRequest.employee?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.employee?.position}</p>
                  </div>
                  <div>
                    <Label>نوع الطلب</Label>
                    <p className="font-medium">{getRequestTypeLabel(selectedRequest.request_type)}</p>
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div>
                    <Label>الأولوية</Label>
                    {getPriorityBadge(selectedRequest.priority)}
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-3">
                  <div>
                    <Label>السبب</Label>
                    <p className="p-3 bg-muted rounded text-sm">{selectedRequest.reason}</p>
                  </div>
                  
                  {selectedRequest.rejection_reason && (
                    <div>
                      <Label>سبب الرفض</Label>
                      <p className="p-3 bg-muted rounded text-sm">{selectedRequest.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Action Section for Pending Requests */}
                {selectedRequest.status === 'pending' && !isExpired(selectedRequest.expires_at) && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="approval-notes">ملاحظات الموافقة/الرفض</Label>
                      <Textarea
                        id="approval-notes"
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="أدخل ملاحظاتك هنا..."
                        className="mt-1"
                        dir="rtl"
                      />
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                        إغلاق
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={rejectRequestMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        رفض
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={approveRequestMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        موافقة
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}