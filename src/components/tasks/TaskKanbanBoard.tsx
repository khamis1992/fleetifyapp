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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Task, useUpdateTaskStatus } from '@/hooks/useTasks';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Pause,
  XCircle,
  MoreHorizontal,
  MessageSquare,
  CheckSquare,
  Calendar,
  Flag,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

const columns: Column[] = [
  {
    id: 'pending',
    title: 'معلقة',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  {
    id: 'in_progress',
    title: 'قيد التنفيذ',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'on_hold',
    title: 'متوقفة',
    icon: <Pause className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    id: 'completed',
    title: 'مكتملة',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'cancelled',
    title: 'ملغاة',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
];

const priorityColors = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const priorityLabels = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

// Task Card Component
const TaskCard: React.FC<{
  task: Task;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}> = ({ task, onClick, onEdit, onDelete, isDragging }) => {
  const checklistProgress = React.useMemo(() => {
    if (!task.checklists || task.checklists.length === 0) return null;
    const completed = task.checklists.filter(c => c.is_completed).length;
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
      date: dueDate,
      isPastDue,
      isDueToday,
      isDueTomorrow,
      label: isPastDue
        ? 'متأخرة'
        : isDueToday
        ? 'اليوم'
        : isDueTomorrow
        ? 'غداً'
        : format(dueDate, 'd MMM', { locale: ar }),
    };
  }, [task.due_date, task.status]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'bg-white rounded-xl border border-neutral-200 p-4 cursor-pointer hover:shadow-md transition-all',
        isDragging && 'shadow-lg ring-2 ring-coral-500'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-neutral-900 truncate">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-neutral-500 line-clamp-2 mt-1">{task.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              تعديل
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-red-600"
            >
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs bg-neutral-100">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-neutral-100">
              +{task.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Checklist Progress */}
      {checklistProgress && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              المهام الفرعية
            </span>
            <span>{checklistProgress.completed}/{checklistProgress.total}</span>
          </div>
          <Progress value={checklistProgress.percentage} className="h-1.5" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <div className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
            <span className="text-xs text-neutral-500">{priorityLabels[task.priority]}</span>
          </div>

          {/* Due Date */}
          {dueDateInfo && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                dueDateInfo.isPastDue
                  ? 'text-red-600'
                  : dueDateInfo.isDueToday
                  ? 'text-orange-600'
                  : 'text-neutral-500'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>{dueDateInfo.label}</span>
              {dueDateInfo.isPastDue && <AlertTriangle className="h-3 w-3" />}
            </div>
          )}
        </div>

        {/* Assignee */}
        {task.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee.avatar_url || ''} />
            <AvatarFallback className="text-xs bg-coral-100 text-coral-700">
              {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </motion.div>
  );
};

// Sortable Task Card
const SortableTaskCard: React.FC<{
  task: Task;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ task, onClick, onEdit, onDelete }) => {
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
};

// Kanban Column
const KanbanColumn: React.FC<{
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}> = ({ column, tasks, onTaskClick, onEditTask, onDeleteTask }) => {
  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[300px]">
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 rounded-t-xl',
          column.bgColor
        )}
      >
        <div className={cn('flex items-center gap-2', column.color)}>
          {column.icon}
          <span className="font-medium">{column.title}</span>
        </div>
        <Badge variant="secondary" className={cn('rounded-full', column.bgColor, column.color)}>
          {tasks.length}
        </Badge>
      </div>

      {/* Tasks */}
      <div className="flex-1 bg-neutral-50 rounded-b-xl p-3 space-y-3 overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
          <div className="text-center py-8 text-neutral-400 text-sm">
            لا توجد مهام
          </div>
        )}
      </div>
    </div>
  );
};

// Main Kanban Board
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
      acc[column.id] = tasks.filter(task => task.status === column.id);
      return acc;
    }, {} as Record<Task['status'], Task[]>);
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find the column the task was dropped into
    const overColumn = columns.find(col => col.id === overId);
    if (overColumn) {
      // Dropped directly on a column
      updateTaskStatus.mutate({ taskId, status: overColumn.id });
      return;
    }

    // Find the column of the task that was dropped over
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && overTask.status !== tasks.find(t => t.id === taskId)?.status) {
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
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
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

