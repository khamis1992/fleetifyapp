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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCreateTask, useUpdateTask, useTeamMembers, Task } from '@/hooks/useTasks';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  Plus,
  X,
  User,
  Clock,
  Flag,
  CheckSquare,
  Loader2,
  FileText,
  Tag,
  FolderOpen,
  Sparkles,
  Zap,
  AlertCircle,
  TrendingUp,
  Circle,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ListChecks,
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
  { value: 'low', label: 'منخفضة', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Circle, iconColor: 'text-slate-400' },
  { value: 'medium', label: 'متوسطة', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: TrendingUp, iconColor: 'text-blue-500' },
  { value: 'high', label: 'عالية', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Zap, iconColor: 'text-orange-500' },
  { value: 'urgent', label: 'عاجلة', color: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle, iconColor: 'text-red-500' },
];

const statusOptions = [
  { value: 'pending', label: 'معلقة', color: 'bg-slate-100 text-slate-600', icon: Circle },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-600', icon: PlayCircle },
  { value: 'completed', label: 'مكتملة', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
  { value: 'on_hold', label: 'متوقفة', color: 'bg-yellow-100 text-yellow-600', icon: PauseCircle },
  { value: 'cancelled', label: 'ملغاة', color: 'bg-red-100 text-red-600', icon: XCircle },
];

const categoryOptions = [
  { value: 'عقود', icon: '📄' },
  { value: 'مالية', icon: '💰' },
  { value: 'صيانة', icon: '🔧' },
  { value: 'عملاء', icon: '👥' },
  { value: 'موارد بشرية', icon: '👔' },
  { value: 'تسويق', icon: '📢' },
  { value: 'أخرى', icon: '📌' },
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
  const [activeSection, setActiveSection] = React.useState<'basic' | 'details' | 'subtasks'>('basic');

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
  const selectedPriority = form.watch('priority');
  const selectedStatus = form.watch('status');

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
    setActiveSection('basic');
  }, [task, form, open]);

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

  const sectionTabs = [
    { id: 'basic' as const, label: 'المعلومات الأساسية', icon: FileText },
    { id: 'details' as const, label: 'التفاصيل', icon: Tag },
    ...(!isEditing ? [{ id: 'subtasks' as const, label: 'المهام الفرعية', icon: ListChecks }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-white rounded-3xl" dir="rtl">
        {/* Header */}
        <DialogHeader className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-teal-500 via-teal-600 to-emerald-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative p-6">
            <DialogTitle className="flex items-center gap-3 text-white text-xl font-bold">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="h-6 w-6" />
              </div>
              {isEditing ? 'تعديل المهمة' : 'مهمة جديدة'}
            </DialogTitle>
            <p className="text-teal-100 mt-2 text-sm">
              {isEditing ? 'قم بتعديل تفاصيل المهمة' : 'أضف مهمة جديدة لتتبع أعمالك'}
            </p>
          </div>
        </DialogHeader>

        {/* Section Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200',
                  activeSection === tab.id
                    ? 'bg-white text-teal-600 shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 max-h-[50vh]">
              <AnimatePresence mode="wait">
                {activeSection === 'basic' && (
                  <motion.div
                    key="basic"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-teal-500" />
                            عنوان المهمة
                            <span className="text-red-400">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="مثال: متابعة عقد العميل أحمد"
                              className="h-12 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 text-right"
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
                          <FormLabel className="text-slate-700 font-medium">الوصف</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="أضف وصفاً تفصيلياً للمهمة..."
                              className="min-h-[100px] rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 text-right resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Priority Selection - Visual Cards */}
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <Flag className="h-4 w-4 text-teal-500" />
                            الأولوية
                          </FormLabel>
                          <div className="grid grid-cols-4 gap-2">
                            {priorityOptions.map((option) => {
                              const Icon = option.icon;
                              const isSelected = field.value === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  className={cn(
                                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                                    isSelected
                                      ? `${option.color} border-current shadow-md scale-[1.02]`
                                      : 'border-slate-100 hover:border-slate-200 bg-white'
                                  )}
                                >
                                  <Icon className={cn('h-5 w-5', isSelected ? option.iconColor : 'text-slate-400')} />
                                  <span className="text-xs font-medium">{option.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status Selection */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">الحالة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {statusOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                  <SelectItem key={option.value} value={option.value} className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{option.label}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {activeSection === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    {/* Assigned To */}
                    <FormField
                      control={form.control}
                      name="assigned_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-teal-500" />
                            تعيين إلى
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                <SelectValue placeholder="اختر الموظف المسؤول" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="" className="rounded-lg">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <User className="h-4 w-4" />
                                  بدون تعيين
                                </div>
                              </SelectItem>
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id} className="rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={member.avatar_url || ''} />
                                      <AvatarFallback className="text-xs bg-teal-100 text-teal-600">
                                        {(member.first_name_ar || member.first_name || '?')[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{member.first_name_ar || member.first_name} {member.last_name_ar || member.last_name}</span>
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
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-teal-500" />
                              تاريخ البدء
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'h-12 rounded-xl border-slate-200 justify-start text-right font-normal hover:bg-slate-50',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    <CalendarIcon className="ml-2 h-4 w-4 text-slate-400" />
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: ar })
                                    ) : (
                                      <span>اختر التاريخ</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto rounded-xl"
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
                            <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4 text-teal-500" />
                              تاريخ الاستحقاق
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'h-12 rounded-xl border-slate-200 justify-start text-right font-normal hover:bg-slate-50',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    <Clock className="ml-2 h-4 w-4 text-slate-400" />
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: ar })
                                    ) : (
                                      <span>اختر التاريخ</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto rounded-xl"
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
                          <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-teal-500" />
                            التصنيف
                          </FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {categoryOptions.map((cat) => (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => field.onChange(field.value === cat.value ? '' : cat.value)}
                                className={cn(
                                  'flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all duration-200',
                                  field.value === cat.value
                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                    : 'border-slate-100 hover:border-slate-200 bg-white text-slate-600'
                                )}
                              >
                                <span>{cat.icon}</span>
                                <span className="text-sm font-medium">{cat.value}</span>
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tags */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-teal-500" />
                        الوسوم
                      </label>
                      <div className="flex flex-wrap gap-2 min-h-[32px]">
                        <AnimatePresence>
                          {tags.map((tag) => (
                            <motion.div
                              key={tag}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                            >
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-lg"
                              >
                                {tag}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-teal-900 transition-colors"
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
                          placeholder="أضف وسم جديد..."
                          className="flex-1 h-11 rounded-xl border-slate-200"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addTag}
                          className="h-11 w-11 rounded-xl border-slate-200 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'subtasks' && !isEditing && (
                  <motion.div
                    key="subtasks"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {/* Subtasks Header */}
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-l from-teal-50 to-emerald-50 rounded-2xl border border-teal-100">
                      <div className="p-2 bg-teal-500 rounded-xl">
                        <ListChecks className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">المهام الفرعية</h4>
                        <p className="text-sm text-slate-500">قسّم المهمة الكبيرة إلى خطوات صغيرة</p>
                      </div>
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-2">
                      <AnimatePresence>
                        {checklists.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl group hover:border-slate-200 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                              <span className="text-slate-700">{item.title}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChecklistItem(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {checklists.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                          <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>لا توجد مهام فرعية بعد</p>
                          <p className="text-sm">أضف مهمة فرعية للبدء</p>
                        </div>
                      )}
                    </div>

                    {/* Add New Subtask */}
                    <div className="flex gap-2">
                      <Input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="أضف مهمة فرعية جديدة..."
                        className="flex-1 h-12 rounded-xl border-slate-200"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChecklistItem();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addChecklistItem}
                        className="h-12 px-6 rounded-xl bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="text-slate-500 hover:text-slate-700"
              >
                إلغاء
              </Button>
              
              <div className="flex items-center gap-3">
                {/* Section Navigation */}
                {activeSection !== 'basic' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentIndex = sectionTabs.findIndex(t => t.id === activeSection);
                      if (currentIndex > 0) {
                        setActiveSection(sectionTabs[currentIndex - 1].id);
                      }
                    }}
                    className="rounded-xl"
                  >
                    السابق
                  </Button>
                )}
                
                {activeSection !== sectionTabs[sectionTabs.length - 1].id ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentIndex = sectionTabs.findIndex(t => t.id === activeSection);
                      if (currentIndex < sectionTabs.length - 1) {
                        setActiveSection(sectionTabs[currentIndex + 1].id);
                      }
                    }}
                    className="rounded-xl bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    التالي
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-gradient-to-l from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 min-w-[140px] h-11"
                  >
                    {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'حفظ التغييرات' : 'إنشاء المهمة'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
