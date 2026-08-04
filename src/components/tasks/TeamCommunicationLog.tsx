/**
 * Team Communication Log — سجل تواصل الفريق
 *
 * يعرض للمدير كل المكالمات والملاحظات التي سجلها الموظفون مع العملاء
 * (customer_communications) لكل الأيام، مع فلترة حسب الموظف والنوع،
 * وتشغيل التسجيلات الصوتية وملخصات الذكاء الاصطناعي.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquareReply,
  Mic,
  Phone,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCustomerName, type CustomerNameData } from '@/utils/formatCustomerName';
import {
  communicationLogDateFormatter,
  getCallRecordingPath,
  parseCallNotes,
  parseNoteContent,
  type CommunicationLogItem,
} from '@/utils/communicationLog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TypeFilter = 'all' | 'phone' | 'note';

interface TeamCommunicationRow extends CommunicationLogItem {
  employee_id: string;
}

interface ContractLookupRow {
  id: string;
  contract_number: string | null;
  customer_id: string | null;
  customers: CustomerNameData | null;
}

interface ProfileLookupRow {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
}

const formatEmployeeName = (profile?: ProfileLookupRow | null) => {
  if (!profile) return 'موظف غير محدد';
  const ar = `${profile.first_name_ar || ''} ${profile.last_name_ar || ''}`.trim();
  if (ar) return ar;
  const en = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return en || 'موظف غير محدد';
};

export function TeamCommunicationLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = user?.profile?.company_id || user?.company?.id;
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [employeeFilter, setEmployeeFilter] = React.useState<string>('all');
  const [showReplied, setShowReplied] = React.useState(false);
  const [playingRecordingId, setPlayingRecordingId] = React.useState<string | null>(null);
  const [replyTarget, setReplyTarget] = React.useState<TeamCommunicationRow | null>(null);
  const [replyTitle, setReplyTitle] = React.useState('');
  const [replyText, setReplyText] = React.useState('');
  const [replyPriority, setReplyPriority] = React.useState<'normal' | 'high' | 'urgent'>('normal');
  const [replyDate, setReplyDate] = React.useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['team-communication-log', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return {
          communications: [] as TeamCommunicationRow[],
          contractLookup: new Map<string, { contractNumber: string; customerName: string }>(),
          customerLookup: new Map<string, string>(),
          employeeLookup: new Map<string, string>(),
          employeeProfileIdLookup: new Map<string, string>(),
          managerProfileId: null as string | null,
        };
      }

      const { data: communications, error: commError } = await (supabase as any)
        .from('customer_communications')
        .select('id,communication_type,communication_date,communication_time,duration_minutes,notes,follow_up_scheduled,follow_up_date,customer_id,contract_id,employee_id,ai_summary,attachments,replied_at')
        .eq('company_id', companyId)
        .order('communication_date', { ascending: false })
        .order('communication_time', { ascending: false })
        .limit(300);
      if (commError) throw commError;

      const rows = (communications || []) as TeamCommunicationRow[];
      const contractIds = Array.from(new Set(rows.map((row) => row.contract_id).filter(Boolean))) as string[];

      const [contractsResult, profilesResult] = await Promise.all([
        contractIds.length > 0
          ? supabase
              .from('contracts')
              .select('id, contract_number, customer_id, customers(first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, customer_type)')
              .in('id', contractIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, first_name_ar, last_name_ar')
          .eq('company_id', companyId),
      ]);

      if (contractsResult.error) throw contractsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const contractLookup = new Map<string, { contractNumber: string; customerName: string }>();
      const customerLookup = new Map<string, string>();
      for (const contract of (contractsResult.data || []) as unknown as ContractLookupRow[]) {
        const customerName = formatCustomerName(contract.customers, { preferArabic: true });
        contractLookup.set(contract.id, {
          contractNumber: contract.contract_number || contract.id,
          customerName,
        });
        if (contract.customer_id) customerLookup.set(contract.customer_id, customerName);
      }

      const employeeLookup = new Map<string, string>();
      const employeeProfileIdLookup = new Map<string, string>();
      let managerProfileId: string | null = null;
      for (const profile of (profilesResult.data || []) as ProfileLookupRow[]) {
        if (profile.user_id) {
          employeeLookup.set(profile.user_id, formatEmployeeName(profile));
          employeeProfileIdLookup.set(profile.user_id, profile.id);
          if (profile.user_id === user?.id) managerProfileId = profile.id;
        }
      }

      return {
        communications: rows,
        contractLookup,
        customerLookup,
        employeeLookup,
        employeeProfileIdLookup,
        managerProfileId,
      };
    },
  });

  const communications = React.useMemo(
    () => data?.communications ?? [],
    [data?.communications],
  );

  const employeeOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of communications) {
      if (!item.employee_id) continue;
      seen.set(
        item.employee_id,
        data?.employeeLookup.get(item.employee_id) || 'موظف غير محدد',
      );
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [communications, data?.employeeLookup]);

  const filteredLog = React.useMemo(() => communications.filter((item) => {
    if (typeFilter !== 'all' && item.communication_type !== typeFilter) return false;
    if (employeeFilter !== 'all' && item.employee_id !== employeeFilter) return false;
    // العناصر التي رد عليها المدير تُخفى افتراضياً — تظهر فقط عند تفعيل «تم الرد عليها»
    // أو عند وجود تحديث جديد من الموظف (يصل كسجل مستقل جديد).
    if (!showReplied && item.replied_at) return false;
    return true;
  }), [communications, typeFilter, employeeFilter, showReplied]);

  const repliedCount = React.useMemo(
    () => communications.filter((item) => Boolean(item.replied_at)).length,
    [communications],
  );

  const groupedLog = React.useMemo(() => {
    const groups: Array<{ date: string; items: TeamCommunicationRow[] }> = [];
    for (const item of filteredLog) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === item.communication_date) {
        lastGroup.items.push(item);
      } else {
        groups.push({ date: item.communication_date, items: [item] });
      }
    }
    return groups;
  }, [filteredLog]);

  const handlePlayRecording = async (item: TeamCommunicationRow) => {
    const recordingPath = getCallRecordingPath(item.attachments);
    if (!recordingPath) return;

    setPlayingRecordingId(item.id);
    try {
      const { data: signed, error } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(recordingPath, 3600);
      if (error) throw error;
      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error('تعذر فتح التسجيل الصوتي', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPlayingRecordingId(null);
    }
  };

  const resolveCustomerName = (item: TeamCommunicationRow) => {
    const contractInfo = item.contract_id ? data?.contractLookup.get(item.contract_id) : null;
    return contractInfo?.customerName
      || data?.customerLookup.get(item.customer_id)
      || 'عميل غير محدد';
  };

  const openReplyDialog = (item: TeamCommunicationRow) => {
    const typeLabel = item.communication_type === 'phone' ? 'مكالمة' : 'ملاحظة';
    setReplyTarget(item);
    setReplyTitle(`رد على ${typeLabel} — ${resolveCustomerName(item)}`);
    setReplyText('');
    setReplyPriority('normal');
    setReplyDate(new Date().toISOString().slice(0, 10));
  };

  const closeReplyDialog = () => setReplyTarget(null);

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!replyTarget || !companyId) throw new Error('تعذر تحديد السجل');
      const employeeProfileId = data?.employeeProfileIdLookup.get(replyTarget.employee_id);
      if (!employeeProfileId) throw new Error('تعذر تحديد ملف الموظف صاحب السجل');
      if (!replyText.trim()) throw new Error('اكتب نص الرد أو المهمة أولًا');

      const typeLabel = replyTarget.communication_type === 'phone' ? 'مكالمة' : 'ملاحظة';
      const originalExcerpt = String(replyTarget.notes || '').slice(0, 200);
      const title = replyTitle.trim() || `رد على ${typeLabel}`;

      const { data: insertedTask, error } = await supabase.from('employee_tasks').insert({
        company_id: companyId,
        title,
        title_ar: title,
        description: `${replyText.trim()}\n\n—\nالسجل الأصلي (${typeLabel} بتاريخ ${replyTarget.communication_date}):\n${originalExcerpt}`,
        task_type: 'followup',
        status: 'pending',
        priority: replyPriority,
        scheduled_date: replyDate,
        due_date: replyDate,
        customer_id: replyTarget.customer_id,
        contract_id: replyTarget.contract_id,
        assigned_to: employeeProfileId,
        assigned_by: data?.managerProfileId || null,
      }).select('id').single();
      if (error) throw error;

      // تعليم السجل الأصلي كـ«تم الرد عليه» ليُخفى من السجل افتراضياً،
      // ويعود للظهور فقط كسجل جديد عند وجود تحديث من الموظف.
      const { error: markError } = await (supabase as any)
        .from('customer_communications')
        .update({
          replied_at: new Date().toISOString(),
          replied_task_id: insertedTask?.id || null,
        })
        .eq('id', replyTarget.id)
        .eq('company_id', companyId);
      if (markError) throw markError;
    },
    onSuccess: () => {
      toast.success('تم إرسال الرد كمهمة للموظف', {
        description: 'ستظهر له في مساحته الشخصية ضمن قسم المهام',
      });
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-communication-log'] });
      closeReplyDialog();
    },
    onError: (mutationError) => {
      toast.error('تعذر إرسال الرد', {
        description: mutationError instanceof Error ? mutationError.message : undefined,
      });
    },
  });

  return (
    <>
    <Card className="rounded-2xl border-[#DDE5EF] shadow-sm" dir="rtl">
      <CardHeader className="border-b border-[#EEF2F6] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FA] text-[#1D4F7A]">
                <Users className="h-4 w-4" />
              </div>
              سجل تواصل الفريق
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              كل المكالمات والملاحظات التي سجلها الموظفون مع العملاء — لكل الأيام، مع التسجيلات الصوتية وملخصات الذكاء الاصطناعي.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              ['all', 'الكل'],
              ['phone', 'مكالمات'],
              ['note', 'ملاحظات'],
            ] as const).map(([filterKey, filterLabel]) => (
              <Button
                key={filterKey}
                type="button"
                size="sm"
                variant={typeFilter === filterKey ? 'default' : 'outline'}
                className={cn(
                  'h-7 rounded-lg px-2.5 text-[10px] font-bold sm:text-xs',
                  typeFilter === filterKey
                    ? 'bg-[#142033] text-white hover:bg-[#142033]'
                    : 'border-[#E2E8F0] text-[#475569]',
                )}
                onClick={() => setTypeFilter(filterKey)}
              >
                {filterLabel}
              </Button>
            ))}
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="h-7 w-[150px] rounded-lg border-[#E2E8F0] text-[10px] font-bold sm:text-xs">
                <SelectValue placeholder="كل الموظفين" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل الموظفين</SelectItem>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {repliedCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant={showReplied ? 'default' : 'outline'}
                className={cn(
                  'h-7 gap-1 rounded-lg px-2.5 text-[10px] font-bold sm:text-xs',
                  showReplied
                    ? 'bg-[#059669] text-white hover:bg-[#059669]'
                    : 'border-[#A7F3D0] text-[#059669]',
                )}
                onClick={() => setShowReplied((prev) => !prev)}
                title="إظهار / إخفاء السجلات التي تم الرد عليها"
              >
                <CheckCheck className="h-3 w-3" />
                تم الرد عليها ({repliedCount})
              </Button>
            )}
            <Badge className="rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569] hover:bg-[#F1F5F9]">
              {filteredLog.length} سجل
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6A7688]">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري تحميل سجل التواصل...
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm font-bold text-red-700">
            تعذر تحميل سجل التواصل{error instanceof Error ? `: ${error.message}` : ''}
          </div>
        ) : groupedLog.length === 0 ? (
          <div className="py-12 text-center">
            <Phone className="mx-auto mb-3 h-12 w-12 text-[#E2E8F0]" />
            <p className="text-sm text-gray-400">لا توجد سجلات تواصل مطابقة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedLog.map((group) => (
              <div key={group.date}>
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#8A9AAF]" />
                  <span className="text-xs font-black text-[#40516A]">
                    {communicationLogDateFormatter.format(new Date(`${group.date}T00:00:00`))}
                  </span>
                  <span className="text-[10px] font-bold text-[#8A96A8]">({group.items.length})</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isPhoneCall = item.communication_type === 'phone';
                    const parsed = isPhoneCall ? parseCallNotes(item.notes) : null;
                    const noteParsed = !isPhoneCall ? parseNoteContent(item.notes) : null;
                    const contractInfo = item.contract_id
                      ? data?.contractLookup.get(item.contract_id)
                      : null;
                    const customerName = contractInfo?.customerName
                      || data?.customerLookup.get(item.customer_id)
                      || 'عميل غير محدد';
                    const employeeName = data?.employeeLookup.get(item.employee_id) || 'موظف غير محدد';
                    const hasRecording = Boolean(getCallRecordingPath(item.attachments));

                    const isReplied = Boolean(item.replied_at);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'rounded-xl border p-3',
                          isReplied
                            ? 'border-[#A7F3D0] bg-[#F0FDF4]'
                            : 'border-[#EEF2F6] bg-[#FBFCFE]',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            isPhoneCall
                              ? 'bg-[#EEF4FA] text-[#1D4F7A]'
                              : 'bg-[#FFFBEB] text-[#92400E]',
                          )}>
                            {isPhoneCall ? <Phone className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          </span>
                          {parsed && (
                            <Badge variant="outline" className="rounded-md bg-white text-[#1D4F7A]">
                              {parsed.outcome}
                            </Badge>
                          )}
                          {noteParsed && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'rounded-md',
                                noteParsed.important
                                  ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                                  : 'bg-white text-[#92400E]',
                              )}
                            >
                              {noteParsed.important ? '⭐ ' : ''}{noteParsed.typeLabel}
                            </Badge>
                          )}
                          <button
                            type="button"
                            disabled={!item.customer_id}
                            onClick={() => item.customer_id && navigate(`/customers/${item.customer_id}`)}
                            className="text-xs font-black text-[#142033] underline-offset-2 transition-colors hover:text-[#1D4F7A] hover:underline disabled:cursor-default disabled:hover:text-[#142033] disabled:hover:no-underline"
                            title="فتح ملف العميل"
                          >
                            {customerName}
                          </button>
                          {contractInfo?.contractNumber && (
                            <button
                              type="button"
                              onClick={() => navigate(`/contracts/${contractInfo.contractNumber}`)}
                              className="text-xs text-[#8A96A8] underline-offset-2 transition-colors hover:text-[#1D4F7A] hover:underline"
                              title="فتح العقد"
                            >
                              {contractInfo.contractNumber}
                            </button>
                          )}
                          <span className="text-xs text-[#8A96A8]" dir="ltr">
                            {String(item.communication_time || '').slice(0, 5)}
                          </span>
                          {item.duration_minutes ? (
                            <span className="text-[10px] font-bold text-[#6A7688]">
                              {item.duration_minutes} دقيقة
                            </span>
                          ) : null}
                          <Badge className="rounded-md bg-[#F1F5F9] text-[10px] font-bold text-[#475569] hover:bg-[#F1F5F9]">
                            {employeeName}
                          </Badge>
                          {isReplied ? (
                            <Badge className="gap-1 rounded-md border border-[#A7F3D0] bg-[#D1FAE5] text-[10px] font-black text-[#047857] hover:bg-[#D1FAE5]">
                              <CheckCheck className="h-3 w-3" />
                              تم الرد — أُرسلت كمهمة
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 gap-1 rounded-md border-[#A7F3D0] bg-[#ECFDF5] px-2 text-[10px] font-bold text-[#059669] hover:bg-[#D1FAE5]"
                              onClick={() => openReplyDialog(item)}
                            >
                              <MessageSquareReply className="h-3 w-3" />
                              رد / مهمة
                            </Button>
                          )}
                          {hasRecording && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 gap-1 rounded-md border-[#BFDBFE] bg-[#EFF6FF] px-2 text-[10px] font-bold text-[#1D4ED8] hover:bg-[#DBEAFE]"
                              disabled={playingRecordingId === item.id}
                              onClick={() => handlePlayRecording(item)}
                            >
                              {playingRecordingId === item.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Mic className="h-3 w-3" />}
                              التسجيل
                            </Button>
                          )}
                        </div>
                        {parsed && (
                          <p className="mt-1.5 text-xs font-bold text-[#6A7688]">{parsed.purpose}</p>
                        )}
                        <p className="mt-1 whitespace-pre-line text-sm font-bold text-[#142033]">
                          {parsed ? parsed.body : noteParsed?.body}
                        </p>
                        {item.ai_summary && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#F5F3FF] p-2 text-xs font-bold text-[#6D28D9]">
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {item.ai_summary}
                          </p>
                        )}
                        {item.follow_up_scheduled && item.follow_up_date && (
                          <p className="mt-2 text-xs font-black text-[#0D876A]">
                            متابعة: {item.follow_up_date}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={Boolean(replyTarget)} onOpenChange={(open) => { if (!open) closeReplyDialog(); }}>
      <DialogContent dir="rtl" className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <MessageSquareReply className="h-5 w-5 text-[#059669]" />
            رد / إسناد مهمة للموظف
          </DialogTitle>
          <DialogDescription className="text-right">
            {replyTarget && (
              <>
                سيصل ردك كمهمة إلى <strong>{data?.employeeLookup.get(replyTarget.employee_id) || 'الموظف'}</strong>
                {' '}في مساحته الشخصية ضمن قسم المهام — بخصوص {resolveCustomerName(replyTarget)}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply-title">عنوان المهمة</Label>
            <Input
              id="reply-title"
              value={replyTitle}
              onChange={(event) => setReplyTitle(event.target.value)}
              placeholder="مثال: متابعة وعد الدفع مع العميل"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply-text">نص الرد / المهمة *</Label>
            <Textarea
              id="reply-text"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="اكتب ما يجب على الموظف تنفيذه أو متابعته..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select
                value={replyPriority}
                onValueChange={(value) => setReplyPriority(value as 'normal' | 'high' | 'urgent')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-date">تاريخ المتابعة</Label>
              <Input
                id="reply-date"
                type="date"
                value={replyDate}
                onChange={(event) => setReplyDate(event.target.value)}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeReplyDialog}
            disabled={replyMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="gap-1.5 bg-[#059669] text-white hover:bg-[#047857]"
            disabled={replyMutation.isPending || !replyText.trim()}
            onClick={() => replyMutation.mutate()}
          >
            {replyMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            إرسال كمهمة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
