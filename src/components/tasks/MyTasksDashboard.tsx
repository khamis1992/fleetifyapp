import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useUpcomingReminders } from '@/hooks/usePersonalReminders';
import { useActiveGoals } from '@/hooks/useUserGoals';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import {
  Clock,
  AlertTriangle,
  Calendar,
  Target,
  Bell,
  ListTodo,
  Flame,
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

const taskTheme = systemColorPattern.colors;

export const MyTasksDashboard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.profile?.id;

  const { data: myTasks = [], isLoading: tasksLoading } = useTasks({
    assigned_to: userId,
    status: ['pending', 'in_progress'],
  });
  const { data: reminders = [], isLoading: remindersLoading } = useUpcomingReminders(5);
  const { data: goals = [], isLoading: goalsLoading } = useActiveGoals();

  const todayTasks = myTasks.filter((task) => task.due_date && isToday(parseISO(task.due_date)));
  const overdueTasks = myTasks.filter((task) => {
    if (!task.due_date) return false;
    return isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  });
  const inProgressTasks = myTasks.filter((task) => task.status === 'in_progress');
  const urgentTasks = myTasks.filter((task) => task.priority === 'urgent');

  const goalsProgress = goals.length > 0
    ? Math.round(
        goals.reduce((acc, goal) => acc + (goal.current_count / goal.target_count) * 100, 0) / goals.length
      )
    : 0;

  const isLoading = tasksLoading || remindersLoading || goalsLoading;

  const statsCards = [
    {
      title: 'مهام اليوم',
      value: todayTasks.length,
      icon: Calendar,
      color: taskTheme.info,
      caption: 'مستحقة اليوم',
    },
    {
      title: 'قيد التنفيذ',
      value: inProgressTasks.length,
      icon: Clock,
      color: taskTheme.focus,
      caption: 'تحتاج متابعة',
    },
    {
      title: 'متأخرة',
      value: overdueTasks.length,
      icon: AlertTriangle,
      color: taskTheme.alert,
      caption: 'تجاوزت الموعد',
      highlight: overdueTasks.length > 0,
    },
    {
      title: 'تقدم الأهداف',
      value: `${goalsProgress}%`,
      icon: Target,
      color: taskTheme.success,
      caption: 'متوسط الإنجاز',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  'rounded-lg border bg-white shadow-sm',
                  stat.highlight && 'ring-2 ring-[#FB6B7A]/25'
                )}
                style={{ borderColor: taskTheme.border }}
              >
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: taskTheme.secondaryText }}>{stat.title}</p>
                    <p className="mt-1 text-2xl font-bold" style={{ color: taskTheme.text }}>{stat.value}</p>
                    <p className="mt-1 text-xs" style={{ color: taskTheme.secondaryText }}>{stat.caption}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: `${stat.color}14`, color: stat.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewCard icon={ListTodo} title="مهام اليوم" subtitle={`${todayTasks.length} مهمة`}>
          {todayTasks.length === 0 ? (
            <EmptyText text="لا توجد مهام مستحقة اليوم" />
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        task.priority === 'urgent'
                          ? taskTheme.alert
                          : task.priority === 'high'
                          ? '#F59E0B'
                          : task.priority === 'medium'
                          ? taskTheme.info
                          : '#94A3B8',
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#020617]">{task.title}</span>
                  {task.status === 'in_progress' && (
                    <Badge className="rounded-md bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/10">جاري</Badge>
                  )}
                </div>
              ))}
              {todayTasks.length > 3 && <MoreText count={todayTasks.length - 3} label="مهام أخرى" />}
            </div>
          )}
        </OverviewCard>

        <OverviewCard icon={Bell} title="تذكيرات قادمة" subtitle={`${reminders.length} تذكير`}>
          {reminders.length === 0 ? (
            <EmptyText text="لا توجد تذكيرات قادمة" />
          ) : (
            <div className="space-y-2">
              {reminders.slice(0, 3).map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-2 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#020617]">{reminder.title}</span>
                  {reminder.reminder_time && (
                    <span className="text-xs text-slate-500">
                      {format(parseISO(reminder.reminder_time), 'HH:mm', { locale: ar })}
                    </span>
                  )}
                </div>
              ))}
              {reminders.length > 3 && <MoreText count={reminders.length - 3} label="تذكيرات أخرى" />}
            </div>
          )}
        </OverviewCard>

        <OverviewCard icon={Target} title="تقدم الأهداف" subtitle={`${goals.length} هدف نشط`}>
          {goals.length === 0 ? (
            <EmptyText text="لا توجد أهداف نشطة" />
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 3).map((goal) => {
                const percentage = Math.round((goal.current_count / goal.target_count) * 100);
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-[#020617]">{goal.title}</span>
                      <span className="text-xs text-slate-500">
                        {goal.current_count}/{goal.target_count}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
              {goals.length > 3 && <MoreText count={goals.length - 3} label="أهداف أخرى" />}
            </div>
          )}
        </OverviewCard>
      </div>

      {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-white p-4 shadow-sm"
          style={{ borderColor: `${taskTheme.alert}55` }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${taskTheme.alert}14`, color: taskTheme.alert }}>
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-[#020617]">يتطلب انتباهك</h4>
              <p className="mt-1 text-sm text-slate-600">
                لديك{' '}
                {urgentTasks.length > 0 && <span className="font-semibold text-[#FB6B7A]">{urgentTasks.length} مهمة عاجلة</span>}
                {urgentTasks.length > 0 && overdueTasks.length > 0 && ' و '}
                {overdueTasks.length > 0 && <span className="font-semibold text-[#FB6B7A]">{overdueTasks.length} مهمة متأخرة</span>}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

function OverviewCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border bg-white shadow-sm" style={{ borderColor: taskTheme.border }}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6F8FB] text-[#38BDF8]">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-[#020617]">{title}</h3>
          </div>
          <span className="text-xs text-slate-500">{subtitle}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#F6F8FB] py-6 text-center text-sm text-slate-400">{text}</p>;
}

function MoreText({ count, label }: { count: number; label: string }) {
  return <p className="text-center text-xs text-slate-400">+{count} {label}</p>;
}

export default MyTasksDashboard;
