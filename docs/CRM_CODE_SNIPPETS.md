# 📝 أكواد جاهزة لتحسينات CRM

> **ملاحظة:** هذا ملف مرجعي سريع. للخطة الكاملة، راجع `PLAN_CRM_IMPROVEMENTS.md`

---

## 🎨 1. CallDialog Component (جاهز للنسخ)

### ملف: `src/components/customers/CallDialog.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Clock, Check, X, PhoneOff, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  onSaveCall: (notes: string, status: 'answered' | 'no_answer' | 'busy') => Promise<void>;
}

export function CallDialog({ 
  open, 
  onOpenChange, 
  customerName, 
  customerPhone, 
  onSaveCall 
}: CallDialogProps) {
  const [timer, setTimer] = useState(0);
  const [notes, setNotes] = useState('');
  const [callStatus, setCallStatus] = useState<'ringing' | 'in_call' | 'ended'>('ringing');
  const [saving, setSaving] = useState(false);

  // Timer effect
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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimer(0);
      setNotes('');
      setCallStatus('ringing');
    }
  }, [open]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async (status: 'answered' | 'no_answer' | 'busy') => {
    setSaving(true);
    try {
      await onSaveCall(notes, status);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const quickNotes = [
    'العميل راضي عن الخدمة',
    'يرغب في تجديد العقد',
    'لديه استفسار عن الفاتورة',
    'يحتاج صيانة للمركبة',
    'طلب تغيير موعد',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {callStatus === 'ringing' && '📞 جاري الاتصال...'}
            {callStatus === 'in_call' && '🗣️ مكالمة جارية'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl text-white font-bold">
                {customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{customerName}</h3>
            <p className="text-lg font-mono text-gray-600" dir="ltr">{customerPhone}</p>
          </div>

          {/* Timer */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">مدة المكالمة</span>
            </div>
            <div className="text-4xl font-bold text-green-700 font-mono">
              {formatTime(timer)}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">ملاحظات المكالمة</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب تفاصيل المكالمة، الاتفاقات، أو أي ملاحظات مهمة..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {callStatus === 'ringing' && (
              <>
                <Button
                  onClick={() => {
                    setCallStatus('in_call');
                    window.location.href = `tel:${customerPhone}`;
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
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
                    لم يرد
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEndCall('busy')}
                    disabled={saving}
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 ml-2" />
                    مشغول
                  </Button>
                </div>
              </>
            )}

            {callStatus === 'in_call' && (
              <Button
                onClick={() => handleEndCall('answered')}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
              >
                <Check className="w-5 h-5 ml-2" />
                {saving ? 'جاري الحفظ...' : 'إنهاء المكالمة وحفظ'}
              </Button>
            )}
          </div>

          {/* Quick Notes */}
          {callStatus === 'in_call' && (
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-2">إضافة سريعة:</p>
              <div className="flex flex-wrap gap-2">
                {quickNotes.map((quickNote) => (
                  <Button
                    key={quickNote}
                    variant="outline"
                    size="sm"
                    onClick={() => setNotes(notes + (notes ? '\n' : '') + '• ' + quickNote)}
                    className="text-xs"
                  >
                    {quickNote}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔄 2. تحديثات CustomerCRM.tsx

### إضافة Imports

```typescript
import { CallDialog } from '@/components/customers/CallDialog';
import { MessageSquare } from 'lucide-react'; // للواتساب
```

### إضافة State

```typescript
// في بداية Component (بعد السطر ~110)
const [callDialogOpen, setCallDialogOpen] = useState(false);
const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
const [priorityFilter, setPriorityFilter] = useState<string>('all');
```

### تحديث دالة handleCallNow

```typescript
// استبدل الدالة الموجودة (حوالي السطر 310)
const handleCallNow = async (customer: Customer) => {
  setCallingCustomer(customer);
  setCallDialogOpen(true);
};

// دالة جديدة لحفظ المكالمة
const handleSaveCall = async (notes: string, status: 'answered' | 'no_answer' | 'busy') => {
  if (!companyId || !callingCustomer) return;

  try {
    const statusTexts = {
      answered: '✅ تم الرد - ',
      no_answer: '❌ لم يرد - ',
      busy: '📵 مشغول - '
    };

    const finalNotes = `${statusTexts[status]}مكالمة في ${format(new Date(), 'dd/MM/yyyy')} الساعة ${format(new Date(), 'HH:mm')}\n\n${notes || 'لا توجد ملاحظات إضافية'}`;

    const { error } = await supabase
      .from('customer_notes')
      .insert({
        customer_id: callingCustomer.id,
        company_id: companyId,
        note_type: 'phone',
        title: status === 'answered' ? 'مكالمة هاتفية' : (status === 'no_answer' ? 'محاولة اتصال - لم يرد' : 'محاولة اتصال - مشغول'),
        content: finalNotes,
        is_important: status !== 'answered',
      });

    if (error) throw error;

    toast({
      title: status === 'answered' ? '✅ تم حفظ المكالمة' : '⚠️ تم تسجيل المحاولة',
      description: status === 'answered' 
        ? 'تم حفظ تفاصيل المكالمة بنجاح'
        : 'سيتم تذكيرك بالمحاولة مرة أخرى',
    });
  } catch (error) {
    console.error('Error saving call:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء حفظ المكالمة',
      variant: 'destructive',
    });
  }
};
```

### إضافة CallDialog في نهاية return

```typescript
// قبل آخر </div> في return
{callingCustomer && (
  <CallDialog
    open={callDialogOpen}
    onOpenChange={setCallDialogOpen}
    customerName={`${callingCustomer.first_name_ar || callingCustomer.first_name || ''} ${callingCustomer.last_name_ar || callingCustomer.last_name || ''}`}
    customerPhone={callingCustomer.phone || ''}
    onSaveCall={handleSaveCall}
  />
)}
```

---

## 📱 3. زر واتساب (إضافة بسيطة)

### دالة إرسال واتساب

```typescript
// إضافة بعد handleCallNow
const handleWhatsAppMessage = async (customer: Customer) => {
  const customerName = `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim();
  
  const message = encodeURIComponent(
    `مرحباً ${customerName}،\n\n` +
    `نتواصل معك من شركة العراف لتأجير السيارات.\n\n` +
    `نود التأكد من رضاك عن خدماتنا والإجابة على أي استفسارات.`
  );
  
  const phoneNumber = customer.phone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  
  // تسجيل المحاولة
  if (companyId) {
    await supabase
      .from('customer_notes')
      .insert({
        customer_id: customer.id,
        company_id: companyId,
        note_type: 'message',
        title: 'رسالة واتساب',
        content: `تم إرسال رسالة واتساب في ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        is_important: false,
      });
  }
};
```

### إضافة الزر في UI

```typescript
// استبدل div الأزرار (حوالي السطر 712)
<div className="flex gap-3 mb-4">
  <Button
    className="flex-1 bg-green-600 hover:bg-green-700"
    onClick={() => handleCallNow(customer)}
  >
    <Phone className="w-4 h-4 ml-2" />
    اتصال الآن
  </Button>
  
  {/* ✅ زر واتساب الجديد */}
  <Button
    className="bg-[#25D366] hover:bg-[#20BD5A] text-white px-4"
    onClick={() => handleWhatsAppMessage(customer)}
    title="إرسال رسالة واتساب"
  >
    <MessageSquare className="w-5 h-5" />
  </Button>

  <Button
    variant="outline"
    className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
    onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
  >
    <Eye className="w-4 h-4 ml-2" />
    {isExpanded ? 'إخفاء السجل' : 'عرض السجل'}
  </Button>
  
  <Button
    variant="outline"
    className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
    onClick={() => {
      setSelectedCustomer(customer);
      setIsAddNoteOpen(true);
    }}
  >
    <PlusCircle className="w-4 h-4 ml-2" />
    إضافة ملاحظة
  </Button>
  
  <Button variant="ghost" size="icon">
    <MoreHorizontal className="w-5 h-5" />
  </Button>
</div>
```

---

## 🎯 4. فلتر الأولوية الذكي

### تحديث filteredCustomers

```typescript
// استبدل useMemo الخاص بـ filteredCustomers (حوالي السطر 223)
const filteredCustomers = useMemo(() => {
  let filtered = customers;

  // البحث
  if (searchTerm) {
    filtered = filtered.filter(c =>
      `${c.first_name_ar} ${c.last_name_ar}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.customer_code?.includes(searchTerm)
    );
  }

  // ✅ فلتر الأولوية الجديد
  if (priorityFilter !== 'all') {
    filtered = filtered.filter(customer => {
      const contract = getCustomerContract(customer.id);
      const lastContactDays = getLastContactDays(customer.id);
      const daysToExpiry = contract ? differenceInDays(new Date(contract.end_date), new Date()) : null;

      switch (priorityFilter) {
        case 'urgent':
          return (lastContactDays && lastContactDays > 7 && daysToExpiry && daysToExpiry <= 30);
        
        case 'needs_call':
          return (!lastContactDays || lastContactDays >= 3);
        
        case 'expiring_soon':
          return (daysToExpiry && daysToExpiry > 0 && daysToExpiry <= 14);
        
        case 'not_contacted':
          return lastContactDays === null;
        
        case 'active_followup':
          return getCustomerFollowUps(customer.id).length > 0;
        
        default:
          return true;
      }
    });
  }

  // الفلاتر الموجودة
  if (statusFilter !== 'all') {
    const customerContracts = contracts.filter(ct => 
      filtered.some(c => c.id === ct.customer_id)
    );

    if (statusFilter === 'active') {
      const activeCustomerIds = customerContracts
        .filter(ct => ct.status === 'active')
        .map(ct => ct.customer_id);
      filtered = filtered.filter(c => activeCustomerIds.includes(c.id));
    } else if (statusFilter === 'expiring') {
      const expiringCustomerIds = customerContracts
        .filter(ct => {
          const daysToExpiry = differenceInDays(new Date(ct.end_date), new Date());
          return daysToExpiry > 0 && daysToExpiry <= 30;
        })
        .map(ct => ct.customer_id);
      filtered = filtered.filter(c => expiringCustomerIds.includes(c.id));
    }
  }

  // ✅ ترتيب ذكي
  filtered.sort((a, b) => {
    const aLastContact = getLastContactDays(a.id) || 999;
    const bLastContact = getLastContactDays(b.id) || 999;
    const aContract = getCustomerContract(a.id);
    const bContract = getCustomerContract(b.id);
    const aDaysToExpiry = aContract ? differenceInDays(new Date(aContract.end_date), new Date()) : 999;
    const bDaysToExpiry = bContract ? differenceInDays(new Date(bContract.end_date), new Date()) : 999;

    const aScore = aLastContact + (aDaysToExpiry <= 30 ? -50 : 0);
    const bScore = bLastContact + (bDaysToExpiry <= 30 ? -50 : 0);
    
    return bScore - aScore;
  });

  return filtered;
}, [customers, searchTerm, statusFilter, priorityFilter, contracts, followUps]);
```

### إضافة Select للفلتر

```typescript
// في قسم الفلاتر (حوالي السطر 590)
<div className="flex gap-3 flex-wrap">
  {/* ✅ فلتر الأولوية الجديد */}
  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
    <SelectTrigger className="w-48">
      <SelectValue placeholder="حسب الأولوية" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">جميع العملاء</SelectItem>
      <SelectItem value="urgent">⚡ عاجل</SelectItem>
      <SelectItem value="needs_call">📞 يحتاج اتصال</SelectItem>
      <SelectItem value="expiring_soon">📅 ينتهي قريباً</SelectItem>
      <SelectItem value="not_contacted">❓ لم يتم الاتصال به</SelectItem>
      <SelectItem value="active_followup">✅ لديه متابعات</SelectItem>
    </SelectContent>
  </Select>

  {/* الفلاتر الموجودة */}
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    {/* ... */}
  </Select>

  <Select value={timeFilter} onValueChange={setTimeFilter}>
    {/* ... */}
  </Select>

  {/* ✅ عداد النتائج */}
  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
    <span className="text-sm text-gray-600">النتائج:</span>
    <span className="text-lg font-bold text-gray-900">{filteredCustomers.length}</span>
  </div>
</div>
```

---

## 🔧 5. إصلاح النصوص المكررة

### تحديث قسم عرض المتابعات

```typescript
// استبدل قسم "آخر المتابعات" (حوالي السطر 746)
{customerFollowUps.length > 0 && (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <FileText className="w-4 h-4 text-green-600" />
      آخر المتابعات
    </h4>
    <div className="space-y-2">
      {/* ✅ فلترة الملاحظات المكتملة فقط */}
      {customerFollowUps
        .filter(f => !f.is_important)
        .slice(0, 2)
        .map((followUp) => {
          const Icon = getFollowUpIcon(followUp.note_type);
          return (
            <div key={followUp.id} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getFollowUpColor(followUp.note_type)}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">
                    {format(new Date(followUp.created_at), 'yyyy-MM-dd')}:
                  </span>{' '}
                  {followUp.content?.slice(0, 100)}
                  {followUp.content && followUp.content.length > 100 ? '...' : ''}
                </p>
              </div>
            </div>
          );
        })}
      
      {/* ✅ رسالة إذا لم توجد متابعات مكتملة */}
      {customerFollowUps.filter(f => !f.is_important).length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>لا توجد متابعات مكتملة بعد</p>
        </div>
      )}
    </div>
  </div>
)}

{/* ✅ تنبيه للملاحظات غير المكتملة */}
{customerFollowUps.filter(f => f.is_important).length > 0 && (
  <div className="bg-orange-50 border-r-4 border-orange-500 rounded-lg p-4 mt-3">
    <div className="flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-orange-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-orange-900">
          {customerFollowUps.filter(f => f.is_important).length} متابعة تحتاج تحديث
        </p>
        <p className="text-xs text-orange-700">
          يرجى إكمال تفاصيل المكالمات السابقة
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-orange-500 text-orange-600"
        onClick={() => setExpandedCustomer(customer.id)}
      >
        عرض وتحديث
      </Button>
    </div>
  </div>
)}
```

---

## 📦 6. تثبيت المكتبات الجديدة

```bash
# إذا أردت إضافة اختصارات لوحة المفاتيح
npm install react-hotkeys-hook
# أو
pnpm add react-hotkeys-hook
```

---

## ✅ نصائح التنفيذ

1. **ابدأ بـ CallDialog:** هو الأهم والأكثر تأثيراً
2. **اختبر كل ميزة:** قبل الانتقال للتالية
3. **استخدم Git Commits:** بعد كل ميزة
4. **راجع الـ Console:** للتأكد من عدم وجود أخطاء

---

**ملف مرجعي سريع - للخطة الكاملة راجع `PLAN_CRM_IMPROVEMENTS.md`**

