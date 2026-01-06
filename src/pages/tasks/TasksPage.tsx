import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Kanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Sparkles,
  MoreVertical,
  Loader2,
  X,
  Bell,
  Target,
  StickyNote,
  ListTodo,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type ViewMode = 'kanban' | 'list' | 'grid';
type TabType = 'all' | 'my-tasks' | 'reminders' | 'goals' | 'notes';

const priorityColors = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors = {
  pending: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  on_hold: 'bg-yellow-500',
};

const statusLabels = {
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  on_hold: 'متوقفة',
};

export default function TasksPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<TabType>('my-tasks');
  const [viewMode, setViewMode] = React.useState<ViewMode>('kanban');
  const [filters, setFilters] = React.useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [showTaskForm, setShowTaskForm] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);

  // Apply "my tasks" filter when on my-tasks tab
  const effectiveFilters = React.useMemo(() => {
    if (activeTab === 'my-tasks') {
      return { ...filters, assigned_to: user?.profile?.id };
    }
    return filters;
  }, [activeTab, filters, user?.profile?.id]);

  const { data: tasks = [], isLoading, refetch } = useTasks({
    ...effectiveFilters,
    search: searchQuery || undefined,
  });
  const { data: stats } = useTaskStatistics();
  const { data: teamMembers = [] } = useTeamMembers();
  const deleteTask = useDeleteTask();

  const handleDeleteTask = async () => {
    if (taskToDelete) {
      await deleteTask.mutateAsync(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof TaskFilters]);

  // Statistics Cards
  const statsCards = [
    {
      title: 'إجمالي المهام',
      value: stats?.total || 0,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'قيد التنفيذ',
      value: stats?.byStatus.in_progress || 0,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'مكتملة',
      value: stats?.byStatus.completed || 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'نسبة الإنجاز',
      value: `${stats?.completionRate || 0}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  const tabItems = [
    { id: 'my-tasks' as TabType, label: 'مهامي', icon: <User className="h-4 w-4" /> },
    { id: 'all' as TabType, label: 'كل المهام', icon: <ListTodo className="h-4 w-4" /> },
    { id: 'reminders' as TabType, label: 'تذكيراتي', icon: <Bell className="h-4 w-4" /> },
    { id: 'goals' as TabType, label: 'أهدافي', icon: <Target className="h-4 w-4" /> },
    { id: 'notes' as TabType, label: 'ملاحظات', icon: <StickyNote className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-coral-500" />
              إدارة المهام
            </h1>
            <p className="text-neutral-500 mt-1">تتبع وإدارة مهامك وأهدافك</p>
          </div>

          <Button
            onClick={() => {
              setEditingTask(null);
              setShowTaskForm(true);
            }}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة مهمة
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="w-full md:w-auto bg-white/80 backdrop-blur-xl border border-gray-200/50 p-1 h-auto flex-wrap rounded-3xl">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white px-4 py-2 rounded-2xl data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* My Tasks Tab */}
          <TabsContent value="my-tasks" className="mt-6 space-y-6">
            {/* My Dashboard */}
            <MyTasksDashboard />

            {/* Tasks Section */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-xl p-1.5">
                      <ListTodo className="h-5 w-5 text-white" />
                    </div>
                    مهامي
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('kanban')}
                      >
                        <Kanban className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderTasksContent(tasks, isLoading, viewMode, hasActiveFilters, handleTaskClick, handleEditTask, setTaskToDelete, setEditingTask, setShowTaskForm)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Tasks Tab */}
          <TabsContent value="all" className="mt-6 space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsCards.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-neutral-500">{stat.title}</p>
                          <p className={cn('text-2xl font-bold mt-1', stat.color)}>{stat.value}</p>
                        </div>
                        <div className={cn('p-3 rounded-xl', stat.bgColor, stat.color)}>
                          {stat.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Filters & Search */}
            <Card className="bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="ابحث عن مهمة..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  {/* Quick Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={filters.status as string || 'all'}
                      onValueChange={(value) =>
                        setFilters({ ...filters, status: value === 'all' ? undefined : value as Task['status'] })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                        <SelectItem value="on_hold">متوقفة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={filters.priority as string || 'all'}
                      onValueChange={(value) =>
                        setFilters({ ...filters, priority: value === 'all' ? undefined : value as Task['priority'] })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="الأولوية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأولويات</SelectItem>
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
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="المسؤول" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الموظفين</SelectItem>
                        <SelectItem value={user?.id || ''}>مهامي</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name_ar || member.first_name} {member.last_name_ar || member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 ml-1" />
                        مسح الفلاتر
                      </Button>
                    )}
                  </div>

                  {/* View Mode */}
                  <div className="flex items-center border rounded-lg p-1">
                    <Button
                      variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('kanban')}
                    >
                      <Kanban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Content */}
            <div className="min-h-[500px]">
              {renderTasksContent(tasks, isLoading, viewMode, hasActiveFilters, handleTaskClick, handleEditTask, setTaskToDelete, setEditingTask, setShowTaskForm)}
            </div>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="mt-6">
            <PersonalReminders />
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="mt-6">
            <UserGoals />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-6">
            <QuickNotes />
          </TabsContent>
        </Tabs>

        {/* Task Form Dialog */}
        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          task={editingTask}
          onSuccess={() => {
            refetch();
            setEditingTask(null);
          }}
        />

        {/* Task Details Sheet */}
        <TaskDetailsSheet
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onEdit={handleEditTask}
          onDelete={setTaskToDelete}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذه المهمة؟</AlertDialogTitle>
              <AlertDialogDescription>
                لا يمكن التراجع عن هذا الإجراء. سيتم حذف المهمة نهائياً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Helper function to render tasks content
function renderTasksContent(
  tasks: Task[],
  isLoading: boolean,
  viewMode: ViewMode,
  hasActiveFilters: boolean,
  handleTaskClick: (task: Task) => void,
  handleEditTask: (task: Task) => void,
  setTaskToDelete: (id: string | null) => void,
  setEditingTask: (task: Task | null) => void,
  setShowTaskForm: (show: boolean) => void
) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">لا توجد مهام</h3>
        <p className="text-neutral-500 text-center max-w-md mb-4">
          {hasActiveFilters
            ? 'لا توجد مهام تطابق معايير البحث الحالية'
            : 'ابدأ بإضافة مهمة جديدة لتتبع أعمالك'}
        </p>
        <Button
          onClick={() => {
            setEditingTask(null);
            setShowTaskForm(true);
          }}
          className="bg-gradient-to-r from-teal-500 to-teal-600"
        >
          <Plus className="h-4 w-4 ml-2" />
          إضافة مهمة
        </Button>
      </div>
    );
  }

  if (viewMode === 'kanban') {
    return (
      <TaskKanbanBoard
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onEditTask={handleEditTask}
        onDeleteTask={setTaskToDelete}
      />
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="text-right p-4 font-medium text-neutral-600">المهمة</th>
              <th className="text-right p-4 font-medium text-neutral-600">الحالة</th>
              <th className="text-right p-4 font-medium text-neutral-600">الأولوية</th>
              <th className="text-right p-4 font-medium text-neutral-600">المسؤول</th>
              <th className="text-right p-4 font-medium text-neutral-600">تاريخ الاستحقاق</th>
              <th className="text-right p-4 font-medium text-neutral-600">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="hover:bg-neutral-50 cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <td className="p-4">
                  <div>
                    <p className="font-medium text-neutral-900">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-neutral-500 truncate max-w-xs">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-white',
                      statusColors[task.status]
                    )}
                  >
                    {statusLabels[task.status]}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                    <span className="text-sm">
                      {task.priority === 'urgent' ? 'عاجلة' :
                       task.priority === 'high' ? 'عالية' :
                       task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {task.assignee.first_name_ar || task.assignee.first_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-neutral-400 text-sm">غير معين</span>
                  )}
                </td>
                <td className="p-4">
                  {task.due_date ? (
                    <span className="text-sm">
                      {format(new Date(task.due_date), 'd MMM yyyy', { locale: ar })}
                    </span>
                  ) : (
                    <span className="text-neutral-400 text-sm">-</span>
                  )}
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}>
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setTaskToDelete(task.id); }}
                        className="text-red-600"
                      >
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card
            className="cursor-pointer bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all"
            onClick={() => handleTaskClick(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-neutral-900">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}>
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setTaskToDelete(task.id); }}
                      className="text-red-600"
                    >
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="secondary"
                  className={cn('text-white text-xs', statusColors[task.status])}
                >
                  {statusLabels[task.status]}
                </Badge>
                <div className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-500">
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(task.due_date), 'd MMM', { locale: ar })}
                  </div>
                )}
                {task.assignee && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
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
