import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyVerificationTasks, VerificationTaskWithDetails } from '@/hooks/useVerificationTasks';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  User,
  FileText,
  Clock,
  ArrowLeft,
  Loader2,
  Phone,
  UserCheck,
} from 'lucide-react';

interface VerificationTasksListProps {
  compact?: boolean;
  limit?: number;
}

const statusColors = {
  pending: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  verified: 'bg-green-500',
  rejected: 'bg-red-500',
};

const statusLabels = {
  pending: 'معلقة',
  in_progress: 'قيد التدقيق',
  verified: 'تم التدقيق',
  rejected: 'مرفوضة',
};

export const VerificationTasksList: React.FC<VerificationTasksListProps> = ({
  compact = false,
  limit,
}) => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useMyVerificationTasks();

  const displayedTasks = limit ? tasks.slice(0, limit) : tasks;

  const handleOpenTask = (taskId: string) => {
    navigate(`/legal/verify/${taskId}`);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50 rounded-3xl">
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'bg-white/80 backdrop-blur-xl border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all',
      compact && 'border-0 shadow-none'
    )}>
      <CardHeader className={cn('pb-3', compact && 'px-0 pt-0')}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 rounded-xl p-1.5">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            مهام التدقيق
            {tasks.length > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {tasks.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'px-0 pb-0')}>
        {displayedTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">لا توجد مهام تدقيق</p>
            <p className="text-sm mt-1">
              عندما يتم إرسال مهمة تدقيق لك ستظهر هنا
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayedTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TaskCard task={task} onOpen={handleOpenTask} />
                </motion.div>
              ))}
            </AnimatePresence>

            {limit && tasks.length > limit && (
              <p className="text-center text-sm text-slate-500 pt-2">
                +{tasks.length - limit} مهام أخرى
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface TaskCardProps {
  task: VerificationTaskWithDetails;
  onOpen: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onOpen }) => {
  const customerName = task.customer
    ? `${task.customer.first_name} ${task.customer.last_name}`
    : 'عميل غير معروف';

  const assignerName = task.assigner
    ? `${task.assigner.first_name_ar || ''} ${task.assigner.last_name_ar || ''}`.trim()
    : 'غير معروف';

  return (
    <div
      className="p-4 rounded-2xl border bg-white/80 backdrop-blur-xl hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer group"
      onClick={() => onOpen(task.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Customer Name */}
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-orange-100 rounded-lg p-1.5">
              <User className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="font-semibold text-slate-900 truncate">
              {customerName}
            </h3>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
            {/* Contract Number */}
            {task.contract?.contract_number && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">عقد: {task.contract.contract_number}</span>
              </div>
            )}

            {/* Phone */}
            {task.customer?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span dir="ltr">{task.customer.phone}</span>
              </div>
            )}

            {/* Assigned By */}
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="truncate">من: {assignerName}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {format(new Date(task.created_at), 'd MMM yyyy', { locale: ar })}
              </span>
            </div>
          </div>

          {/* Notes */}
          {task.notes && (
            <p className="text-sm text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2">
              {task.notes}
            </p>
          )}
        </div>

        {/* Right Side */}
        <div className="flex flex-col items-end gap-2">
          {/* Status Badge */}
          <Badge
            variant="secondary"
            className={cn(
              'text-white text-xs',
              statusColors[task.status]
            )}
          >
            {statusLabels[task.status]}
          </Badge>

          {/* Open Button */}
          <Button
            size="sm"
            variant="outline"
            className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(task.id);
            }}
          >
            فتح
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerificationTasksList;
