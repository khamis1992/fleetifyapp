/**
 * Bulk Reminders Dialog Component
 * Allows sending bulk reminders to delinquent customers
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  MessageSquare,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSendManualReminders } from '@/hooks/useSendManualReminders';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';

interface BulkRemindersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: DelinquentCustomer[];
  selectedCustomers: DelinquentCustomer[];
}

type Channel = 'whatsapp' | 'email' | 'sms' | 'both';
type FilterType = 'all' | 'critical' | 'high' | 'overdue_30' | 'overdue_60' | 'overdue_90';

const CHANNEL_CONFIG = {
  whatsapp: {
    label: 'واتساب',
    icon: MessageSquare,
    color: 'bg-green-500',
    description: 'إرسال عبر واتساب',
  },
  email: {
    label: 'بريد إلكتروني',
    icon: Mail,
    color: 'bg-blue-500',
    description: 'إرسال عبر البريد الإلكتروني',
  },
  sms: {
    label: 'رسالة نصية',
    icon: MessageSquare,
    color: 'bg-purple-500',
    description: 'إرسال عبر SMS',
  },
  both: {
    label: 'الكل',
    icon: Send,
    color: 'bg-gradient-to-r from-green-500 to-blue-500',
    description: 'إرسال عبر جميع القنوات',
  },
};

const FILTER_CONFIG: Record<FilterType, { label: string; description: string; color: string }> = {
  all: { label: 'الكل', description: 'جميع العملاء المحددين', color: 'bg-slate-500' },
  critical: { label: 'حرج', description: 'العملاء ذوي المخاطر الحرجة', color: 'bg-red-500' },
  high: { label: 'عالي', description: 'العملاء ذوي المخاطر العالية', color: 'bg-orange-500' },
  overdue_30: { label: 'أكثر من 30 يوم', description: 'متأخرين أكثر من 30 يوم', color: 'bg-amber-500' },
  overdue_60: { label: 'أكثر من 60 يوم', description: 'متأخرين أكثر من 60 يوم', color: 'bg-orange-600' },
  overdue_90: { label: 'أكثر من 90 يوم', description: 'متأخرين أكثر من 90 يوم', color: 'bg-red-600' },
};

const REMINDER_TEMPLATES = {
  friendly: {
    label: 'ودي',
    tone: 'friendly' as const,
    template: `مرحباً {customer_name} 👋

نود تذكيركم بأن فاتورتكم متأخرة.
المبلغ المستحق: {amount} ريال قطري

نرجو منكم التكرم بالسداد في أقرب وقت ممكن.

شكراً لتعاونكم 🙏`,
  },
  professional: {
    label: 'رسمي',
    tone: 'professional' as const,
    template: `عزيزي العميل {customer_name}

نود إبلاغكم بأن فاتورتكم متأخرة.
رقم الفاتورة: {invoice_number}
المبلغ المستحق: {amount} ريال قطري
أيام التأخير: {days_overdue} يوم

يرجى السداد فوراً لتجنب رسوم التأخير.

مع الشكر`,
  },
  firm: {
    label: 'حازم',
    tone: 'firm' as const,
    template: `عزيزي العميل {customer_name} ⚠️

تنبيه هام: فاتورتكم متأخرة جداً
المبلغ المستحق: {amount} ريال قطري
أيام التأخير: {days_overdue} يوم

يجب السداد فوراً لتجنب إجراءات إضافية.

الإدارة`,
  },
  urgent: {
    label: 'عاجل',
    tone: 'urgent' as const,
    template: `عزيزي العميل {customer_name} 🚨

إنذار نهائي - فاتورة متأخرة جداً

المبلغ الكلي: {amount} ريال قطري
متأخرة منذ: {days_overdue} يوم

⚠️ في حالة عدم السداد خلال 48 ساعة:
- إجراءات قانونية
- رسوم إضافية

للتواصل: {company_phone}

الإدارة القانونية`,
  },
};

export const BulkRemindersDialog: React.FC<BulkRemindersDialogProps> = ({
  open,
  onOpenChange,
  customers,
  selectedCustomers,
}) => {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof REMINDER_TEMPLATES>('professional');
  const [customMessage, setCustomMessage] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<DelinquentCustomer | null>(null);

  const sendReminders = useSendManualReminders();

  // Filter customers based on selection
  const filteredCustomers = React.useMemo(() => {
    const sourceList = selectedCustomers.length > 0 ? selectedCustomers : customers;

    return sourceList.filter(customer => {
      switch (filterType) {
        case 'all':
          return true;
        case 'critical':
          return customer.risk_level === 'CRITICAL';
        case 'high':
          return customer.risk_level === 'HIGH' || customer.risk_level === 'CRITICAL';
        case 'overdue_30':
          return customer.days_overdue > 30;
        case 'overdue_60':
          return customer.days_overdue > 60;
        case 'overdue_90':
          return customer.days_overdue > 90;
        default:
          return true;
      }
    });
  }, [customers, selectedCustomers, filterType]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    const totalAmount = filteredCustomers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
    const avgDaysOverdue = filteredCustomers.length > 0
      ? Math.round(filteredCustomers.reduce((sum, c) => sum + (c.days_overdue || 0), 0) / filteredCustomers.length)
      : 0;
    const criticalCount = filteredCustomers.filter(c => c.risk_level === 'CRITICAL').length;

    return { totalAmount, avgDaysOverdue, criticalCount };
  }, [filteredCustomers]);

  // Get preview message
  const previewMessage = React.useMemo(() => {
    const template = useCustom ? customMessage : REMINDER_TEMPLATES[selectedTemplate].template;
    const customer = previewCustomer || filteredCustomers[0];

    if (!customer) return template;

    return template
      .replace('{customer_name}', customer.customer_name || '[اسم العميل]')
      .replace('{invoice_number}', customer.contract_number || '[رقم العقد]')
      .replace('{amount}', `${customer.total_debt || 0} ريال قطري`)
      .replace('{days_overdue}', `${customer.days_overdue || 0}`)
      .replace('{company_phone}', '[رقم الشركة]');
  }, [selectedTemplate, customMessage, useCustom, previewCustomer, filteredCustomers]);

  const handleSend = async () => {
    if (filteredCustomers.length === 0) {
      return;
    }

    const contracts = filteredCustomers.map(c => ({
      id: c.contract_id,
      contract_number: c.contract_number || '',
      customer_name: c.customer_name,
      customer_phone: c.phone,
      monthly_rent: c.overdue_amount,
    }));

    await sendReminders.mutateAsync({
      contracts,
      reminderType: selectedTemplate === 'urgent' ? 'escalation' : 'overdue',
      customMessage: useCustom ? customMessage : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <div>إرسال تذكيرات جماعية</div>
              <div className="text-sm font-normal text-slate-500">
                إرسال تذكيرات إلى {filteredCustomers.length} عميل
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-right mr-14">
            اختر القناة ونوع التذكير ومراجعة الرسالة قبل الإرسال
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Channel Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Send className="w-4 h-4" />
              قناة الإرسال
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((key) => {
                const config = CHANNEL_CONFIG[key];
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setChannel(key)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg",
                      channel === key
                        ? "border-rose-500 bg-rose-50 shadow-md"
                        : "border-slate-200 hover:border-rose-300 bg-white"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-semibold">{config.label}</span>
                    </div>
                    {channel === key && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              تصفية العملاء
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {(Object.keys(FILTER_CONFIG) as FilterType[]).map((key) => {
                const config = FILTER_CONFIG[key];
                const count = key === 'all'
                  ? (selectedCustomers.length > 0 ? selectedCustomers.length : customers.length)
                  : customers.filter(c => {
                      switch (key) {
                        case 'critical': return c.risk_level === 'CRITICAL';
                        case 'high': return c.risk_level === 'HIGH' || c.risk_level === 'CRITICAL';
                        case 'overdue_30': return c.days_overdue > 30;
                        case 'overdue_60': return c.days_overdue > 60;
                        case 'overdue_90': return c.days_overdue > 90;
                        default: return true;
                      }
                    }).length;

                return (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    disabled={count === 0}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all duration-300",
                      filterType === key
                        ? "border-rose-500 bg-rose-50"
                        : "border-slate-200 hover:border-rose-300 bg-white",
                      count === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-xs text-slate-600">{config.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-600 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  <span>عدد العملاء</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{filteredCustomers.length}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-600 text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span>إجمالي المستحق</span>
                </div>
                <div className="text-2xl font-bold text-rose-600">
                  {summaryStats.totalAmount.toLocaleString()} ر.ق
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-600 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>متوسط التأخير</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">{summaryStats.avgDaysOverdue} يوم</div>
              </div>
            </div>
            {summaryStats.criticalCount > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                <AlertTriangle className="w-4 h-4" />
                <span>يوجد {summaryStats.criticalCount} حالة حرجة</span>
              </div>
            )}
          </div>

          {/* Message Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              نوع التذكير
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(REMINDER_TEMPLATES) as Array<keyof typeof REMINDER_TEMPLATES>).map((key) => {
                const template = REMINDER_TEMPLATES[key];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTemplate(key);
                      setUseCustom(false);
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-300 text-right",
                      selectedTemplate === key && !useCustom
                        ? "border-rose-500 bg-rose-50"
                        : "border-slate-200 hover:border-rose-300 bg-white"
                    )}
                  >
                    <div className="text-sm font-semibold">{template.label}</div>
                  </button>
                );
              })}
              <button
                onClick={() => setUseCustom(true)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-300 text-right",
                  useCustom
                    ? "border-rose-500 bg-rose-50"
                    : "border-slate-200 hover:border-rose-300 bg-white"
                )}
              >
                <div className="text-sm font-semibold">مخصص</div>
              </button>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              معاينة الرسالة
            </Label>
            {useCustom ? (
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="اكتب رسالتك المخصصة هنا..."
                rows={6}
                className="text-right resize-none"
                dir="rtl"
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 text-right" dir="rtl">
                  {previewMessage}
                </pre>
              </div>
            )}
          </div>

          {/* Customer List Preview */}
          {filteredCustomers.length > 0 && filteredCustomers.length <= 10 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">العملاء الذين سيتم إرسال التذكير</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.customer_id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{customer.customer_name}</div>
                        <div className="text-xs text-slate-500">{customer.contract_number}</div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        customer.risk_level === 'CRITICAL' && "bg-red-100 text-red-700 border-red-200",
                        customer.risk_level === 'HIGH' && "bg-orange-100 text-orange-700 border-orange-200"
                      )}
                    >
                      {customer.days_overdue} يوم
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredCustomers.length > 10 && (
            <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
              سيتم الإرسال إلى {filteredCustomers.length} عميل
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendReminders.isPending}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={filteredCustomers.length === 0 || sendReminders.isPending}
            className="gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
          >
            {sendReminders.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال {filteredCustomers.length} تذكير
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRemindersDialog;
