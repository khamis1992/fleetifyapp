import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/dropdown-menu';
import {
  useActiveGoals,
  useCreateGoal,
  useIncrementGoalProgress,
  useDeleteGoal,
  UserGoal,
  CreateGoalInput,
} from '@/hooks/useUserGoals';
import { cn } from '@/lib/utils';
import {
  Plus,
  Target,
  MoreVertical,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Minus,
  Calendar,
  Repeat,
} from 'lucide-react';

const periodLabels: Record<UserGoal['period_type'], string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
};

const periodIcons: Record<UserGoal['period_type'], React.ReactNode> = {
  daily: <Calendar className="h-3 w-3" />,
  weekly: <Repeat className="h-3 w-3" />,
  monthly: <Repeat className="h-3 w-3" />,
};

const categoryOptions = [
  'فواتير',
  'عملاء',
  'عقود',
  'مدفوعات',
  'متابعة',
  'صيانة',
  'أخرى',
];

interface UserGoalsProps {
  compact?: boolean;
  limit?: number;
}

export const UserGoals: React.FC<UserGoalsProps> = ({ compact = false, limit }) => {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [newGoal, setNewGoal] = React.useState<CreateGoalInput>({
    title: '',
    target_count: 10,
    period_type: 'daily',
  });

  const { data: goals = [], isLoading } = useActiveGoals();
  const createGoal = useCreateGoal();
  const incrementProgress = useIncrementGoalProgress();
  const deleteGoal = useDeleteGoal();

  const displayedGoals = limit ? goals.slice(0, limit) : goals;

  const handleAddGoal = async () => {
    if (!newGoal.title.trim() || newGoal.target_count < 1) return;

    await createGoal.mutateAsync(newGoal);

    setNewGoal({ title: '', target_count: 10, period_type: 'daily' });
    setShowAddDialog(false);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-coral-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-white/80 backdrop-blur-xl border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all', compact && 'border-0 shadow-none')}>
      <CardHeader className={cn('pb-3', compact && 'px-0 pt-0')}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
              <Target className="h-5 w-5 text-white" />
            </div>
            أهدافي
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                {!compact && 'هدف جديد'}
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-lg p-1">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  هدف جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">العنوان *</label>
                  <Input
                    placeholder="مثال: إغلاق فواتير العقود"
                    value={newGoal.title}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, title: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">العدد المستهدف *</label>
                    <Input
                      type="number"
                      min={1}
                      value={newGoal.target_count}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          target_count: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">الفترة</label>
                    <Select
                      value={newGoal.period_type}
                      onValueChange={(value: UserGoal['period_type']) =>
                        setNewGoal({ ...newGoal, period_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">يومي</SelectItem>
                        <SelectItem value="weekly">أسبوعي</SelectItem>
                        <SelectItem value="monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">التصنيف</label>
                  <Select
                    value={newGoal.category || ''}
                    onValueChange={(value) =>
                      setNewGoal({ ...newGoal, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleAddGoal}
                    disabled={
                      !newGoal.title.trim() ||
                      newGoal.target_count < 1 ||
                      createGoal.isPending
                    }
                    className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    {createGoal.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                    إنشاء الهدف
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'px-0 pb-0')}>
        {displayedGoals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد أهداف نشطة</p>
            <p className="text-sm">أضف هدفاً لتتبع تقدمك</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {displayedGoals.map((goal) => {
                const percentage = Math.round(
                  (goal.current_count / goal.target_count) * 100
                );
                const isCompleted = goal.is_completed || percentage >= 100;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={cn(
                      'p-4 rounded-2xl border bg-white/80 backdrop-blur-xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all',
                      isCompleted && 'bg-green-50/80 border-green-200'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {goal.title}
                          </h4>
                          {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {periodIcons[goal.period_type]}
                            <span className="mr-1">{periodLabels[goal.period_type]}</span>
                          </Badge>
                          {goal.category && (
                            <Badge variant="outline" className="text-xs">
                              {goal.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Increment/Decrement buttons */}
                        {!isCompleted && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                incrementProgress.mutate({
                                  id: goal.id,
                                  increment: -1,
                                })
                              }
                              disabled={goal.current_count <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-teal-50 hover:bg-teal-100 border-teal-200"
                              onClick={() =>
                                incrementProgress.mutate({
                                  id: goal.id,
                                  increment: 1,
                                })
                              }
                            >
                              <Plus className="h-3 w-3 text-teal-600" />
                            </Button>
                          </div>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => deleteGoal.mutate(goal.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">التقدم</span>
                        <span className="font-medium">
                          <span className={cn(isCompleted && 'text-green-600')}>
                            {goal.current_count}
                          </span>
                          <span className="text-gray-400">/{goal.target_count}</span>
                          <span
                            className={cn(
                              'mr-2 text-xs',
                              isCompleted ? 'text-green-600' : 'text-gray-400'
                            )}
                          >
                            ({percentage}%)
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="h-2"
                        indicatorClassName={getProgressColor(percentage)}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {limit && goals.length > limit && (
              <p className="text-center text-sm text-gray-500 pt-2">
                +{goals.length - limit} أهداف أخرى
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserGoals;







