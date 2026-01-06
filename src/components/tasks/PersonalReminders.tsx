import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  usePersonalReminders,
  useCreateReminder,
  useToggleReminder,
  useDeleteReminder,
  PersonalReminder,
  CreateReminderInput,
} from '@/hooks/usePersonalReminders';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Plus,
  Clock,
  Bell,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  CalendarIcon,
  Loader2,
  X,
} from 'lucide-react';

const priorityOptions = [
  { value: 'low', label: 'منخفضة', color: 'bg-gray-400' },
  { value: 'medium', label: 'متوسطة', color: 'bg-blue-500' },
  { value: 'high', label: 'عالية', color: 'bg-orange-500' },
  { value: 'urgent', label: 'عاجلة', color: 'bg-red-500' },
];

interface PersonalRemindersProps {
  compact?: boolean;
  limit?: number;
}

export const PersonalReminders: React.FC<PersonalRemindersProps> = ({
  compact = false,
  limit,
}) => {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [newReminder, setNewReminder] = React.useState<CreateReminderInput>({
    title: '',
    priority: 'medium',
  });
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = React.useState('');

  const { data: reminders = [], isLoading } = usePersonalReminders();
  const createReminder = useCreateReminder();
  const toggleReminder = useToggleReminder();
  const deleteReminder = useDeleteReminder();

  const displayedReminders = limit ? reminders.slice(0, limit) : reminders;

  const handleAddReminder = async () => {
    if (!newReminder.title.trim()) return;

    let reminderTime: string | undefined;
    if (selectedDate) {
      const dateTime = new Date(selectedDate);
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(':');
        dateTime.setHours(parseInt(hours), parseInt(minutes));
      }
      reminderTime = dateTime.toISOString();
    }

    await createReminder.mutateAsync({
      ...newReminder,
      reminder_time: reminderTime,
    });

    setNewReminder({ title: '', priority: 'medium' });
    setSelectedDate(undefined);
    setSelectedTime('');
    setShowAddDialog(false);
  };

  const getReminderTimeLabel = (reminder: PersonalReminder) => {
    if (!reminder.reminder_time) return null;
    
    const date = parseISO(reminder.reminder_time);
    const isPastDue = isPast(date);
    const isDueToday = isToday(date);
    const isDueTomorrow = isTomorrow(date);

    let label = '';
    if (isDueToday) {
      label = `اليوم ${format(date, 'HH:mm')}`;
    } else if (isDueTomorrow) {
      label = `غداً ${format(date, 'HH:mm')}`;
    } else {
      label = format(date, 'd MMM HH:mm', { locale: ar });
    }

    return { label, isPastDue, isDueToday };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-coral-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all', compact && 'border-0 shadow-none')}>
      <CardHeader className={cn('pb-3', compact && 'px-0 pt-0')}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
              <Bell className="h-5 w-5 text-white" />
            </div>
            تذكيراتي
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                {!compact && 'إضافة'}
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  تذكير جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">العنوان *</label>
                  <Input
                    placeholder="مثال: إغلاق 10 فواتير اليوم"
                    value={newReminder.title}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">الوصف</label>
                  <Textarea
                    placeholder="تفاصيل إضافية (اختياري)"
                    value={newReminder.description || ''}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">الأولوية</label>
                    <Select
                      value={newReminder.priority}
                      onValueChange={(value: any) =>
                        setNewReminder({ ...newReminder, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">الوقت</label>
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">التاريخ</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-right',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, 'PPP', { locale: ar })
                          : 'اختر التاريخ'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleAddReminder}
                    disabled={!newReminder.title.trim() || createReminder.isPending}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    {createReminder.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                    إضافة
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'px-0 pb-0')}>
        {displayedReminders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد تذكيرات</p>
            <p className="text-sm">أضف تذكيراً للبدء</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {displayedReminders.map((reminder) => {
                const timeInfo = getReminderTimeLabel(reminder);
                const priority = priorityOptions.find(
                  (p) => p.value === reminder.priority
                );

                return (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border bg-white/80 backdrop-blur-xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all',
                      reminder.is_completed && 'opacity-50'
                    )}
                  >
                    <Checkbox
                      checked={reminder.is_completed}
                      onCheckedChange={(checked) =>
                        toggleReminder.mutate({
                          id: reminder.id,
                          is_completed: !!checked,
                        })
                      }
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'font-medium text-gray-900 truncate',
                          reminder.is_completed && 'line-through text-gray-500'
                        )}
                      >
                        {reminder.title}
                      </p>
                      {reminder.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {reminder.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Priority indicator */}
                      <span
                        className={cn('w-2 h-2 rounded-full', priority?.color)}
                      />

                      {/* Time */}
                      {timeInfo && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            timeInfo.isPastDue && 'bg-red-100 text-red-700',
                            timeInfo.isDueToday && !timeInfo.isPastDue && 'bg-orange-100 text-orange-700'
                          )}
                        >
                          <Clock className="h-3 w-3 ml-1" />
                          {timeInfo.label}
                          {timeInfo.isPastDue && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                        </Badge>
                      )}

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              toggleReminder.mutate({
                                id: reminder.id,
                                is_completed: !reminder.is_completed,
                              })
                            }
                          >
                            <CheckCircle2 className="h-4 w-4 ml-2" />
                            {reminder.is_completed ? 'إلغاء الإكمال' : 'تم'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteReminder.mutate(reminder.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {limit && reminders.length > limit && (
              <p className="text-center text-sm text-gray-500 pt-2">
                +{reminders.length - limit} تذكيرات أخرى
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalReminders;





