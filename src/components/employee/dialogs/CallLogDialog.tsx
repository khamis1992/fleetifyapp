/**
 * Call Log Dialog
 * حوار تسجيل مكالمة مع العميل
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  customerCommunicationsClient,
  type CustomerCommunicationInsert,
  type CustomerCommunicationRow,
} from '@/integrations/supabase/customerCommunicationsClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Phone,
  CheckCircle,
  Mic,
  Square,
  Trash2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

// Validation Schema
const callLogSchema = z.object({
  contract_id: z.string().min(1, 'يجب اختيار العقد'),
  call_type: z.enum(['outgoing', 'incoming']),
  call_outcome: z.enum(['answered', 'no_answer', 'busy', 'voicemail', 'wrong_number']),
  call_purpose: z.enum([
    'payment_reminder',
    'contract_renewal',
    'complaint_resolution',
    'general_inquiry',
    'follow_up',
    'other'
  ]),
  notes: z.string().min(5, 'يجب كتابة ملاحظات عن المكالمة (5 أحرف على الأقل)'),
  follow_up_required: z.boolean().default(false),
  follow_up_date: z.string().optional(),
});

type CallLogFormData = z.infer<typeof callLogSchema>;

type CallAIAnalysis = {
  summary: string;
  outcome: string;
  sentiment: string;
  customer_intent: string;
  payment_promise: {
    mentioned: boolean;
    amount: number | null;
    date: string | null;
  };
  follow_up_required: boolean;
  follow_up_date: string | null;
  action_items: string[];
  risks: string[];
};

type CallAIResult = {
  transcript: string;
  analysis: CallAIAnalysis;
  completedAt: string;
};

interface CallLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Array<{
    id: string;
    contract_number: string;
    customer_name: string;
    customer_id: string;
  }>;
  preselectedContractId?: string;
}

export const CallLogDialog: React.FC<CallLogDialogProps> = ({
  open,
  onOpenChange,
  contracts,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CallLogFormData>({
    resolver: zodResolver(callLogSchema),
    defaultValues: {
      contract_id: preselectedContractId || '',
      call_type: 'outgoing',
      call_outcome: 'answered',
      call_purpose: 'payment_reminder',
      notes: '',
      follow_up_required: false,
      follow_up_date: '',
    },
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzingPreview, setIsAnalyzingPreview] = useState(false);
  const [previewAIResult, setPreviewAIResult] = useState<CallAIResult | null>(null);
  const [previewAIError, setPreviewAIError] = useState<string | null>(null);
  const [savedCommunicationId, setSavedCommunicationId] = useState<string | null>(null);
  const [aiResult, setAIResult] = useState<CallAIResult | null>(null);
  const [aiError, setAIError] = useState<string | null>(null);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const recordingChunksRef = React.useRef<BlobPart[]>([]);
  const recordingStartedAtRef = React.useRef<number>(0);
  const recordingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRecordingRef = React.useRef(false);
  const generatedNotesRef = React.useRef('');
  const analysisRunIdRef = React.useRef(0);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const discardRecording = () => {
    analysisRunIdRef.current += 1;
    discardRecordingRef.current = true;
    clearRecordingTimer();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopMediaStream();
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl(null);
    setRecordingBlob(null);
    setRecordingSeconds(0);
    setIsRecording(false);
    setIsAnalyzingPreview(false);
    setPreviewAIResult(null);
    setPreviewAIError(null);
    if (generatedNotesRef.current && form.getValues('notes') === generatedNotesRef.current) {
      form.setValue('notes', '');
    }
    generatedNotesRef.current = '';
  };

  React.useEffect(() => () => {
    clearRecordingTimer();
    if (mediaRecorderRef.current?.state === 'recording') {
      discardRecordingRef.current = true;
      mediaRecorderRef.current.stop();
    }
    stopMediaStream();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const buildAINotes = (result: CallAIResult) => {
    const sections = [`ملخص المكالمة:\n${result.analysis.summary}`];
    if (result.analysis.customer_intent) {
      sections.push(`طلب العميل:\n${result.analysis.customer_intent}`);
    }
    if (result.analysis.payment_promise.mentioned) {
      const promiseDetails = [
        result.analysis.payment_promise.amount !== null
          ? `المبلغ: ${result.analysis.payment_promise.amount} ر.ق`
          : null,
        result.analysis.payment_promise.date ? `التاريخ: ${result.analysis.payment_promise.date}` : null,
      ].filter(Boolean).join('، ');
      sections.push(`وعد بالسداد${promiseDetails ? `: ${promiseDetails}` : ''}`);
    }
    if (result.analysis.action_items.length > 0) {
      sections.push(`الإجراءات المطلوبة:\n${result.analysis.action_items.map((item) => `- ${item}`).join('\n')}`);
    }
    return sections.join('\n\n');
  };

  const analyzeRecordingPreview = async (blob: Blob) => {
    const runId = analysisRunIdRef.current + 1;
    analysisRunIdRef.current = runId;
    setIsAnalyzingPreview(true);
    setPreviewAIResult(null);
    setPreviewAIError(null);

    try {
      const values = form.getValues();
      const contract = contracts.find((item) => item.id === values.contract_id);
      const extensionByMimeType: Record<string, string> = {
        'audio/webm': 'webm',
        'audio/ogg': 'ogg',
        'audio/mp4': 'm4a',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
      };
      const mimeType = blob.type || 'audio/webm';
      const extension = extensionByMimeType[mimeType] || 'webm';
      const body = new FormData();
      body.append('audio', new File([blob], `call-recording.${extension}`, { type: mimeType }));
      body.append('context', [
        contract ? `العميل: ${contract.customer_name}، العقد: ${contract.contract_number}` : '',
        `نوع المكالمة: ${values.call_type}`,
        `الغرض: ${values.call_purpose}`,
        `النتيجة الأولية: ${values.call_outcome}`,
      ].filter(Boolean).join('\n'));

      const { data, error } = await supabase.functions.invoke<CallAIResult>('analyze-call-recording', { body });
      if (error || !data) {
        let message = error?.message || 'لم يتم إرجاع نتيجة التحليل';
        const context = error && 'context' in error ? error.context : null;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null) as { error?: unknown } | null;
          if (typeof payload?.error === 'string') message = payload.error;
        }
        throw new Error(message);
      }
      if (analysisRunIdRef.current !== runId) return;

      const generatedNotes = buildAINotes(data);
      generatedNotesRef.current = generatedNotes;
      setPreviewAIResult(data);
      form.setValue('notes', generatedNotes, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      toast.success('تم تحويل التسجيل وكتابة الملاحظات تلقائياً');
    } catch (error) {
      if (analysisRunIdRef.current !== runId) return;
      setPreviewAIError(error instanceof Error ? error.message : 'تعذر تحليل التسجيل');
    } finally {
      if (analysisRunIdRef.current === runId) setIsAnalyzingPreview(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('التسجيل الصوتي غير مدعوم في هذا المتصفح');
      return;
    }

    try {
      discardRecording();
      discardRecordingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      const preferredMimeType = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);

      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearRecordingTimer();
        stopMediaStream();
        setIsRecording(false);

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          recordingChunksRef.current = [];
          return;
        }

        const mimeType = recorder.mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        recordingChunksRef.current = [];
        const duration = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        const url = URL.createObjectURL(blob);
        setRecordingBlob(blob);
        setRecordingUrl(url);
        setRecordingSeconds(duration);
        void analyzeRecordingPreview(blob);
      };

      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.start(250);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      }, 1000);
    } catch (error) {
      stopMediaStream();
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      toast.error(denied ? 'يجب السماح باستخدام الميكروفون لتسجيل المكالمة' : 'تعذر بدء التسجيل الصوتي');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      discardRecordingRef.current = false;
      mediaRecorderRef.current.stop();
    }
  };

  const formatRecordingDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  React.useEffect(() => {
    if (open && preselectedContractId) {
      form.setValue('contract_id', preselectedContractId, { shouldValidate: true });
    }
  }, [form, open, preselectedContractId]);

  // Mutation to log call
  const logCallMutation = useMutation({
    mutationFn: async (data: CallLogFormData) => {
      const contract = contracts.find((c) => c.id === data.contract_id);
      if (!contract) throw new Error('Contract not found');
      const companyId = user?.profile?.company_id || user?.company?.id;
      if (!user?.id || !user.profile?.id || !companyId) {
        throw new Error('تعذر تحديد المستخدم أو الشركة');
      }
      if (!recordingBlob) {
        throw new Error('يجب تسجيل المكالمة قبل الحفظ');
      }

      const now = new Date();
      const recordingMimeType = recordingBlob.type || 'audio/webm';
      const recordingExtension: Record<string, string> = {
        'audio/webm': 'webm',
        'audio/ogg': 'ogg',
        'audio/mp4': 'm4a',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
      };
      const extension = recordingExtension[recordingMimeType] || 'webm';
      const recordingPath = `${companyId}/${user.id}/${contract.id}/${crypto.randomUUID()}.${extension}`;

      const { error: recordingUploadError } = await supabase.storage
        .from('call-recordings')
        .upload(recordingPath, recordingBlob, {
          contentType: recordingMimeType,
          cacheControl: '3600',
          upsert: false,
        });

      if (recordingUploadError) {
        throw new Error(`تعذر رفع تسجيل المكالمة: ${recordingUploadError.message}`);
      }

      const actionRequiredByPurpose: Record<CallLogFormData['call_purpose'], 'payment' | 'renewal' | 'none'> = {
        payment_reminder: 'payment',
        contract_renewal: 'renewal',
        complaint_resolution: 'none',
        general_inquiry: 'none',
        follow_up: 'none',
        other: 'none',
      };

      // 1. Insert communication record
      const communicationPayload: CustomerCommunicationInsert = {
        customer_id: contract.customer_id,
        company_id: companyId,
        contract_id: data.contract_id,
        communication_type: 'phone',
        communication_date: now.toISOString().slice(0, 10),
        communication_time: now.toISOString().slice(11, 19),
        duration_minutes: Math.max(1, Math.ceil(recordingSeconds / 60)),
        employee_id: user.id,
        notes: `${data.call_purpose} - ${data.call_outcome}\nنوع المكالمة: ${data.call_type}\n${data.notes}`,
        action_required: actionRequiredByPurpose[data.call_purpose],
        action_description: data.notes,
        follow_up_scheduled: data.follow_up_required,
        follow_up_date: data.follow_up_required ? data.follow_up_date || null : null,
        follow_up_time: null,
        follow_up_status: data.follow_up_required ? 'pending' : null,
        attachments: [{
          type: 'call_recording',
          bucket: 'call-recordings',
          path: recordingPath,
          mime_type: recordingMimeType,
          duration_seconds: recordingSeconds,
        }],
        transcription_status: previewAIResult ? 'completed' : 'pending',
        transcript_text: previewAIResult?.transcript || null,
        ai_summary: previewAIResult?.analysis.summary || null,
        ai_analysis: previewAIResult?.analysis || {},
        transcription_error: null,
        transcription_completed_at: previewAIResult?.completedAt || null,
      };

      const { data: insertedCommunication, error: commError } = await customerCommunicationsClient
        .from('customer_communications')
        .insert(communicationPayload as never)
        .select()
        .single();

      if (commError) {
        await supabase.storage.from('call-recordings').remove([recordingPath]);
        throw commError;
      }
      const communication = insertedCommunication as CustomerCommunicationRow | null;
      if (!communication) {
        await supabase.storage.from('call-recordings').remove([recordingPath]);
        throw new Error('Communication record was not returned');
      }

      // 2. If follow-up required, create scheduled follow-up
      if (data.follow_up_required && data.follow_up_date) {
        const { error: followUpError } = await supabase.from('scheduled_followups').insert({
          company_id: companyId,
          customer_id: contract.customer_id,
          contract_id: data.contract_id,
          assigned_to: user.profile.id,
          created_by: user.profile.id,
          title: `متابعة مكالمة للعقد ${contract.contract_number}`,
          scheduled_date: data.follow_up_date,
          followup_type: data.call_purpose === 'contract_renewal'
            ? 'contract_renewal'
            : data.call_purpose === 'payment_reminder'
              ? 'payment_collection'
              : 'call',
          status: 'pending',
          notes: `متابعة بعد مكالمة: ${data.notes}`,
          source: 'contract',
          source_reference: data.contract_id,
        });

        if (followUpError) {
          await customerCommunicationsClient
            .from('customer_communications')
            .delete()
            .eq('id', communication.id)
            .eq('company_id', companyId);
          await supabase.storage.from('call-recordings').remove([recordingPath]);
          throw followUpError;
        }
      }

      let analysisData = previewAIResult;
      let analysisError: string | null = null;
      if (!analysisData) {
        const response = await supabase.functions.invoke<CallAIResult>(
          'analyze-call-recording',
          { body: { communicationId: communication.id } },
        );
        analysisData = response.data || null;
        analysisError = response.error?.message || null;
      }

      return {
        communication,
        analysisData: analysisData || null,
        analysisError,
      };
    },
    onSuccess: ({ communication, analysisData, analysisError }) => {
      toast.success(analysisData ? 'تم حفظ المكالمة وتحليلها بنجاح' : 'تم حفظ المكالمة', {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      });
      
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
      queryClient.invalidateQueries({ queryKey: ['employee-daily-activity-metrics'] });
      
      setSavedCommunicationId(communication.id);
      setAIResult(analysisData);
      setAIError(analysisError);
      form.reset();
      discardRecording();
    },
    onError: (error: unknown) => {
      toast.error('فشل تسجيل المكالمة', {
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ البيانات',
      });
    },
  });

  const onSubmit = async (data: CallLogFormData) => {
    if (!recordingBlob) {
      toast.error('يجب تسجيل المكالمة قبل الحفظ');
      return;
    }
    setIsSubmitting(true);
    try {
      await logCallMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryAnalysis = async () => {
    if (!savedCommunicationId) return;
    setIsRetryingAnalysis(true);
    setAIError(null);
    try {
      const { data, error } = await supabase.functions.invoke<CallAIResult>('analyze-call-recording', {
        body: { communicationId: savedCommunicationId },
      });
      if (error || !data) throw error || new Error('لم يتم إرجاع نتيجة التحليل');
      setAIResult(data);
      toast.success('تم تحليل المكالمة بنجاح');
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'تعذر تحليل التسجيل');
    } finally {
      setIsRetryingAnalysis(false);
    }
  };

  const closeDialog = () => {
    if (isSubmitting || isRecording || isRetryingAnalysis) return;
    discardRecording();
    setSavedCommunicationId(null);
    setAIResult(null);
    setAIError(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDialog();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Phone className="w-5 h-5" />
            </div>
            تسجيل مكالمة
          </DialogTitle>
          <DialogDescription>
            سجّل تفاصيل المكالمة مع العميل لتتبع التواصل والأداء
          </DialogDescription>
        </DialogHeader>

        {savedCommunicationId ? (
          <div className="space-y-4">
            {aiResult ? (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-bold">اكتمل تحليل المكالمة</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-emerald-950">{aiResult.analysis.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-slate-500">نتيجة المكالمة</p>
                    <p className="mt-1 font-semibold text-slate-800">{aiResult.analysis.outcome}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-slate-500">انطباع العميل</p>
                    <p className="mt-1 font-semibold text-slate-800">{aiResult.analysis.sentiment}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800">نص المكالمة</h4>
                  <div className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {aiResult.transcript}
                  </div>
                </div>

                {aiResult.analysis.action_items.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <h4 className="text-sm font-bold text-blue-900">الإجراءات المقترحة</h4>
                    <ul className="space-y-1 text-sm text-blue-950">
                      {aiResult.analysis.action_items.map((item, index) => (
                        <li key={`${item}-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
                <h3 className="mt-3 font-bold text-amber-900">تم حفظ المكالمة وتعذر تحليلها</h3>
                <p className="mt-2 text-sm text-amber-800">{aiError || 'تحقق من إعداد مفتاح OpenAI ثم أعد المحاولة.'}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 border-amber-300 bg-white text-amber-900"
                  onClick={retryAnalysis}
                  disabled={isRetryingAnalysis}
                >
                  {isRetryingAnalysis ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="ml-2 h-4 w-4" />
                  )}
                  إعادة التحليل
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button type="button" onClick={closeDialog} disabled={isRetryingAnalysis}>
                إغلاق
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contract Selection */}
            <FormField
              control={form.control}
              name="contract_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العقد / العميل *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العقد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.customer_name} - #{contract.contract_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Call Type */}
              <FormField
                control={form.control}
                name="call_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المكالمة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="outgoing">صادرة</SelectItem>
                        <SelectItem value="incoming">واردة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Call Outcome */}
              <FormField
                control={form.control}
                name="call_outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نتيجة المكالمة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="answered">تم الرد</SelectItem>
                        <SelectItem value="no_answer">لم يرد</SelectItem>
                        <SelectItem value="busy">مشغول</SelectItem>
                        <SelectItem value="voicemail">بريد صوتي</SelectItem>
                        <SelectItem value="wrong_number">رقم خاطئ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Call Purpose */}
            <FormField
              control={form.control}
              name="call_purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الغرض من المكالمة *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payment_reminder">تذكير بالدفع</SelectItem>
                      <SelectItem value="contract_renewal">تجديد العقد</SelectItem>
                      <SelectItem value="complaint_resolution">حل شكوى</SelectItem>
                      <SelectItem value="general_inquiry">استفسار عام</SelectItem>
                      <SelectItem value="follow_up">متابعة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Audio recording */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">تسجيل المكالمة *</p>
                  <p className="mt-1 text-xs text-slate-500">
                    يسجل صوت الميكروفون؛ تأكد من موافقة العميل وتحدث بصوت مسموع.
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-slate-700" dir="ltr">
                  {formatRecordingDuration(recordingSeconds)}
                </span>
              </div>

              {isRecording ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={stopRecording}
                >
                  <Square className="ml-2 h-4 w-4 fill-current" />
                  إيقاف التسجيل
                  <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-white" />
                </Button>
              ) : recordingUrl ? (
                <div className="space-y-3">
                  <audio className="w-full" controls preload="metadata" src={recordingUrl}>
                    متصفحك لا يدعم تشغيل التسجيل الصوتي.
                  </audio>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    onClick={discardRecording}
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف وإعادة التسجيل
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={startRecording}>
                  <Mic className="ml-2 h-4 w-4" />
                  بدء تسجيل المكالمة
                </Button>
              )}

              {isAnalyzingPreview && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  جارٍ تحويل التسجيل إلى نص وكتابة الملاحظات بالذكاء الاصطناعي...
                </div>
              )}

              {!isAnalyzingPreview && previewAIResult && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  تمت كتابة الملاحظات تلقائياً، ويمكنك مراجعتها وتعديلها قبل الحفظ.
                </div>
              )}

              {!isAnalyzingPreview && previewAIError && recordingBlob && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>تعذر كتابة الملاحظات تلقائياً: {previewAIError}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-white text-amber-900"
                    onClick={() => void analyzeRecordingPreview(recordingBlob)}
                  >
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة التحليل
                  </Button>
                </div>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات المكالمة *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ماذا تم مناقشته؟ ما هي النتائج؟"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up Required */}
            <FormField
              control={form.control}
              name="follow_up_required"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">
                    يتطلب متابعة لاحقة
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Follow-up Date (conditional) */}
            {form.watch('follow_up_required') && (
              <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ المتابعة</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isSubmitting || isRecording}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isRecording || isAnalyzingPreview || !recordingBlob}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري حفظ المكالمة...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    حفظ المكالمة
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
