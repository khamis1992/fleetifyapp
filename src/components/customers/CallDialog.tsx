/**
 * CallDialog Component
 * نافذة مكالمة تفاعلية لتسجيل المكالمات مع العملاء
 * تصميم محسّن ومتناسق مع صفحة CRM
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Clock, Check, X, PhoneOff, User } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CallDialogProps {
  /** حالة فتح/إغلاق النافذة */
  open: boolean;
  /** دالة تغيير حالة النافذة */
  onOpenChange: (open: boolean) => void;
  /** اسم العميل */
  customerName: string;
  /** رقم هاتف العميل */
  customerPhone: string;
  /** دالة حفظ المكالمة */
  onSaveCall: (notes: string, status: 'answered' | 'no_answer' | 'busy') => Promise<void>;
}

/**
 * نافذة المكالمة التفاعلية
 * تعرض معلومات العميل، timer للمكالمة، وحقل لتسجيل الملاحظات
 */
export function CallDialog({ 
  open, 
  onOpenChange, 
  customerName, 
  customerPhone, 
  onSaveCall 
}: CallDialogProps) {
  // State management
  const [timer, setTimer] = useState(0);
  const [notes, setNotes] = useState('');
  const [callStatus, setCallStatus] = useState<'ringing' | 'in_call' | 'ended'>('ringing');
  const [saving, setSaving] = useState(false);

  // Timer effect - يعمل فقط عندما تكون المكالمة جارية
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callStatus === 'in_call' && open) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimer(0);
      setNotes('');
      setCallStatus('ringing');
      setSaving(false);
    }
  }, [open]);

  /**
   * تنسيق وقت المكالمة بصيغة MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * معالج إنهاء المكالمة وحفظها
   */
  const handleEndCall = async (status: 'answered' | 'no_answer' | 'busy') => {
    setSaving(true);
    try {
      await onSaveCall(notes, status);
      onOpenChange(false);
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * ملاحظات سريعة جاهزة للإضافة
   */
  const quickNotes = [
    'العميل راضي عن الخدمة',
    'يرغب في تجديد العقد',
    'لديه استفسار عن الفاتورة',
    'يحتاج صيانة للمركبة',
    'طلب تغيير موعد السداد',
  ];

  /**
   * الحصول على أول حرفين من الاسم للأفاتار
   */
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden border-0 shadow-2xl">
        {/* Header with Customer Info */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white p-5 text-center">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg ring-3 ring-white/20">
            <span className="text-2xl text-white font-bold">
              {getInitials(customerName)}
            </span>
          </div>
          
          {/* Customer Name */}
          <h3 className="text-lg font-bold mb-1">{customerName}</h3>
          
          {/* Phone Number */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Phone className="w-3.5 h-3.5 text-green-400" />
            <span className="text-sm font-mono tracking-wide" dir="ltr">{customerPhone}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 bg-gray-50">
          {/* Timer Display */}
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">مدة المكالمة</span>
            </div>
            <div className={`text-3xl font-bold font-mono ${callStatus === 'in_call' ? 'text-green-600' : 'text-slate-700'}`}>
              {formatTime(timer)}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              ملاحظات المكالمة
              {notes.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">({notes.length} حرف)</span>
              )}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب تفاصيل المكالمة..."
              rows={3}
              className="resize-none text-sm bg-white border-gray-200 focus:border-green-500 focus:ring-green-500/20"
              disabled={saving}
            />
          </div>

          {/* Quick Notes - Only show when in call */}
          {callStatus === 'in_call' && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-medium">إضافة سريعة:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickNotes.slice(0, 3).map((quickNote) => (
                  <button
                    key={quickNote}
                    onClick={() => {
                      const separator = notes.trim() ? '\n' : '';
                      setNotes(notes + separator + '• ' + quickNote);
                    }}
                    className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-md text-slate-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                    disabled={saving}
                  >
                    {quickNote}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 bg-gray-50 space-y-2">
          {callStatus === 'ringing' && (
            <>
              <Button
                onClick={() => {
                  setCallStatus('in_call');
                  // فتح تطبيق الهاتف
                  window.location.href = `tel:${customerPhone}`;
                }}
                className="w-full bg-green-600 hover:bg-green-700 h-11 text-base font-semibold shadow-sm"
                disabled={saving}
              >
                <Phone className="w-4 h-4 ml-2" />
                بدء المكالمة
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEndCall('no_answer')}
                  disabled={saving}
                  className="h-9 text-sm border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                >
                  <PhoneOff className="w-3.5 h-3.5 ml-1.5" />
                  {saving ? 'جاري...' : 'لم يرد'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEndCall('busy')}
                  disabled={saving}
                  className="h-9 text-sm border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <X className="w-3.5 h-3.5 ml-1.5" />
                  {saving ? 'جاري...' : 'مشغول'}
                </Button>
              </div>
            </>
          )}

          {callStatus === 'in_call' && (
            <Button
              onClick={() => handleEndCall('answered')}
              disabled={saving}
              className="w-full bg-slate-700 hover:bg-slate-800 h-11 text-base font-semibold shadow-sm"
            >
              <Check className="w-4 h-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'إنهاء وحفظ'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

