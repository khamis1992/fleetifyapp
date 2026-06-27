import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerCRMActivity } from '@/hooks/useCustomerCRMActivity';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Phone,
  MessageSquare,
  Mail,
  Bell,
  Plus,
  Send,
  RefreshCw,
  CheckCircle,
  Calendar,
  Loader2,
  PhoneOff,
  PhoneIncoming,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotesTab = ({ customerId, customerPhone, companyId }: { customerId: string; customerPhone?: string; companyId?: string }) => {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'phone' | 'whatsapp'>('note');
  const [isAdding, setIsAdding] = useState(false);
  
  const { activities, isLoading, addActivity, isAddingActivity } = useCustomerCRMActivity(customerId);

  const [isAddingFollowup, setIsAddingFollowup] = useState(false);
  const [newFollowup, setNewFollowup] = useState({
    title: '',
    notes: '',
    scheduled_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  const { data: followups, isLoading: isLoadingFollowups, refetch: refetchFollowups } = useQuery({
    queryKey: ['customer-followups', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!companyId
  });

  const pendingFollowups = followups?.filter(f => f.status !== 'completed') || [];
  const completedFollowups = followups?.filter(f => f.status === 'completed') || [];

  const handleAddFollowup = async () => {
    if (!newFollowup.title.trim() || !newFollowup.scheduled_date) return;

    try {
      const { error } = await supabase
        .from('scheduled_followups')
        .insert({
          customer_id: customerId,
          company_id: companyId,
          title: newFollowup.title,
          notes: newFollowup.notes,
          scheduled_date: newFollowup.scheduled_date,
          priority: newFollowup.priority,
          status: 'pending'
        });

      if (error) throw error;
      
      setNewFollowup({ title: '', notes: '', scheduled_date: '', priority: 'medium' });
      setIsAddingFollowup(false);
      refetchFollowups();
    } catch (error) {
      console.error('Error adding followup:', error);
    }
  };

  const handleCompleteFollowup = async (followupId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_followups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', followupId);

      if (error) throw error;
      refetchFollowups();
    } catch (error) {
      console.error('Error completing followup:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      default: return 'منخفض';
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await addActivity({
        note_type: noteType,
        content: newNote,
        title: noteType === 'phone' ? 'مكالمة هاتفية' : noteType === 'whatsapp' ? 'رسالة واتساب' : 'ملاحظة',
      });
      setNewNote('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'phone':
      case 'call':
        if (status === 'no_answer') return <PhoneOff className="w-4 h-4 text-red-500" />;
        if (status === 'busy') return <PhoneIncoming className="w-4 h-4 text-amber-500" />;
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'followup':
        return <Bell className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'phone':
      case 'call': return 'مكالمة';
      case 'whatsapp': return 'واتساب';
      case 'email': return 'بريد';
      case 'note': return 'ملاحظة';
      case 'followup': return 'متابعة';
      default: return 'تفاعل';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* القسم الأول: المتابعات القادمة */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h4 className="text-sm font-bold text-amber-900">المتابعات القادمة</h4>
            {pendingFollowups.length > 0 && (
              <Badge className="text-xs bg-amber-500 text-white">
                {pendingFollowups.length}
              </Badge>
            )}
          </div>
          <Button 
            size="sm" 
            variant="outline"
            className="gap-1.5 h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setIsAddingFollowup(!isAddingFollowup)}
          >
            <Plus className="w-3.5 h-3.5" />
            متابعة جديدة
          </Button>
        </div>

        <AnimatePresence>
          {isAddingFollowup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl p-4 mb-3 border border-amber-200 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newFollowup.title}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="عنوان المتابعة..."
                  className="px-3 py-2 border border-[#DDE5EF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="datetime-local"
                  value={newFollowup.scheduled_date}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="px-3 py-2 border border-[#DDE5EF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                  <Button
                    key={priority}
                    variant={newFollowup.priority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewFollowup(prev => ({ ...prev, priority }))}
                    className={cn("text-xs h-7", newFollowup.priority === priority ? getPriorityColor(priority) : '')}
                  >
                    {getPriorityLabel(priority)}
                  </Button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsAddingFollowup(false)}>إلغاء</Button>
                <Button 
                  size="sm"
                  className="h-8 bg-amber-500 hover:bg-amber-600"
                  onClick={handleAddFollowup}
                  disabled={!newFollowup.title.trim() || !newFollowup.scheduled_date}
                >
                  حفظ
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoadingFollowups ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          </div>
        ) : pendingFollowups.length > 0 ? (
          <div className="space-y-2">
            {pendingFollowups.map((followup) => (
              <div
                key={followup.id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-amber-100 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={cn("text-[10px] shrink-0", getPriorityColor(followup.priority))}>
                    {getPriorityLabel(followup.priority)}
                  </Badge>
                  <span className="text-sm font-medium text-neutral-800 truncate">{followup.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-neutral-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(followup.scheduled_date), 'dd MMM', { locale: ar })}
                  </span>
                  {differenceInDays(new Date(followup.scheduled_date), new Date()) <= 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">متأخر</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCompleteFollowup(followup.id)}
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-amber-600/70 text-sm">
            لا توجد متابعات قادمة
          </div>
        )}
      </div>

      {/* القسم الثاني: سجل التواصل والملاحظات */}
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#173A63] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#142033]">سجل التواصل والملاحظات</h4>
              <p className="text-xs font-semibold text-[#6A7688]">{activities.length} تفاعل مسجل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customerPhone && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]"
                  onClick={() => window.open(`tel:${customerPhone}`)}
                >
                  <Phone className="w-4 h-4" />
                  اتصال
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                  onClick={() => window.open(`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`)}
                >
                  <MessageSquare className="w-4 h-4" />
                  واتساب
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="gap-2 bg-[#173A63] hover:bg-[#142033]"
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[#DDE5EF] pt-5 space-y-4 bg-[#F8FAFC] -mx-5 -mb-5 px-5 pb-5"
            >
              <div className="flex gap-2">
                <Button
                  variant={noteType === 'note' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteType('note')}
                  className={cn(
                    "gap-2",
                    noteType === 'note'
                      ? "bg-[#173A63] hover:bg-[#142033] text-white"
                      : "border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]"
                  )}
                >
                  <FileText className="w-4 h-4 ml-1" />
                  ملاحظة
                </Button>
                <Button
                  variant={noteType === 'phone' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteType('phone')}
                  className={cn(
                    "gap-2",
                    noteType === 'phone'
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20"
                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                  )}
                >
                  <Phone className="w-4 h-4 ml-1" />
                  مكالمة
                </Button>
                <Button
                  variant={noteType === 'whatsapp' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteType('whatsapp')}
                  className={cn(
                    "gap-2",
                    noteType === 'whatsapp'
                      ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/20"
                      : "border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
                  )}
                >
                  <MessageSquare className="w-4 h-4 ml-1" />
                  واتساب
                </Button>
              </div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="اكتب ملاحظتك هنا..."
                className="min-h-[100px] border-[#DDE5EF] focus:border-[#173A63] focus:ring-[#173A63]/20 bg-white"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-[#173A63] hover:bg-[#142033]"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAddingActivity}
                >
                  {isAddingActivity ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  حفظ
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* قائمة النشاطات (Timeline) */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-[#173A63]" />
          <span className="mr-3 text-[#536173]">جاري تحميل النشاط...</span>
        </div>
      ) : activities.length > 0 ? (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-[#DDE5EF]" />
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pr-14"
              >
                <div className="absolute right-3 w-6 h-6 rounded-full bg-white border-2 border-[#B8C6D8] flex items-center justify-center shadow-sm">
                  {getActivityIcon(activity.note_type, activity.call_status)}
                </div>
                <div className="rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-all hover:border-[#173A63] hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-[#DDE5EF] text-[#173A63] bg-[#EEF5FB]">
                        {getActivityLabel(activity.note_type)}
                      </Badge>
                      {activity.is_important && (
                        <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                          مهم
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(activity.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{activity.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#B8C6D8] bg-[#F8FAFC] p-12 text-center">
          <MessageSquare className="w-12 h-12 text-[#9AA6B6] mx-auto mb-3" />
          <p className="font-bold text-[#536173]">لا توجد ملاحظات مسجلة</p>
          <p className="text-[#6A7688] text-sm mt-1">ابدأ بإضافة ملاحظة أو تسجيل مكالمة</p>
        </div>
      )}
    </motion.div>
  );
};

export default NotesTab;
