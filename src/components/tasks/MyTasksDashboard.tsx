import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks, useTaskStatistics } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useUpcomingReminders } from '@/hooks/usePersonalReminders';
import { useActiveGoals } from '@/hooks/useUserGoals';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  Bell,
  ListTodo,
  Flame,
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

export const MyTasksDashboard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.profile?.id;

  // Fetch my tasks
  const { data: myTasks = [], isLoading: tasksLoading } = useTasks({
    assigned_to: userId,
    status: ['pending', 'in_progress'],
  });

  // Fetch upcoming reminders
  const { data: reminders = [], isLoading: remindersLoading } = useUpcomingReminders(5);

  // Fetch active goals
  const { data: goals = [], isLoading: goalsLoading } = useActiveGoals();

  // Calculate statistics
  const todayTasks = myTasks.filter((task) => {
    if (!task.due_date) return false;
    return isToday(parseISO(task.due_date));
  });

  const overdueTasks = myTasks.filter((task) => {
    if (!task.due_date) return false;
    return isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  });

  const inProgressTasks = myTasks.filter((task) => task.status === 'in_progress');

  const urgentTasks = myTasks.filter((task) => task.priority === 'urgent');

  // Calculate goals progress
  const goalsProgress = goals.length > 0
    ? Math.round(
        goals.reduce((acc, goal) => {
          return acc + (goal.current_count / goal.target_count) * 100;
        }, 0) / goals.length
      )
    : 0;

  const isLoading = tasksLoading || remindersLoading || goalsLoading;

  const statsCards = [
    {
      title: 'مهامي اليوم',
      value: todayTasks.length,
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
    },
    {
      title: 'قيد التنفيذ',
      value: inProgressTasks.length,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'المتأخرة',
      value: overdueTasks.length,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      highlight: overdueTasks.length > 0,
    },
    {
      title: 'تقدم الأهداف',
      value: `${goalsProgress}%`,
      icon: <Target className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={cn(
                'bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all',
                stat.highlight && 'ring-2 ring-red-400 ring-offset-2'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className={cn('text-2xl font-bold mt-1', stat.color)}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn('p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20', 'text-white')}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Tasks */}
        <Card className="bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
                <ListTodo className="h-4 w-4 text-white" />
              </div>
              مهام اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                لا توجد مهام لليوم
              </p>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        task.priority === 'urgent' && 'bg-red-500',
                        task.priority === 'high' && 'bg-orange-500',
                        task.priority === 'medium' && 'bg-blue-500',
                        task.priority === 'low' && 'bg-gray-400'
                      )}
                    />
                    <span className="text-sm truncate flex-1">{task.title}</span>
                    {task.status === 'in_progress' && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        جاري
                      </Badge>
                    )}
                  </div>
                ))}
                {todayTasks.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{todayTasks.length - 3} مهام أخرى
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Reminders */}
        <Card className="bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
                <Bell className="h-4 w-4 text-white" />
              </div>
              تذكيرات قادمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                لا توجد تذكيرات قادمة
              </p>
            ) : (
              <div className="space-y-2">
                {reminders.slice(0, 3).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                  >
                    <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{reminder.title}</span>
                    {reminder.reminder_time && (
                      <span className="text-xs text-gray-500">
                        {format(parseISO(reminder.reminder_time), 'HH:mm', { locale: ar })}
                      </span>
                    )}
                  </div>
                ))}
                {reminders.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{reminders.length - 3} تذكيرات أخرى
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
                <Target className="h-4 w-4 text-white" />
              </div>
              تقدم الأهداف
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                لا توجد أهداف نشطة
              </p>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => {
                  const percentage = Math.round(
                    (goal.current_count / goal.target_count) * 100
                  );
                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{goal.title}</span>
                        <span className="text-xs text-gray-500 mr-2">
                          {goal.current_count}/{goal.target_count}
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-1.5"
                        indicatorClassName={cn(
                          percentage >= 100
                            ? 'bg-green-500'
                            : percentage >= 50
                            ? 'bg-blue-500'
                            : 'bg-orange-500'
                        )}
                      />
                    </div>
                  );
                })}
                {goals.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{goals.length - 3} أهداف أخرى
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Urgent/Overdue Alert */}
      {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-3xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Flame className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-red-900">يتطلب انتباهك</h4>
              <p className="text-sm text-red-700">
                لديك{' '}
                {urgentTasks.length > 0 && (
                  <span className="font-medium">{urgentTasks.length} مهمة عاجلة</span>
                )}
                {urgentTasks.length > 0 && overdueTasks.length > 0 && ' و '}
                {overdueTasks.length > 0 && (
                  <span className="font-medium">{overdueTasks.length} مهمة متأخرة</span>
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MyTasksDashboard;





