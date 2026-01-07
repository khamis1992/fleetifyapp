import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Eye, Clock, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useApprovalRequests, ApprovalStatus, RequestSource } from '@/hooks/useApprovalWorkflows';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

const STATUS_LABELS: Record<ApprovalStatus, { ar: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    ar: 'قيد الانتظار', 
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    icon: <Clock className="h-3 w-3" />
  },
  approved: { 
    ar: 'معتمد', 
    color: 'bg-green-500/10 text-green-700 border-green-500/20',
    icon: <CheckCircle className="h-3 w-3" />
  },
  rejected: { 
    ar: 'مرفوض', 
    color: 'bg-red-500/10 text-red-700 border-red-500/20',
    icon: <XCircle className="h-3 w-3" />
  },
  cancelled: { 
    ar: 'ملغي', 
    color: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
    icon: <AlertCircle className="h-3 w-3" />
  },
};

const REQUEST_SOURCE_LABELS: Record<RequestSource, string> = {
  payroll: 'الرواتب',
  contract: 'العقود',
  payment: 'المدفوعات',
  expense: 'المصروفات',
  purchase: 'المشتريات',
  leave_request: 'طلبات الإجازة',
  vehicle_maintenance: 'صيانة المركبات',
  budget: 'الميزانية',
  other: 'أخرى',
};

interface ApprovalRequestsListProps {
  onViewRequest?: (requestId: string) => void;
}

export const ApprovalRequestsList: React.FC<ApprovalRequestsListProps> = ({
  onViewRequest,
}) => {
  const [filters, setFilters] = useState({
    status: '' as ApprovalStatus | '',
    source_type: '' as RequestSource | '',
    search: '',
  });

  const { data: requests, isLoading } = useApprovalRequests({
    status: filters.status || undefined,
    source_type: filters.source_type || undefined,
  });

  // تصفية البحث محلياً
  const filteredRequests = requests?.filter(request => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      request.title.toLowerCase().includes(searchLower) ||
      request.request_number.toLowerCase().includes(searchLower) ||
      request.description?.toLowerCase().includes(searchLower)
    );
  });

  const { formatCurrency } = useCurrencyFormatter();
  const formatAmount = (amount: number) => formatCurrency(amount);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">طلبات الموافقة</h2>
            <p className="text-muted-foreground">
              عرض وإدارة جميع طلبات الموافقة
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Filter className="h-3 w-3" />
            {filteredRequests?.length || 0} طلب
          </Badge>
        </div>

        {/* Filters Row */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="البحث في الطلبات..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value as ApprovalStatus }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <SelectItem key={status} value={status}>
                  {label.ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.source_type || 'all'} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, source_type: value === 'all' ? '' : value as RequestSource }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="نوع العملية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {Object.entries(REQUEST_SOURCE_LABELS).map(([source, label]) => (
                <SelectItem key={source} value={source}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests?.map((request) => {
          const statusInfo = STATUS_LABELS[request.status];
          
          return (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>#{request.request_number}</span>
                      <span>•</span>
                      <span>{REQUEST_SOURCE_LABELS[request.source_type]}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(request.created_at), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={statusInfo.color}>
                      {statusInfo.icon}
                      {statusInfo.ar}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">طالب الموافقة:</span>
                    <p className="font-medium">
                      {request.requester?.full_name || 'غير محدد'}
                    </p>
                  </div>
                  
                  {request.total_amount > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">المبلغ:</span>
                      <p className="font-medium">{formatAmount(request.total_amount)}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm text-muted-foreground">سير العمل:</span>
                    <p className="font-medium">
                      {request.workflow?.workflow_name || 'غير محدد'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {request.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">الوصف:</span>
                    <p className="text-sm mt-1 line-clamp-2">{request.description}</p>
                  </div>
                )}

                {/* Progress Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      المرحلة الحالية: {request.current_step_order}
                    </span>
                    {request.status === 'pending' && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 ml-1" />
                        في انتظار الموافقة
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewRequest?.(request.id)}
                  >
                    <Eye className="h-3 w-3 ml-1" />
                    عرض التفاصيل
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRequests?.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">لا توجد طلبات موافقة</h3>
              <p className="text-muted-foreground">
                {filters.status || filters.source_type || filters.search
                  ? 'لا توجد طلبات تطابق المرشحات المحددة'
                  : 'لم يتم إنشاء أي طلبات موافقة بعد'
                }
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};