/**
 * لوحة المتابعات المجدولة
 * Scheduled Follow-ups Panel Component
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  Gavel,
  RefreshCw,
  PhoneOff,
  PhoneForwarded,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  useUpcomingFollowups,
  useFollowupStats,
  useCompleteFollowup,
  useRescheduleFollowup,
  type ScheduledFollowup,
} from '@/hooks/useScheduledFollowups';

// أيقونات أنواع المتابعة
const FollowupTypeIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    call: <Phone size={14} />,
    whatsapp: <MessageCircle size={14} />,
    visit: <Users size={14} />,
    meeting: <Calendar size={14} />,
    email: <MessageCircle size={14} />,
  };
  return icons[type] || <Phone size={14} />;
};

// ألوان الأولوية
const priorityStyles: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const priorityLabels: Record<string, string> = {
  urgent: 'عاجل 🔥',
  high: 'مهم',
  normal: 'عادي',
  low: 'منخفض',
};

// بطاقة إحصائية صغيرة
function MiniStat({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'red' | 'orange' | 'blue' | 'green';
}) {
  const colorStyles = {
    red: 'bg-red-50 text-red-600 border-red-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorStyles[color]}`}>
      {icon}
      <div>
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs mr-1">{label}</span>
      </div>
    </div>
  );
}

// بطاقة متابعة واحدة
function FollowupCard({
  followup,
  onComplete,
  onReschedule,
  onCall,
}: {
  followup: ScheduledFollowup;
  onComplete: (followup: ScheduledFollowup) => void;
  onReschedule: (followup: ScheduledFollowup) => void;
  onCall: (phone: string) => void;
}) {
  const customerName = followup.customer?.first_name_ar || followup.customer?.first_name || 'عميل';
  const customerLastName = followup.customer?.last_name_ar || followup.customer?.last_name || '';
  const fullName = `${customerName} ${customerLastName}`.trim();
  
  const isOverdue = new Date(followup.scheduled_date) < new Date(new Date().toDateString());
  const isToday = followup.scheduled_date === new Date().toISOString().split('T')[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md
        ${isOverdue ? 'border-red-200 bg-red-50/30' : isToday ? 'border-orange-200 bg-orange-50/20' : 'border-[#DDE5EF]'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${followup.followup_type === 'call' ? 'bg-[#EEF5FB] text-[#173A63]' : 'bg-emerald-100 text-emerald-600'}`}>
            <FollowupTypeIcon type={followup.followup_type} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{fullName}</h4>
            <span className="text-xs text-slate-500 font-mono">
              {followup.customer?.customer_code}
            </span>
          </div>
        </div>
        <Badge className={priorityStyles[followup.priority]}>
          {priorityLabels[followup.priority]}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm text-slate-700 mb-3 line-clamp-2">
        {followup.title}
      </p>

      {/* Date & Time */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
            {isOverdue ? '⚠️ متأخر - ' : isToday ? '📅 اليوم - ' : ''}
            {format(new Date(followup.scheduled_date), 'dd MMM yyyy', { locale: ar })}
          </span>
        </div>
        {followup.scheduled_time && (
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{followup.scheduled_time.slice(0, 5)}</span>
          </div>
        )}
      </div>

      {/* Legal Case Badge */}
      {followup.legal_case && (
        <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit mb-3">
          <Gavel size={12} />
          <span>قضية: {followup.legal_case.case_number}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#E7EDF4]">
        {followup.customer?.phone && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs bg-[#EEF5FB] text-[#173A63] border-[#DDE5EF] hover:bg-[#E0EBF6]"
            onClick={() => onCall(followup.customer?.phone || '')}
          >
            <Phone size={12} className="ml-1" />
            اتصال
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
          onClick={() => onComplete(followup)}
        >
          <CheckCircle size={12} className="ml-1" />
          إتمام
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-slate-500 hover:text-slate-700"
          onClick={() => onReschedule(followup)}
        >
          <RefreshCw size={12} />
        </Button>
      </div>
    </motion.div>
  );
}

// المكون الرئيسي
export function ScheduledFollowupsPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState<ScheduledFollowup | null>(null);
  const [outcome, setOutcome] = useState<'answered' | 'no_answer' | 'busy' | 'successful'>('answered');
  const [notes, setNotes] = useState('');
  const [newDate, setNewDate] = useState('');

  const { data: followups = [], isLoading } = useUpcomingFollowups(8);
  const { data: stats } = useFollowupStats();
  const completeFollowup = useCompleteFollowup();
  const rescheduleFollowup = useRescheduleFollowup();

  const handleComplete = (followup: ScheduledFollowup) => {
    setSelectedFollowup(followup);
    setOutcome('answered');
    setNotes('');
    setCompleteDialogOpen(true);
  };

  const handleReschedule = (followup: ScheduledFollowup) => {
    setSelectedFollowup(followup);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDate(tomorrow.toISOString().split('T')[0]);
    setNotes('');
    setRescheduleDialogOpen(true);
  };

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const submitComplete = async () => {
    if (!selectedFollowup) return;
    await completeFollowup.mutateAsync({
      id: selectedFollowup.id,
      outcome,
      notes,
    });
    setCompleteDialogOpen(false);
  };

  const submitReschedule = async () => {
    if (!selectedFollowup || !newDate) return;
    await rescheduleFollowup.mutateAsync({
      id: selectedFollowup.id,
      newDate,
      notes,
    });
    setRescheduleDialogOpen(false);
  };

  if (followups.length === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between bg-[#F8FAFC] p-4 transition-all hover:bg-[#EEF5FB]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#173A63] p-2 text-white">
              <Calendar size={20} />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-slate-900">المتابعات المجدولة</h3>
              <p className="text-xs text-slate-500">
                {followups.length} متابعة قادمة
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mini Stats */}
            {stats && (
              <div className="hidden md:flex items-center gap-2">
                {stats.overdue > 0 && (
                  <MiniStat label="متأخر" value={stats.overdue} icon={<AlertTriangle size={14} />} color="red" />
                )}
                {stats.today > 0 && (
                  <MiniStat label="اليوم" value={stats.today} icon={<Clock size={14} />} color="orange" />
                )}
                {stats.urgent > 0 && (
                  <MiniStat label="عاجل" value={stats.urgent} icon={<Phone size={14} />} color="blue" />
                )}
              </div>
            )}
            
            <div className={`p-2 rounded-full transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={20} className="text-slate-400" />
            </div>
          </div>
        </button>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <RefreshCw className="animate-spin ml-2" size={16} />
                    جاري التحميل...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {followups.map((followup) => (
                      <FollowupCard
                        key={followup.id}
                        followup={followup}
                        onComplete={handleComplete}
                        onReschedule={handleReschedule}
                        onCall={handleCall}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="text-emerald-600" size={20} />
              إتمام المتابعة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">نتيجة الاتصال</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'answered', label: 'تم الرد ✅', icon: <Phone size={14} /> },
                  { id: 'no_answer', label: 'لم يرد ❌', icon: <PhoneOff size={14} /> },
                  { id: 'busy', label: 'مشغول 📵', icon: <PhoneForwarded size={14} /> },
                  { id: 'successful', label: 'تم التسوية 🎉', icon: <CheckCircle size={14} /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setOutcome(opt.id as typeof outcome)}
                    className={`
                      flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all
                      ${outcome === opt.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }
                    `}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ملاحظات</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات عن المكالمة..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={submitComplete}
              disabled={completeFollowup.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {completeFollowup.isPending ? 'جاري الحفظ...' : 'تأكيد الإتمام'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="text-blue-600" size={20} />
              إعادة جدولة المتابعة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">التاريخ الجديد</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">سبب التأجيل (اختياري)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سبب إعادة الجدولة..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={submitReschedule}
              disabled={rescheduleFollowup.isPending || !newDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {rescheduleFollowup.isPending ? 'جاري الحفظ...' : 'تأكيد الجدولة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

