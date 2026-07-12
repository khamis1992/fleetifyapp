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
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import {
  Calendar,
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

const taskTheme = systemColorPattern.colors;

const priorityColors = {
  low: '#94A3B8',
  medium: taskTheme.info,
  high: '#F59E0B',
  urgent: taskTheme.alert,
};

const statusLabels = {
  pending: 'معلقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  on_hold: 'متوقفة',
};

const statusStyles = {
  pending: { color: '#64748B', bg: '#F1F5F9' },
  in_progress: { color: taskTheme.info, bg: `${taskTheme.info}14` },
  completed: { color: taskTheme.success, bg: `${taskTheme.success}14` },
  cancelled: { color: taskTheme.alert, bg: `${taskTheme.alert}14` },
  on_hold: { color: '#D97706', bg: '#FFFBEB' },
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
      <SheetContent side="left" className="w-full border-r border-[#E5EAF1] bg-white p-0 sm:max-w-lg overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="border-b border-[#E5EAF1] bg-white p-6 shadow-sm">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge
                  variant="secondary"
                  className="mb-2 rounded-full border-0 px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: statusStyles[task.status].bg,
                    color: statusStyles[task.status].color,
                  }}
                >
                  {statusLabels[task.status]}
                </Badge>
                <SheetTitle className="text-xl font-black text-[#020617]">{task.title}</SheetTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-[#64748B] hover:bg-[#F6F8FB] hover:text-[#38BDF8]"
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
                  className="h-9 w-9 rounded-lg text-[#64748B] hover:bg-[#FB6B7A14] hover:text-[#FB6B7A]"
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
        <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-[#64748B]">الوصف</h4>
              <p className="whitespace-pre-wrap rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3 text-sm leading-6 text-[#020617]">{task.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
                <Flag className="h-4 w-4" />
                الأولوية
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityColors[task.priority] }} />
                <span className="font-bold text-[#020617]">{priorityLabels[task.priority]}</span>
              </div>
            </div>

            {/* Category */}
            {task.category && (
              <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
                  <Folder className="h-4 w-4" />
                  التصنيف
                </div>
                <span className="font-bold text-[#020617]">{task.category}</span>
              </div>
            )}

            {/* Due Date */}
            {task.due_date && (
              <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
                  <Calendar className="h-4 w-4" />
                  تاريخ الاستحقاق
                </div>
                <span className="font-bold text-[#020617]">
                  {format(new Date(task.due_date), 'd MMMM yyyy', { locale: ar })}
                </span>
              </div>
            )}

            {/* Assignee */}
            <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
                <User className="h-4 w-4" />
                المسؤول
              </div>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-[#E5EAF1]">
                    <AvatarImage src={task.assignee.avatar_url || ''} />
                    <AvatarFallback className="bg-[#EAF8FE] text-xs font-bold text-[#38BDF8]">
                      {(task.assignee.first_name_ar || task.assignee.first_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-[#020617]">
                    {task.assignee.first_name_ar || task.assignee.first_name}{' '}
                    {task.assignee.last_name_ar || task.assignee.last_name}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-[#94A3B8]">غير معين</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
                <Tag className="h-4 w-4" />
                الوسوم
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-md border border-[#D7F0FB] bg-[#EAF8FE] text-[#0284C7]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Checklists */}
          {task.checklists && task.checklists.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
                  <CheckSquare className="h-4 w-4" />
                  المهام الفرعية
                </div>
                {checklistProgress && (
                  <span className="text-sm font-bold text-[#64748B]">
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
                      className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition hover:border-[#E5EAF1] hover:bg-[#F6F8FB]"
                    >
                      <Checkbox
                        checked={item.is_completed}
                        onCheckedChange={() => handleToggleChecklist(item.id, item.is_completed)}
                      />
                      <span
                        className={cn(
                          'flex-1',
                          item.is_completed && 'text-[#94A3B8] line-through'
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
            <TabsList className="grid w-full grid-cols-2 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-1">
              <TabsTrigger value="comments" className="flex items-center gap-2 rounded-md text-[#64748B] data-[state=active]:bg-white data-[state=active]:text-[#38BDF8] data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4" />
                التعليقات ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2 rounded-md text-[#64748B] data-[state=active]:bg-white data-[state=active]:text-[#38BDF8] data-[state=active]:shadow-sm">
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
                  className="min-h-[80px] flex-1 rounded-lg border-[#C8D7E8] bg-[#F6F8FB] text-[#020617] placeholder:text-[#38BDF8] focus-visible:ring-[#38BDF8]"
                />
              </div>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addComment.isPending}
                className="h-11 w-full rounded-lg bg-[#38BDF8] font-bold text-white shadow-sm hover:bg-[#0EA5E9]"
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
                  <Loader2 className="h-6 w-6 animate-spin text-[#38BDF8]" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-[#94A3B8]">لا توجد تعليقات بعد</p>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6 border border-[#E5EAF1]">
                            <AvatarImage src={comment.user?.avatar_url || ''} />
                            <AvatarFallback className="bg-[#EAF8FE] text-xs font-bold text-[#38BDF8]">
                              {(comment.user?.first_name_ar || comment.user?.first_name || '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-bold text-[#020617]">
                            {comment.user?.first_name_ar || comment.user?.first_name}{' '}
                            {comment.user?.last_name_ar || comment.user?.last_name}
                          </span>
                          <span className="text-xs font-semibold text-[#94A3B8]">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-[#020617]">{comment.content}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {loadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#38BDF8]" />
                </div>
              ) : activityLog.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-[#94A3B8]">لا يوجد سجل نشاط</p>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#38BDF8]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#020617]">{log.description}</p>
                        <p className="mt-1 text-xs font-semibold text-[#94A3B8]">
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
          <div className="space-y-1 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3 text-xs font-semibold text-[#94A3B8]">
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

