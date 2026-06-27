import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Task, useUpdateTaskStatus } from '@/hooks/useTasks';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Pause,
  XCircle,
  MoreHorizontal,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

interface Column {
  id: Task['status'];
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const taskTheme = systemColorPattern.colors;

const columns: Column[] = [
  {
    id: 'pending',
    title: 'معلقة',
    icon: <Circle className="h-4 w-4" />,
    color: '#64748B',
    bgColor: '#F1F5F9',
  },
  {
    id: 'in_progress',
    title: 'قيد التنفيذ',
    icon: <Clock className="h-4 w-4" />,
    color: taskTheme.info,
    bgColor: `${taskTheme.info}14`,
  },
  {
    id: 'on_hold',
    title: 'متوقفة',
    icon: <Pause className="h-4 w-4" />,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  {
    id: 'completed',
    title: 'مكتملة',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: taskTheme.success,
    bgColor: `${taskTheme.success}14`,
  },
  {
    id: 'cancelled',
    title: 'ملغاة',
    icon: <XCircle className="h-4 w-4" />,
    color: taskTheme.alert,
    bgColor: `${taskTheme.alert}14`,
  },
];

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

const TaskCard: React.FC<{
  task: Task;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}> = ({ task, onClick, onEdit, onDelete, isDragging }) => {
  const checklistProgress = React.useMemo(() => {
    if (!task.checklists || task.checklists.length === 0) return null;
    const completed = task.checklists.filter((item) => item.is_completed).length;
    const total = task.checklists.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [task.checklists]);

  const dueDateInfo = React.useMemo(() => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    const isPastDue = isPast(dueDate) && task.status !== 'completed';
    const isDueToday = isToday(dueDate);
    const isDueTomorrow = isTomorrow(dueDate);

    return {
      isPastDue,
      isDueToday,
      label: isPastDue
        ? 'متأخرة'
        : isDueToday
        ? 'اليوم'
        : isDueTomorrow
        ? 'غدًا'
        : format(dueDate, 'd MMM', { locale: ar }),
    };
  }, [task.due_date, task.status]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDragging ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:border-[#38BDF8]',
        isDragging && 'ring-2 ring-[#38BDF8]'
      )}
      style={{ borderColor: taskTheme.border }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-bold text-[#020617]">{task.title}</h4>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-[#F6F8FB]">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-lg border-[#E5EAF1]">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              تعديل
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-[#FB6B7A]"
            >
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-md bg-[#F6F8FB] text-xs text-slate-600">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <Badge variant="secondary" className="rounded-md bg-[#F6F8FB] text-xs text-slate-600">
              +{task.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {checklistProgress && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              المهام الفرعية
            </span>
            <span>{checklistProgress.completed}/{checklistProgress.total}</span>
          </div>
          <Progress value={checklistProgress.percentage} className="h-1.5" />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[#E5EAF1] pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityColors[task.priority] }} />
            {priorityLabels[task.priority]}
          </span>

          {dueDateInfo && (
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: dueDateInfo.isPastDue ? taskTheme.alert : dueDateInfo.isDueToday ? '#F59E0B' : '#64748B' }}
            >
              <Calendar className="h-3.5 w-3.5" />
              {dueDateInfo.label}
              {dueDateInfo.isPastDue && <AlertTriangle className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar className="h-7 w-7">
            <AvatarImage src={task.assignee.avatar_url || ''} />
            <AvatarFallback className="bg-[#F6F8FB] text-xs text-slate-600">
              {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </motion.div>
  );
};

const SortableTaskCard = React.forwardRef<HTMLDivElement, {
  task: Task;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}>(({ task, onClick, onEdit, onDelete }, _ref) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
});
SortableTaskCard.displayName = 'SortableTaskCard';

const KanbanColumn: React.FC<{
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}> = ({ column, tasks, onTaskClick, onEditTask, onDeleteTask }) => {
  return (
    <div
      className="flex h-full min-w-[300px] max-w-[300px] flex-col overflow-hidden rounded-lg border bg-white"
      style={{ borderColor: taskTheme.border }}
    >
      <div className="flex items-center justify-between border-b border-[#E5EAF1] px-3 py-3">
        <div className="flex items-center gap-2 font-bold" style={{ color: column.color }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: column.bgColor }}>
            {column.icon}
          </span>
          <span>{column.title}</span>
        </div>
        <Badge className="rounded-md bg-[#F6F8FB] text-slate-600 hover:bg-[#F6F8FB]">
          {tasks.length}
        </Badge>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#F6F8FB] p-3">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E5EAF1] bg-white px-3 py-8 text-center text-sm text-slate-400">
            لا توجد مهام
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onEditTask,
  onDeleteTask,
}) => {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const updateTaskStatus = useUpdateTaskStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const tasksByStatus = React.useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = tasks.filter((task) => task.status === column.id);
      return acc;
    }, {} as Record<Task['status'], Task[]>);
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((item) => item.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const overColumn = columns.find((column) => column.id === overId);

    if (overColumn) {
      updateTaskStatus.mutate({ taskId, status: overColumn.id });
      return;
    }

    const overTask = tasks.find((task) => task.id === overId);
    const activeTaskStatus = tasks.find((task) => task.id === taskId)?.status;
    if (overTask && overTask.status !== activeTaskStatus) {
      updateTaskStatus.mutate({ taskId, status: overTask.status });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-[560px] gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            onTaskClick={onTaskClick}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            onClick={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskKanbanBoard;
