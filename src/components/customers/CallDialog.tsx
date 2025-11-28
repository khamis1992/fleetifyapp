/**
 * CallDialog Component
 * نافذة مكالمة تفاعلية لتسجيل المكالمات مع العملاء
 * 
 * @component
 * @example
 * <CallDialog
 *   open={true}
 *   onOpenChange={setOpen}
 *   customerName="أحمد محمد"
 *   customerPhone="+974 5555 5555"
 *   onSaveCall={handleSaveCall}
 * />
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Clock, Check, X, PhoneOff } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {callStatus === 'ringing' && '📞 جاري الاتصال...'}
            {callStatus === 'in_call' && '🗣️ مكالمة جارية'}
            {callStatus === 'ended' && '✅ انتهت المكالمة'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info Card */}
          <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl ring-4 ring-white">
              <span className="text-4xl text-white font-bold">
                {getInitials(customerName)}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{customerName}</h3>
            <p className="text-xl font-mono text-blue-600 bg-white px-4 py-2 rounded-lg inline-block shadow-sm" dir="ltr">
              📞 {customerPhone}
            </p>
          </div>

          {/* Timer Display */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">مدة المكالمة</span>
            </div>
            <div className="text-4xl font-bold text-green-700 font-mono">
              {formatTime(timer)}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>ملاحظات المكالمة</span>
              {notes.length > 0 && (
                <span className="text-xs text-gray-500">({notes.length} حرف)</span>
              )}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب تفاصيل المكالمة، الاتفاقات، أو أي ملاحظات مهمة...&#10;&#10;مثال:&#10;• تم الاتفاق على موعد التجديد&#10;• العميل راضي عن الخدمة&#10;• طلب خصم على الفاتورة القادمة"
              rows={5}
              className="resize-none"
              disabled={saving}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {callStatus === 'ringing' && (
              <>
                <Button
                  onClick={() => {
                    setCallStatus('in_call');
                    // فتح تطبيق الهاتف
                    window.location.href = `tel:${customerPhone}`;
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-semibold"
                  disabled={saving}
                >
                  <Phone className="w-5 h-5 ml-2" />
                  بدء المكالمة
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleEndCall('no_answer')}
                    disabled={saving}
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    <PhoneOff className="w-4 h-4 ml-2" />
                    {saving ? 'جاري الحفظ...' : 'لم يرد'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEndCall('busy')}
                    disabled={saving}
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 ml-2" />
                    {saving ? 'جاري الحفظ...' : 'مشغول'}
                  </Button>
                </div>
              </>
            )}

            {callStatus === 'in_call' && (
              <Button
                onClick={() => handleEndCall('answered')}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-semibold"
              >
                <Check className="w-5 h-5 ml-2" />
                {saving ? 'جاري الحفظ...' : 'إنهاء المكالمة وحفظ'}
              </Button>
            )}
          </div>

          {/* Quick Notes Buttons */}
          {callStatus === 'in_call' && (
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                <span>إضافة سريعة:</span>
                <span className="text-gray-400">(اضغط لإضافة الملاحظة)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {quickNotes.map((quickNote) => (
                  <Button
                    key={quickNote}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const separator = notes.trim() ? '\n' : '';
                      setNotes(notes + separator + '• ' + quickNote);
                    }}
                    className="text-xs hover:bg-blue-50 hover:border-blue-300"
                    disabled={saving}
                  >
                    {quickNote}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          {callStatus === 'ringing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 text-center">
                💡 <strong>نصيحة:</strong> سيتم فتح تطبيق الهاتف تلقائياً عند بدء المكالمة
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

