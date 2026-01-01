/**
 * لوحة نشاط CRM - مخصصة لعرض سجل التفاعلات والمتابعات
 * تركز على عمل CRM الفعلي بدون معلومات غير ضرورية
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  X,
  Phone,
  PhoneOff,
  PhoneIncoming,
  MessageCircle,
  Mail,
  Calendar,
  Clock,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle,
  User,
  FileText,
  Bell,
  ChevronDown,
  ChevronUp,
  Loader2,
  Hash,
  CreditCard,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCustomerCRMActivity, CustomerActivity, AddActivityInput } from '@/hooks/useCustomerCRMActivity';
import { useToast } from '@/components/ui/use-toast';

// Brand colors
const BRAND_COLOR = '#F15555';
const BRAND_BG = 'bg-[#F15555]';

interface CRMActivityPanelProps {
  customerId: string | null;
  customerName?: string;
  customerPhone?: string;
  customerCode?: string;
  contractNumber?: string;
  paymentStatus?: 'paid' | 'due' | 'late' | 'none';
  lastContact?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCall?: (phone: string) => void;
  onWhatsApp?: (phone: string) => void;
}

// أيقونة نوع التفاعل
function ActivityIcon({ type, status }: { type: string; status?: string }) {
  const iconClass = "w-4 h-4";
  
  switch (type) {
    case 'phone':
    case 'call':
      if (status === 'no_answer') return <PhoneOff className={cn(iconClass, "text-red-500")} />;
      if (status === 'busy') return <PhoneIncoming className={cn(iconClass, "text-amber-500")} />;
      return <Phone className={cn(iconClass, "text-green-500")} />;
    case 'whatsapp':
    case 'message':
      return <MessageCircle className={cn(iconClass, "text-emerald-500")} />;
    case 'email':
      return <Mail className={cn(iconClass, "text-blue-500")} />;
    case 'note':
      return <FileText className={cn(iconClass, "text-gray-500")} />;
    case 'followup':
      return <Bell className={cn(iconClass, "text-amber-500")} />;
    default:
      return <FileText className={cn(iconClass, "text-gray-400")} />;
  }
}

// مكون عرض تفاعل واحد
function ActivityItem({ activity }: { activity: CustomerActivity }) {
  const [expanded, setExpanded] = useState(false);
  
  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'phone':
      case 'call': return 'مكالمة هاتفية';
      case 'whatsapp': return 'رسالة واتساب';
      case 'message': return 'رسالة';
      case 'email': return 'بريد إلكتروني';
      case 'note': return 'ملاحظة';
      case 'followup': return 'متابعة';
      default: return 'تفاعل';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'answered':
        return <Badge className="bg-green-50 text-green-700 text-[10px]">تم الرد</Badge>;
      case 'no_answer':
        return <Badge className="bg-red-50 text-red-700 text-[10px]">لم يرد</Badge>;
      case 'busy':
        return <Badge className="bg-amber-50 text-amber-700 text-[10px]">مشغول</Badge>;
      case 'completed':
        return <Badge className="bg-green-50 text-green-700 text-[10px]">مكتملة</Badge>;
      case 'pending':
        return <Badge className="bg-blue-50 text-blue-700 text-[10px]">قيد الانتظار</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative pr-8 pb-4 last:pb-0",
        "before:absolute before:right-[11px] before:top-6 before:bottom-0 before:w-0.5 before:bg-gray-200 last:before:hidden"
      )}
    >
      {/* Timeline dot */}
      <div className={cn(
        "absolute right-0 top-1 w-6 h-6 rounded-full flex items-center justify-center",
        activity.is_important ? "bg-amber-100" : "bg-gray-100"
      )}>
        <ActivityIcon type={activity.note_type || 'note'} status={activity.call_status} />
      </div>

      {/* Content */}
      <div
        className={cn(
          "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm",
          activity.is_important ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">
                {activity.title || getActivityLabel(activity.note_type || '')}
              </span>
              {getStatusBadge(activity.call_status)}
              {activity.is_important && (
                <Badge className="bg-amber-100 text-amber-700 text-[10px]">مهم</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ar })}
              {' • '}
              {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && activity.content && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 whitespace-pre-wrap">
                {activity.content}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// مكون إضافة تفاعل جديد
function AddActivityForm({
  customerId,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'note' | 'phone' | 'whatsapp' | 'email'>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [callStatus, setCallStatus] = useState<'answered' | 'no_answer' | 'busy'>('answered');
  const [isImportant, setIsImportant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addActivity } = useCustomerCRMActivity(customerId);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال محتوى التفاعل', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const input: AddActivityInput = {
        note_type: type,
        title: title || undefined,
        content: content.trim(),
        is_important: isImportant,
        call_status: type === 'phone' ? callStatus : undefined,
      };
      
      await addActivity(input);
      toast({ title: 'تم الحفظ', description: 'تم تسجيل التفاعل بنجاح' });
      onSuccess();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ التفاعل', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeButtons = [
    { value: 'note', label: 'ملاحظة', icon: FileText },
    { value: 'phone', label: 'مكالمة', icon: Phone },
    { value: 'whatsapp', label: 'واتساب', icon: MessageCircle },
    { value: 'email', label: 'بريد', icon: Mail },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
    >
      <h3 className="text-sm font-bold text-gray-800 mb-3">إضافة تفاعل جديد</h3>

      {/* نوع التفاعل */}
      <div className="flex gap-2 mb-3">
        {typeButtons.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setType(value as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition",
              type === value
                ? `${BRAND_BG} text-white`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* حالة المكالمة */}
      {type === 'phone' && (
        <div className="flex gap-2 mb-3">
          {[
            { value: 'answered', label: 'تم الرد', color: 'bg-green-100 text-green-700' },
            { value: 'no_answer', label: 'لم يرد', color: 'bg-red-100 text-red-700' },
            { value: 'busy', label: 'مشغول', color: 'bg-amber-100 text-amber-700' },
          ].map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setCallStatus(value as any)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition border",
                callStatus === value ? color : "bg-white text-gray-600 border-gray-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* العنوان */}
      <Input
        placeholder="عنوان (اختياري)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 text-sm"
      />

      {/* المحتوى */}
      <Textarea
        placeholder="اكتب تفاصيل التفاعل..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="mb-3 text-sm resize-none"
      />

      {/* خيارات */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
            className="rounded border-gray-300"
          />
          تفاعل مهم
        </label>
      </div>

      {/* الأزرار */}
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className={`flex-1 ${BRAND_BG} hover:bg-opacity-90`}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send size={16} className="ml-1" />
              حفظ التفاعل
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </motion.div>
  );
}

// المكون الرئيسي
export function CRMActivityPanel({
  customerId,
  customerName,
  customerPhone,
  customerCode,
  contractNumber,
  paymentStatus,
  lastContact,
  isOpen,
  onClose,
  onCall,
  onWhatsApp,
}: CRMActivityPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'phone' | 'whatsapp' | 'note'>('all');
  const { activities, isLoading, refetch } = useCustomerCRMActivity(customerId);

  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    return a.note_type === filter;
  });

  const getPaymentStatusBadge = () => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-50 text-green-700 border-green-200">✓ مسدد</Badge>;
      case 'late':
        return <Badge className="bg-red-50 text-red-700 border-red-200">⚠ متأخر</Badge>;
      case 'due':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">◐ مستحق</Badge>;
      default:
        return null;
    }
  };

  const getLastContactLabel = () => {
    if (lastContact === null || lastContact === undefined) {
      return <span className="text-red-600">لم يتم التواصل</span>;
    }
    if (lastContact === 0) return <span className="text-green-600">اليوم</span>;
    if (lastContact <= 3) return <span className="text-green-600">منذ {lastContact} أيام</span>;
    if (lastContact <= 7) return <span className="text-amber-600">منذ {lastContact} أيام</span>;
    return <span className="text-red-600">منذ {lastContact} يوم</span>;
  };

  const handleActivityAdded = () => {
    setShowAddForm(false);
    refetch();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full max-w-lg bg-gray-50 shadow-2xl z-50 flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-900">سجل التفاعلات</h2>
              </div>

              {/* Customer Quick Info */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                    BRAND_BG, "text-white"
                  )}>
                    {customerName?.substring(0, 2) || <User size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">
                      {customerName || 'عميل'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {customerCode && (
                        <span className="flex items-center gap-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          <Hash size={10} />
                          {customerCode}
                        </span>
                      )}
                      {contractNumber && (
                        <span className="flex items-center gap-1">
                          <Car size={10} />
                          {contractNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Row */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-gray-500">آخر تواصل:</span>
                    {getLastContactLabel()}
                  </div>
                  {getPaymentStatusBadge()}
                </div>

                {/* Quick Actions */}
                {customerPhone && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => onCall?.(customerPhone)}
                      className={`flex-1 ${BRAND_BG} hover:bg-opacity-90`}
                    >
                      <Phone size={14} className="ml-1" />
                      اتصال
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onWhatsApp?.(customerPhone)}
                      className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <MessageCircle size={14} className="ml-1" />
                      واتساب
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddForm(true)}
                      className="gap-1"
                    >
                      <Plus size={14} />
                      تفاعل
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex-shrink-0 bg-white border-b px-4 py-2">
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'الكل' },
                  { value: 'phone', label: 'مكالمات' },
                  { value: 'whatsapp', label: 'واتساب' },
                  { value: 'note', label: 'ملاحظات' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition",
                      filter === value
                        ? `${BRAND_BG} text-white`
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Add Form */}
              {showAddForm && customerId && (
                <div className="mb-4">
                  <AddActivityForm
                    customerId={customerId}
                    onSuccess={handleActivityAdded}
                    onCancel={() => setShowAddForm(false)}
                  />
                </div>
              )}

              {/* Activities List */}
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 mb-3">لا توجد تفاعلات مسجلة</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(true)}
                    className="gap-1"
                  >
                    <Plus size={14} />
                    إضافة أول تفاعل
                  </Button>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="flex-shrink-0 bg-white border-t p-3">
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-lg font-bold text-gray-800">{activities.length}</p>
                  <p className="text-[10px] text-gray-500">إجمالي التفاعلات</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {activities.filter(a => a.note_type === 'phone' && a.call_status === 'answered').length}
                  </p>
                  <p className="text-[10px] text-gray-500">مكالمات ناجحة</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {activities.filter(a => a.note_type === 'phone' && a.call_status === 'no_answer').length}
                  </p>
                  <p className="text-[10px] text-gray-500">لم يرد</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

