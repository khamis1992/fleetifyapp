import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, User, Tag, Send, AlertCircle } from 'lucide-react';
import { useSupportTicket, useSupportTickets } from '@/hooks/useSupportTickets';
import { useSupportTicketReplies } from '@/hooks/useSupportTicketReplies';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const SupportTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageAllTickets = user?.roles?.includes('super_admin') || user?.roles?.includes('company_admin');
  
  const { ticket, isLoading: ticketLoading } = useSupportTicket(ticketId!);
  const { updateTicket, isUpdating } = useSupportTickets();
  const { replies, createReply, isCreating: isCreatingReply } = useSupportTicketReplies(ticketId!);
  
  const [newReply, setNewReply] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'waiting_customer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'مفتوحة';
      case 'in_progress': return 'قيد المعالجة';
      case 'waiting_customer': return 'بانتظار العميل';
      case 'resolved': return 'تم الحل';
      case 'closed': return 'مغلقة';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  const handleStatusUpdate = () => {
    if (selectedStatus && ticket) {
      updateTicket({
        id: ticket.id,
        updates: { status: selectedStatus as any }
      });
      setSelectedStatus('');
    }
  };

  const handleReplySubmit = () => {
    if (newReply.trim() && ticketId) {
      createReply({
        ticket_id: ticketId,
        message: newReply.trim()
      });
      setNewReply('');
    }
  };

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">التذكرة غير موجودة</h2>
          <p className="text-muted-foreground">لم يتم العثور على التذكرة المطلوبة</p>
        </div>
        <Button onClick={() => navigate('/support')}>
          العودة لقائمة التذاكر
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/support')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-muted-foreground">#{ticket.ticket_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusText(ticket.status)}
                    </Badge>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {getPriorityText(ticket.priority)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(ticket.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </div>
                    
                    {ticket.category && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {ticket.category.name_ar}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-2">وصف المشكلة</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
            </div>
          </Card>

          {/* Replies */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">الردود والتحديثات</h3>
            
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {reply.user_id === ticket.created_by ? 'العميل' : 'فريق الدعم'}
                      </span>
                      {reply.is_internal && (
                        <Badge variant="secondary" className="text-xs">
                          داخلي
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(reply.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))}
              
              {replies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد ردود بعد
                </div>
              )}
            </div>
          </Card>

          {/* Add Reply */}
          {ticket.status !== 'closed' && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">إضافة رد</h3>
              
              <div className="space-y-4">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  rows={4}
                />
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleReplySubmit}
                    disabled={!newReply.trim() || isCreatingReply}
                    className="gap-2"
                  >
                    {isCreatingReply ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        إرسال الرد
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          {canManageAllTickets && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">إدارة الحالة</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    تغيير الحالة
                  </label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة الجديدة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">مفتوحة</SelectItem>
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                      <SelectItem value="waiting_customer">بانتظار العميل</SelectItem>
                      <SelectItem value="resolved">تم الحل</SelectItem>
                      <SelectItem value="closed">مغلقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || isUpdating}
                  className="w-full"
                >
                  {isUpdating ? <LoadingSpinner size="sm" /> : 'تحديث الحالة'}
                </Button>
              </div>
            </Card>
          )}

          {/* Ticket Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">معلومات التذكرة</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم التذكرة:</span>
                <span className="font-medium">{ticket.ticket_number}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                <span>{format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: ar })}</span>
              </div>
              
              {ticket.first_response_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">أول رد:</span>
                  <span>{format(new Date(ticket.first_response_at), 'dd MMM yyyy', { locale: ar })}</span>
                </div>
              )}
              
              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تم الحل:</span>
                  <span>{format(new Date(ticket.resolved_at), 'dd MMM yyyy', { locale: ar })}</span>
                </div>
              )}
              
              {ticket.category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التصنيف:</span>
                  <span>{ticket.category.name_ar}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetail;