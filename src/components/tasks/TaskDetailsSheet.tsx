import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Task,
  useTaskComments,
  useAddTaskComment,
  useTaskActivityLog,
  useToggleChecklist,
} from '@/hooks/useTasks';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  User,
  Flag,
  MessageSquare,
  History,
  CheckSquare,
  Edit,
  Trash2,
  Send,
  Loader2,
  Tag,
  Folder,
} from 'lucide-react';

interface TaskDetailsSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityLabels = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const priorityColors = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusLabels = {
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  on_hold: 'متوقفة',
};

const statusColors = {
  pending: 'bg-slate-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  on_hold: 'bg-yellow-500',
};

export const TaskDetailsSheet: React.FC<TaskDetailsSheetProps> = ({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}) => {
  const [newComment, setNewComment] = React.useState('');
  const { data: comments = [], isLoading: loadingComments } = useTaskComments(task?.id);
  const { data: activityLog = [], isLoading: loadingActivity } = useTaskActivityLog(task?.id);
  const addComment = useAddTaskComment();
  const toggleChecklist = useToggleChecklist();

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    await addComment.mutateAsync({
      taskId: task.id,
      content: newComment.trim(),
    });
    setNewComment('');
  };

  const handleToggleChecklist = async (checklistId: string, isCompleted: boolean) => {
    await toggleChecklist.mutateAsync({ checklistId, isCompleted: !isCompleted });
  };

  const checklistProgress = React.useMemo(() => {
    if (!task?.checklists || task.checklists.length === 0) return null;
    const completed = task.checklists.filter(c => c.is_completed).length;
    const total = task.checklists.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [task?.checklists]);

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-l from-rose-500 to-orange-500 p-6">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge
                  variant="secondary"
                  className={cn('text-white mb-2', statusColors[task.status])}
                >
                  {statusLabels[task.status]}
                </Badge>
                <SheetTitle className="text-white text-xl">{task.title}</SheetTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(task);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    onOpenChange(false);
                    onDelete(task.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">الوصف</h4>
              <p className="text-neutral-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                <Flag className="h-4 w-4" />
                الأولوية
              </div>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                <span className="font-medium">{priorityLabels[task.priority]}</span>
              </div>
            </div>

            {/* Category */}
            {task.category && (
              <div className="bg-neutral-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                  <Folder className="h-4 w-4" />
                  التصنيف
                </div>
                <span className="font-medium">{task.category}</span>
              </div>
            )}

            {/* Due Date */}
            {task.due_date && (
              <div className="bg-neutral-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  تاريخ الاستحقاق
                </div>
                <span className="font-medium">
                  {format(new Date(task.due_date), 'd MMMM yyyy', { locale: ar })}
                </span>
              </div>
            )}

            {/* Assignee */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                <User className="h-4 w-4" />
                المسؤول
              </div>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {task.assignee.first_name_ar || task.assignee.first_name}{' '}
                    {task.assignee.last_name_ar || task.assignee.last_name}
                  </span>
                </div>
              ) : (
                <span className="text-neutral-400">غير معين</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-2">
                <Tag className="h-4 w-4" />
                الوسوم
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-rose-100 text-coral-700">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Checklists */}
          {task.checklists && task.checklists.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <CheckSquare className="h-4 w-4" />
                  المهام الفرعية
                </div>
                {checklistProgress && (
                  <span className="text-sm text-neutral-500">
                    {checklistProgress.completed}/{checklistProgress.total}
                  </span>
                )}
              </div>
              {checklistProgress && (
                <Progress value={checklistProgress.percentage} className="h-2 mb-3" />
              )}
              <div className="space-y-2">
                {task.checklists
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50"
                    >
                      <Checkbox
                        checked={item.is_completed}
                        onCheckedChange={() => handleToggleChecklist(item.id, item.is_completed)}
                      />
                      <span
                        className={cn(
                          'flex-1',
                          item.is_completed && 'line-through text-neutral-400'
                        )}
                      >
                        {item.title}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Tabs for Comments & Activity */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                التعليقات ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                السجل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-4 space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="أضف تعليقاً..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[80px]"
                />
              </div>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addComment.isPending}
                className="w-full bg-gradient-to-l from-rose-500 to-orange-500"
              >
                {addComment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                إرسال
              </Button>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-neutral-400 py-8">لا توجد تعليقات بعد</p>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-neutral-50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={comment.user?.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {(comment.user?.first_name_ar || comment.user?.first_name || '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">
                            {comment.user?.first_name_ar || comment.user?.first_name}{' '}
                            {comment.user?.last_name_ar || comment.user?.last_name}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </span>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap">{comment.content}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {loadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                </div>
              ) : activityLog.length === 0 ? (
                <p className="text-center text-neutral-400 py-8">لا يوجد سجل نشاط</p>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-700">{log.description}</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {log.user?.first_name_ar || log.user?.first_name} -{' '}
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                            locale: ar,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Metadata */}
          <div className="text-xs text-neutral-400 space-y-1">
            <p>
              أنشأ بواسطة: {task.creator?.first_name_ar || task.creator?.first_name}{' '}
              {task.creator?.last_name_ar || task.creator?.last_name}
            </p>
            <p>
              تاريخ الإنشاء: {format(new Date(task.created_at), 'd MMMM yyyy - HH:mm', { locale: ar })}
            </p>
            {task.completed_at && (
              <p>
                تاريخ الإكمال: {format(new Date(task.completed_at), 'd MMMM yyyy - HH:mm', { locale: ar })}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailsSheet;

