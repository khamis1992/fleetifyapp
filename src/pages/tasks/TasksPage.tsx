import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskKanbanBoard } from '@/components/tasks/TaskKanbanBoard';
import { TaskDetailsSheet } from '@/components/tasks/TaskDetailsSheet';
import { PersonalReminders } from '@/components/tasks/PersonalReminders';
import { UserGoals } from '@/components/tasks/UserGoals';
import { QuickNotes } from '@/components/tasks/QuickNotes';
import { MyTasksDashboard } from '@/components/tasks/MyTasksDashboard';
import { VerificationTasksList } from '@/components/tasks/VerificationTasksList';
import {
  useTasks,
  useDeleteTask,
  useTaskStatistics,
  useTeamMembers,
  Task,
  TaskFilters,
} from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Kanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  MoreVertical,
  Loader2,
  X,
  Bell,
  Target,
  StickyNote,
  ListTodo,
  User,
  ClipboardCheck,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type ViewMode = 'kanban' | 'list' | 'grid';
type TabType = 'all' | 'my-tasks' | 'reminders' | 'goals' | 'notes' | 'verification';

const taskTheme = systemColorPattern.colors;

const priorityColors: Record<Task['priority'], string> = {
  low: '#94A3B8',
  medium: taskTheme.info,
  high: '#F59E0B',
  urgent: taskTheme.alert,
};

const priorityLabels: Record<Task['priority'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const statusLabels: Record<Task['status'], string> = {
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  on_hold: 'متوقفة',
};

const statusStyles: Record<Task['status'], { color: string; bg: string }> = {
  pending: { color: '#64748B', bg: '#F1F5F9' },
  in_progress: { color: taskTheme.info, bg: `${taskTheme.info}14` },
  completed: { color: taskTheme.success, bg: `${taskTheme.success}14` },
  cancelled: { color: taskTheme.alert, bg: `${taskTheme.alert}14` },
  on_hold: { color: '#F59E0B', bg: '#FFFBEB' },
};

export default function TasksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = React.useState<TabType>(tabFromUrl || 'my-tasks');
  const [viewMode, setViewMode] = React.useState<ViewMode>('kanban');
  const [filters, setFilters] = React.useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showTaskForm, setShowTaskForm] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [activeTab, tabFromUrl]);

  const handleTabChange = (value: string) => {
    const nextTab = value as TabType;
    setActiveTab(nextTab);
    setSearchParams(nextTab === 'my-tasks' ? {} : { tab: nextTab });
  };

  const effectiveFilters = React.useMemo(() => {
    if (activeTab === 'my-tasks') {
      return { ...filters, assigned_to: user?.profile?.id };
    }
    return filters;
  }, [activeTab, filters, user?.profile?.id]);

  const { data: tasks = [], isLoading, refetch, isFetching } = useTasks({
    ...effectiveFilters,
    search: searchQuery || undefined,
  });
  const { data: stats } = useTaskStatistics();
  const { data: teamMembers = [] } = useTeamMembers();
  const deleteTask = useDeleteTask();

  const hasActiveFilters = Object.keys(filters).some((key) => filters[key as keyof TaskFilters]);

  const openNewTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    await deleteTask.mutateAsync(taskToDelete);
    setTaskToDelete(null);
  };

  const statsCards = [
    {
      title: 'إجمالي المهام',
      value: stats?.total || 0,
      icon: BarChart3,
      color: taskTheme.info,
      hint: 'كل المهام المسجلة',
    },
    {
      title: 'قيد التنفيذ',
      value: stats?.byStatus.in_progress || 0,
      icon: Clock,
      color: taskTheme.focus,
      hint: 'مهام نشطة الآن',
    },
    {
      title: 'مكتملة',
      value: stats?.byStatus.completed || 0,
      icon: CheckCircle2,
      color: taskTheme.success,
      hint: 'تم إغلاقها',
    },
    {
      title: 'نسبة الإنجاز',
      value: `${stats?.completionRate || 0}%`,
      icon: TrendingUp,
      color: taskTheme.alert,
      hint: 'من إجمالي المهام',
    },
  ];

  const tabItems = [
    { id: 'my-tasks' as TabType, label: 'مهامي', icon: User },
    { id: 'all' as TabType, label: 'كل المهام', icon: ListTodo },
    { id: 'verification' as TabType, label: 'مهام التدقيق', icon: ClipboardCheck },
    { id: 'reminders' as TabType, label: 'تذكيراتي', icon: Bell },
    { id: 'goals' as TabType, label: 'أهدافي', icon: Target },
    { id: 'notes' as TabType, label: 'ملاحظات', icon: StickyNote },
  ];

  const commonRenderProps = {
    tasks,
    isLoading,
    viewMode,
    hasActiveFilters,
    onTaskClick: setSelectedTask,
    onEditTask: (task: Task) => {
      setEditingTask(task);
      setShowTaskForm(true);
    },
    onDeleteTask: setTaskToDelete,
    onCreateTask: openNewTask,
  };

  return (
    <div className="tasks-system min-h-screen" dir="rtl" style={{ backgroundColor: taskTheme.innerSurface }}>
      <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
        <section className="rounded-lg border bg-white p-4 shadow-sm md:p-5" style={{ borderColor: taskTheme.border }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold" style={{ backgroundColor: `${taskTheme.info}14`, color: taskTheme.info }}>
                <Sparkles className="h-4 w-4" />
                مركز العمل
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-normal md:text-3xl" style={{ color: taskTheme.text }}>
                  إدارة المهام
                </h1>
                <p className="mt-1 max-w-3xl text-sm md:text-base" style={{ color: taskTheme.secondaryText }}>
                  متابعة موحدة للمهام اليومية، التذكيرات، الأهداف، والملاحظات مع فلاتر أسرع وعرض أوضح للفريق.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="h-11 gap-2 rounded-lg border-[#E5EAF1] bg-white"
                disabled={isFetching}
              >
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                تحديث
              </Button>
              <Button
                onClick={openNewTask}
                className="h-11 gap-2 rounded-lg text-white"
                style={{ backgroundColor: taskTheme.info }}
              >
                <Plus className="h-4 w-4" />
                مهمة جديدة
              </Button>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border bg-white p-2 shadow-sm md:grid-cols-3 xl:grid-cols-6" style={{ borderColor: taskTheme.border }}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-11 gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#38BDF8] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="my-tasks" className="mt-5 space-y-5">
            <MyTasksDashboard />
            <TaskPanel title="مهامي الحالية" subtitle="اسحب المهمة بين الأعمدة أو افتح التفاصيل من البطاقة.">
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} modes={['kanban', 'list']} />
              <TasksContent {...commonRenderProps} />
            </TaskPanel>
          </TabsContent>

          <TabsContent value="all" className="mt-5 space-y-5">
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
                    <Card className="rounded-lg border bg-white shadow-sm" style={{ borderColor: taskTheme.border }}>
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <p className="text-sm font-medium" style={{ color: taskTheme.secondaryText }}>{stat.title}</p>
                          <p className="mt-1 text-2xl font-bold" style={{ color: taskTheme.text }}>{stat.value}</p>
                          <p className="mt-1 text-xs" style={{ color: taskTheme.secondaryText }}>{stat.hint}</p>
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

            <Card className="rounded-lg border bg-white shadow-sm" style={{ borderColor: taskTheme.border }}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: taskTheme.text }}>
                  <SlidersHorizontal className="h-4 w-4" />
                  البحث والتصفية
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="ابحث بعنوان المهمة أو الوصف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 rounded-lg border-[#E5EAF1] bg-[#F6F8FB] pr-10"
                    />
                  </div>
                  <ViewModeToggle viewMode={viewMode} onChange={setViewMode} modes={['kanban', 'list', 'grid']} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[180px_180px_220px_auto]">
                  <Select
                    value={(filters.status as string) || 'all'}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value === 'all' ? undefined : value as Task['status'] })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-lg border-[#E5EAF1] bg-white">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="pending">معلقة</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                      <SelectItem value="on_hold">متوقفة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={(filters.priority as string) || 'all'}
                    onValueChange={(value) =>
                      setFilters({ ...filters, priority: value === 'all' ? undefined : value as Task['priority'] })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-lg border-[#E5EAF1] bg-white">
                      <SelectValue placeholder="الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأولويات</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="low">منخفضة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.assigned_to || 'all'}
                    onValueChange={(value) =>
                      setFilters({ ...filters, assigned_to: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-lg border-[#E5EAF1] bg-white">
                      <SelectValue placeholder="المسؤول" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الموظفين</SelectItem>
                      {user?.profile?.id && <SelectItem value={user.profile.id}>مهامي</SelectItem>}
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name_ar || member.first_name} {member.last_name_ar || member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(hasActiveFilters || searchQuery) && (
                    <Button variant="outline" onClick={clearFilters} className="h-11 gap-2 rounded-lg border-[#E5EAF1]">
                      <X className="h-4 w-4" />
                      مسح الفلاتر
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <TaskPanel title="كل المهام" subtitle="عرض موحد للفريق مع الحالات والأولويات.">
              <TasksContent {...commonRenderProps} />
            </TaskPanel>
          </TabsContent>

          <TabsContent value="verification" className="mt-5">
            <VerificationTasksList />
          </TabsContent>

          <TabsContent value="reminders" className="mt-5">
            <PersonalReminders />
          </TabsContent>

          <TabsContent value="goals" className="mt-5">
            <UserGoals />
          </TabsContent>

          <TabsContent value="notes" className="mt-5">
            <QuickNotes />
          </TabsContent>
        </Tabs>

        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          task={editingTask}
          onSuccess={() => {
            refetch();
            setEditingTask(null);
          }}
        />

        <TaskDetailsSheet
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onEdit={(task) => {
            setEditingTask(task);
            setShowTaskForm(true);
          }}
          onDelete={setTaskToDelete}
        />

        <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <AlertDialogContent dir="rtl" className="rounded-lg border-[#E5EAF1]">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المهمة؟</AlertDialogTitle>
              <AlertDialogDescription>
                لا يمكن التراجع عن هذا الإجراء. سيتم حذف المهمة نهائيًا من قائمة العمل.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-lg">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                className="rounded-lg bg-[#FB6B7A] text-white hover:bg-[#ef5162]"
              >
                {deleteTask.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function TaskPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const childrenArray = React.Children.toArray(children);
  const headerAction = childrenArray.length > 1 ? childrenArray[0] : null;
  const content = childrenArray.length > 1 ? childrenArray.slice(1) : childrenArray;

  return (
    <Card className="rounded-lg border bg-white shadow-sm" style={{ borderColor: taskTheme.border }}>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: taskTheme.text }}>{title}</h2>
            <p className="mt-1 text-sm" style={{ color: taskTheme.secondaryText }}>{subtitle}</p>
          </div>
          {headerAction}
        </div>
        {content}
      </CardContent>
    </Card>
  );
}

function ViewModeToggle({
  viewMode,
  onChange,
  modes,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  modes: ViewMode[];
}) {
  const icons = {
    kanban: Kanban,
    list: List,
    grid: LayoutGrid,
  };
  const labels = {
    kanban: 'كانبان',
    list: 'قائمة',
    grid: 'بطاقات',
  };

  return (
    <div className="grid grid-flow-col rounded-lg border bg-[#F6F8FB] p-1" style={{ borderColor: taskTheme.border }}>
      {modes.map((mode) => {
        const Icon = icons[mode];
        return (
          <Button
            key={mode}
            variant="ghost"
            size="sm"
            onClick={() => onChange(mode)}
            className={cn(
              'h-9 gap-2 rounded-md px-3 text-slate-600 hover:bg-white',
              viewMode === mode && 'bg-white text-[#020617] shadow-sm'
            )}
            title={labels[mode]}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{labels[mode]}</span>
          </Button>
        );
      })}
    </div>
  );
}

function TasksContent({
  tasks,
  isLoading,
  viewMode,
  hasActiveFilters,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onCreateTask,
}: {
  tasks: Task[];
  isLoading: boolean;
  viewMode: ViewMode;
  hasActiveFilters: boolean;
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string | null) => void;
  onCreateTask: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-[#E5EAF1] bg-[#F6F8FB]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: taskTheme.info }} />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5EAF1] bg-[#F6F8FB] px-4 py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[#38BDF8] shadow-sm">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold" style={{ color: taskTheme.text }}>لا توجد مهام</h3>
        <p className="mt-2 max-w-md text-sm" style={{ color: taskTheme.secondaryText }}>
          {hasActiveFilters
            ? 'لا توجد مهام تطابق معايير البحث الحالية. جرّب تعديل الفلاتر أو مسحها.'
            : 'ابدأ بإضافة مهمة جديدة حتى تظهر في لوحة المتابعة.'}
        </p>
        {!hasActiveFilters && (
          <Button onClick={onCreateTask} className="mt-5 h-10 gap-2 rounded-lg bg-[#38BDF8] text-white hover:bg-[#0ea5e9]">
            <Plus className="h-4 w-4" />
            إضافة مهمة
          </Button>
        )}
      </div>
    );
  }

  if (viewMode === 'kanban') {
    return (
      <TaskKanbanBoard
        tasks={tasks}
        onTaskClick={onTaskClick}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5EAF1]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-[#F6F8FB]">
              <tr>
                <th className="p-4 text-right text-sm font-semibold text-slate-600">المهمة</th>
                <th className="p-4 text-right text-sm font-semibold text-slate-600">الحالة</th>
                <th className="p-4 text-right text-sm font-semibold text-slate-600">الأولوية</th>
                <th className="p-4 text-right text-sm font-semibold text-slate-600">المسؤول</th>
                <th className="p-4 text-right text-sm font-semibold text-slate-600">الاستحقاق</th>
                <th className="p-4 text-right text-sm font-semibold text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1] bg-white">
              {tasks.map((task) => (
                <tr key={task.id} className="cursor-pointer hover:bg-[#F6F8FB]" onClick={() => onTaskClick(task)}>
                  <td className="p-4">
                    <p className="font-semibold text-[#020617]">{task.title}</p>
                    {task.description && <p className="mt-1 max-w-xs truncate text-sm text-slate-500">{task.description}</p>}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="p-4">
                    <PriorityDot priority={task.priority} />
                  </td>
                  <td className="p-4">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={task.assignee.avatar_url || ''} />
                          <AvatarFallback className="bg-[#F6F8FB] text-xs">
                            {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-[#020617]">{task.assignee.first_name_ar || task.assignee.first_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">غير معين</span>
                    )}
                  </td>
                  <td className="p-4">
                    {task.due_date ? (
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(task.due_date), 'd MMM yyyy', { locale: ar })}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <TaskActions task={task} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            className="cursor-pointer rounded-lg border bg-white shadow-sm transition hover:border-[#38BDF8]"
            style={{ borderColor: taskTheme.border }}
            onClick={() => onTaskClick(task)}
          >
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-[#020617]">{task.title}</h3>
                  {task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}
                </div>
                <TaskActions task={task} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityDot priority={task.priority} />
              </div>

              <div className="flex items-center justify-between border-t border-[#E5EAF1] pt-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {task.due_date ? format(new Date(task.due_date), 'd MMM', { locale: ar }) : 'بدون تاريخ'}
                </span>
                {task.assignee && (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={task.assignee.avatar_url || ''} />
                    <AvatarFallback className="bg-[#F6F8FB] text-xs">
                      {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function TaskActions({
  task,
  onEditTask,
  onDeleteTask,
}: {
  task: Task;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-[#F6F8FB]">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-lg border-[#E5EAF1]">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
          تعديل
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
          className="text-[#FB6B7A]"
        >
          حذف
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusBadge({ status }: { status: Task['status'] }) {
  return (
    <Badge
      variant="secondary"
      className="rounded-md px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: statusStyles[status].bg, color: statusStyles[status].color }}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function PriorityDot({ priority }: { priority: Task['priority'] }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityColors[priority] }} />
      {priorityLabels[priority]}
    </span>
  );
}
