/**
 * Schedule Calls Dialog Component
 * Allows scheduling follow-up calls with delinquent customers
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
import {
  Phone,
  Calendar,
  Clock,
  X,
  CheckCircle,
  Filter,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { format, addDays, isWeekend } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BulkRemindersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: DelinquentCustomer[];
  selectedCustomers: DelinquentCustomer[];
}

type FilterType = 'all' | 'critical' | 'high' | 'overdue_30' | 'overdue_60' | 'overdue_90';

interface ScheduledCall {
  customerId: string;
  customerName: string;
  contractNumber: string;
  phone: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  priority: 'high' | 'medium' | 'low';
}

const FILTER_CONFIG: Record<FilterType, { label: string; description: string; color: string }> = {
  all: { label: 'الكل', description: 'جميع العملاء المحددين', color: 'bg-slate-500' },
  critical: { label: 'حرج', description: 'العملاء ذوي المخاطر الحرجة', color: 'bg-red-500' },
  high: { label: 'عالي', description: 'العملاء ذوي المخاطر العالية', color: 'bg-orange-500' },
  overdue_30: { label: 'أكثر من 30 يوم', description: 'متأخرين أكثر من 30 يوم', color: 'bg-amber-500' },
  overdue_60: { label: 'أكثر من 60 يوم', description: 'متأخرين أكثر من 60 يوم', color: 'bg-orange-600' },
  overdue_90: { label: 'أكثر من 90 يوم', description: 'متأخرين أكثر من 90 يوم', color: 'bg-red-600' },
};

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export const ScheduleCallsDialog: React.FC<BulkRemindersDialogProps> = ({
  open,
  onOpenChange,
  customers,
  selectedCustomers,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentTime, setCurrentTime] = useState('09:00');
  const [notes, setNotes] = useState('متابعة دفع المتأخرات');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isScheduling, setIsScheduling] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  // Filter customers based on selection
  const filteredCustomers = React.useMemo(() => {
    const sourceList = selectedCustomers.length > 0 ? selectedCustomers : customers;

    return sourceList.filter(customer => {
      // Exclude already scheduled customers
      if (scheduledCalls.some(c => c.customerId === customer.customer_id)) {
        return false;
      }

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
  }, [customers, selectedCustomers, filterType, scheduledCalls]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    const totalAmount = filteredCustomers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
    const avgDaysOverdue = filteredCustomers.length > 0
      ? Math.round(filteredCustomers.reduce((sum, c) => sum + (c.days_overdue || 0), 0) / filteredCustomers.length)
      : 0;
    const criticalCount = filteredCustomers.filter(c => c.risk_level === 'CRITICAL').length;

    return { totalAmount, avgDaysOverdue, criticalCount };
  }, [filteredCustomers]);

  // Add customer to schedule
  const handleScheduleCustomer = (customer: DelinquentCustomer) => {
    const newCall: ScheduledCall = {
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      contractNumber: customer.contract_number || '',
      phone: customer.phone || '',
      scheduledDate: currentDate,
      scheduledTime: currentTime,
      notes,
      priority,
    };

    setScheduledCalls([...scheduledCalls, newCall]);
    toast.success(`تم إضافة ${customer.customer_name} إلى قائمة الجدولة`);
  };

  // Remove customer from schedule
  const handleRemoveCall = (customerId: string) => {
    setScheduledCalls(scheduledCalls.filter(c => c.customerId !== customerId));
  };

  // Schedule all filtered customers at once
  const handleScheduleAll = () => {
    const newCalls: ScheduledCall[] = filteredCustomers.map(customer => ({
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      contractNumber: customer.contract_number || '',
      phone: customer.phone || '',
      scheduledDate: currentDate,
      scheduledTime: currentTime,
      notes,
      priority,
    }));

    setScheduledCalls([...scheduledCalls, ...newCalls]);
    toast.success(`تم إضافة ${newCalls.length} عميل إلى قائمة الجدولة`);
  };

  // Save all scheduled calls to database
  const handleSaveAll = async () => {
    if (!user?.id) {
      toast.error('المستخدم غير مصرح له');
      return;
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    setIsScheduling(true);

    try {
      let successCount = 0;
      let failedCount = 0;

      for (const call of scheduledCalls) {
        try {
          const { error } = await supabase
            .from('customer_communications')
            .insert({
              company_id: profile.company_id,
              customer_id: call.customerId,
              communication_type: 'phone',
              communication_date: call.scheduledDate,
              communication_time: call.scheduledTime,
              notes: call.notes,
              follow_up_scheduled: true,
              follow_up_date: call.scheduledDate,
              follow_up_time: call.scheduledTime,
              follow_up_status: 'pending',
              employee_id: user.id,
              action_required: 'payment',
              action_description: `متابعة دفع المتأخرات - عقد ${call.contractNumber}`,
            });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error scheduling call for ${call.customerName}:`, error);
          failedCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم جدولة ${successCount} مكالمة بنجاح`);
        queryClient.invalidateQueries({ queryKey: ['crm-stats', profile.company_id] });
      }

      if (failedCount > 0) {
        toast.error(`فشل جدولة ${failedCount} مكالمة`);
      }

      if (successCount > 0) {
        setScheduledCalls([]);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving scheduled calls:', error);
      toast.error('حدث خطأ أثناء حفظ جدولة المكالمات');
    } finally {
      setIsScheduling(false);
    }
  };

  // Get next available date (skip weekends)
  const getNextAvailableDate = (daysToAdd: number): string => {
    let date = addDays(new Date(), daysToAdd);
    while (isWeekend(date)) {
      date = addDays(date, 1);
    }
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div>جدولة مكالمات المتابعة</div>
              <div className="text-sm font-normal text-slate-500">
                {scheduledCalls.length} مكالمة مجدولة • {filteredCustomers.length} عميل متاح
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-right mr-14">
            اختر العملاء وحدد التاريخ والوقت لمكالمات المتابعة
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 mt-4">
          {/* Right Column - Customer Selection */}
          <div className="space-y-4">
            {/* Filter Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                تصفية العملاء
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FILTER_CONFIG) as FilterType[]).map((key) => {
                  const config = FILTER_CONFIG[key];
                  const count = key === 'all'
                    ? filteredCustomers.length
                    : customers.filter(c => {
                        // Exclude scheduled
                        if (scheduledCalls.some(sc => sc.customerId === c.customer_id)) return false;

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
                        "relative p-2 rounded-lg border-2 transition-all duration-300",
                        filterType === key
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 bg-white",
                        count === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="text-center">
                        <div className="text-sm font-bold">{count}</div>
                        <div className="text-xs text-slate-600">{config.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduling Options */}
            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                إعدادات الجدولة
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">التاريخ</Label>
                  <Input
                    type="date"
                    value={currentDate}
                    onChange={(e) => setCurrentDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">الوقت</Label>
                  <Select value={currentTime} onValueChange={setCurrentTime}>
                    <SelectTrigger className="text-right">
                      <Clock className="w-4 h-4 ml-2 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">الأولوية</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="text-right">
                    <AlertTriangle className="w-4 h-4 ml-2 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">عالية - للحالات الحرجة</SelectItem>
                    <SelectItem value="medium">متوسطة - للمتابعة الروتينية</SelectItem>
                    <SelectItem value="low">منخفضة - للتنبيهات العامة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات المتابعة..."
                  rows={2}
                  className="text-right resize-none"
                />
              </div>

              <Button
                onClick={handleScheduleAll}
                disabled={filteredCustomers.length === 0}
                className="w-full gap-2 bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="w-4 h-4" />
                إضافة كل العملاء ({filteredCustomers.length})
              </Button>
            </div>

            {/* Customer List */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                العملاء المتاحون ({filteredCustomers.length})
              </Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا يوجد عملاء متاحين</p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.customer_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                        "bg-white hover:bg-blue-50 border-slate-200 hover:border-blue-300"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          customer.risk_level === 'CRITICAL'
                            ? "bg-red-100"
                            : customer.risk_level === 'HIGH'
                              ? "bg-orange-100"
                              : "bg-slate-100"
                        )}>
                          <Users className={cn(
                            "w-5 h-5",
                            customer.risk_level === 'CRITICAL'
                              ? "text-red-600"
                              : customer.risk_level === 'HIGH'
                                ? "text-orange-600"
                                : "text-slate-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{customer.customer_name}</div>
                          <div className="text-xs text-slate-500">
                            {customer.contract_number} • {formatCurrency(customer.total_debt || 0)}
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
                      <Button
                        size="sm"
                        onClick={() => handleScheduleCustomer(customer)}
                        className="mr-2 gap-1 bg-blue-500 hover:bg-blue-600"
                      >
                        <Plus className="w-3 h-3" />
                        إضافة
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Left Column - Scheduled Calls */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              المكالمات المجدولة ({scheduledCalls.length})
            </Label>

            <div className="max-h-[600px] overflow-y-auto space-y-3">
              {scheduledCalls.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <Calendar className="w-16 h-16 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-500 font-medium">لم يتم جدولة أي مكالمات بعد</p>
                  <p className="text-sm text-slate-400 mt-1">اختر العملاء من القائمة اليمنى للبدء</p>
                </div>
              ) : (
                scheduledCalls.map((call) => (
                  <motion.div
                    key={call.customerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "bg-white rounded-xl border-2 overflow-hidden",
                      call.priority === 'high' && "border-red-200",
                      call.priority === 'medium' && "border-amber-200",
                      call.priority === 'low' && "border-slate-200"
                    )}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedCall(expandedCall === call.customerId ? null : call.customerId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            call.priority === 'high' && "bg-red-100",
                            call.priority === 'medium' && "bg-amber-100",
                            call.priority === 'low' && "bg-slate-100"
                          )}>
                            <Phone className={cn(
                              "w-5 h-5",
                              call.priority === 'high' && "text-red-600",
                              call.priority === 'medium' && "text-amber-600",
                              call.priority === 'low' && "text-slate-600"
                            )} />
                          </div>
                          <div>
                            <div className="font-semibold">{call.customerName}</div>
                            <div className="text-xs text-slate-500">{call.contractNumber}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              call.priority === 'high' && "bg-red-100 text-red-700 border-red-200",
                              call.priority === 'medium' && "bg-amber-100 text-amber-700 border-amber-200",
                              call.priority === 'low' && "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {call.priority === 'high' ? 'عالية' : call.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                          </Badge>
                          {expandedCall === call.customerId ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedCall === call.customerId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-slate-100 space-y-2"
                          >
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(call.scheduledDate), 'dd MMM yyyy', { locale: ar })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="w-4 h-4" />
                                <span>{call.scheduledTime}</span>
                              </div>
                            </div>
                            {call.notes && (
                              <div className="text-sm text-slate-600 bg-slate-50 rounded p-2">
                                {call.notes}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCall(call.customerId);
                              }}
                              className="w-full gap-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              إلغاء الجدولة
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Summary Stats */}
            {scheduledCalls.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="text-sm font-semibold text-blue-900 mb-2">ملخص الجدولة</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{scheduledCalls.length}</div>
                    <div className="text-xs text-blue-700">مكالمة</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {scheduledCalls.filter(c => c.priority === 'high').length}
                    </div>
                    <div className="text-xs text-amber-700">عالية الأولوية</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-600">
                      {format(new Date(currentDate), 'dd MMM', { locale: ar })}
                    </div>
                    <div className="text-xs text-slate-700">التاريخ</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setScheduledCalls([]);
              onOpenChange(false);
            }}
            disabled={isScheduling}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            إلغاء
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={scheduledCalls.length === 0 || isScheduling}
            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            {isScheduling ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                حفظ الجدولة ({scheduledCalls.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-US')} ر.ق`;
}

export default ScheduleCallsDialog;
