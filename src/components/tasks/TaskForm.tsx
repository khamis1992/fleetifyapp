import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCreateTask, useUpdateTask, useTeamMembers, Task } from '@/hooks/useTasks';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  Plus,
  X,
  Sparkles,
  User,
  AlertTriangle,
  Clock,
  Flag,
  CheckSquare,
  Loader2,
} from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(3, 'عنوان المهمة يجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.date().optional(),
  start_date: z.date().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSuccess?: () => void;
}

const priorityOptions = [
  { value: 'low', label: 'منخفضة', color: 'bg-gray-500' },
  { value: 'medium', label: 'متوسطة', color: 'bg-blue-500' },
  { value: 'high', label: 'عالية', color: 'bg-orange-500' },
  { value: 'urgent', label: 'عاجلة', color: 'bg-red-500' },
];

const statusOptions = [
  { value: 'pending', label: 'معلقة', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-500' },
  { value: 'completed', label: 'مكتملة', color: 'bg-green-500' },
  { value: 'on_hold', label: 'متوقفة', color: 'bg-yellow-500' },
  { value: 'cancelled', label: 'ملغاة', color: 'bg-red-500' },
];

const categoryOptions = [
  'عقود',
  'مالية',
  'صيانة',
  'عملاء',
  'موارد بشرية',
  'تسويق',
  'أخرى',
];

export const TaskForm: React.FC<TaskFormProps> = ({
  open,
  onOpenChange,
  task,
  onSuccess,
}) => {
  const [checklists, setChecklists] = React.useState<{ title: string }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = React.useState('');
  const [tagInput, setTagInput] = React.useState('');

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: teamMembers = [] } = useTeamMembers();

  const isEditing = !!task;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      assigned_to: task?.assigned_to || '',
      status: task?.status || 'pending',
      priority: task?.priority || 'medium',
      due_date: task?.due_date ? new Date(task.due_date) : undefined,
      start_date: task?.start_date ? new Date(task.start_date) : undefined,
      category: task?.category || '',
      tags: task?.tags || [],
    },
  });

  const tags = form.watch('tags') || [];

  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        due_date: task.due_date ? new Date(task.due_date) : undefined,
        start_date: task.start_date ? new Date(task.start_date) : undefined,
        category: task.category || '',
        tags: task.tags || [],
      });
      setChecklists([]);
    } else {
      form.reset({
        title: '',
        description: '',
        assigned_to: '',
        status: 'pending',
        priority: 'medium',
        due_date: undefined,
        start_date: undefined,
        category: '',
        tags: [],
      });
      setChecklists([]);
    }
  }, [task, form]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({
          id: task.id,
          ...data,
          due_date: data.due_date?.toISOString(),
          start_date: data.start_date?.toISOString(),
        });
      } else {
        await createTask.mutateAsync({
          ...data,
          due_date: data.due_date?.toISOString(),
          start_date: data.start_date?.toISOString(),
          checklists,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklists([...checklists, { title: newChecklistItem.trim() }]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklists(checklists.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      form.setValue('tags', [...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    form.setValue('tags', tags.filter(t => t !== tag));
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="bg-gradient-to-l from-coral-500 to-orange-500 text-white p-4 -m-6 mb-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5" />
            {isEditing ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-700 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-coral-500" />
                    عنوان المهمة *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="أدخل عنوان المهمة"
                      className="text-right"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-700">الوصف</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="أدخل وصف المهمة (اختياري)"
                      className="text-right min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-700 flex items-center gap-2">
                      <Flag className="h-4 w-4 text-coral-500" />
                      الأولوية
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الأولوية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', option.color)} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-700">الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', option.color)} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-coral-500" />
                    تعيين إلى
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف المسؤول" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">بدون تعيين</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {(member.first_name_ar || member.first_name || '?')[0]}
                              </AvatarFallback>
                            </Avatar>
                            {member.first_name_ar || member.first_name} {member.last_name_ar || member.last_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-neutral-700">تاريخ البدء</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-right font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-neutral-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-coral-500" />
                      تاريخ الاستحقاق
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-right font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-700">التصنيف</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">الوسوم</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <AnimatePresence>
                  {tags.map((tag) => (
                    <motion.div
                      key={tag}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 bg-coral-100 text-coral-700"
                      >
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-coral-900"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="أضف وسم"
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Checklists (only for new tasks) */}
            {!isEditing && (
              <Card className="border-dashed">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-coral-500" />
                    قائمة المهام الفرعية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {checklists.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-neutral-50 p-2 rounded-lg"
                    >
                      <span className="text-sm">{item.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChecklistItem(index)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="أضف مهمة فرعية"
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addChecklistItem();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addChecklistItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-l from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600"
              >
                {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'تحديث المهمة' : 'إنشاء المهمة'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;

