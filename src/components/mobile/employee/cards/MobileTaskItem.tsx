/**
 * Mobile Task Item
 * عنصر عرض المهمة
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  User,
  FileText,
  Phone,
  Calendar as CalendarIcon,
  MapPin,
  CreditCard,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmployeeTask } from '@/types/mobile-employee.types';

interface MobileTaskItemProps {
  task: EmployeeTask;
  onComplete?: () => void;
  onEdit?: () => void;
  onClick?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

const getTaskTypeIcon = (type: string) => {
  const icons = {
    call: Phone,
    followup: CalendarIcon,
    visit: MapPin,
    payment: CreditCard,
    other: FileText,
  };
  return icons[type as keyof typeof icons] || FileText;
};

const getPriorityStyle = (priority: string) => {
  const styles = {
    urgent: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: '🔴 عاجل',
    },
    high: {
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: '🟠 مهم',
    },
    medium: {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: '🔵 متوسط',
    },
    low: {
      color: 'text-slate-500',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      label: '⚪ عادي',
    },
  };
  return styles[priority as keyof typeof styles] || styles.medium;
};

export const MobileTaskItem: React.FC<MobileTaskItemProps> = ({
  task,
  onComplete,
  onEdit,
  onClick,
  showCheckbox = true,
  className,
}) => {
  const TypeIcon = getTaskTypeIcon(task.type);
  const priorityStyle = getPriorityStyle(task.priority);
  const isCompleted = task.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4',
        isCompleted && 'opacity-60',
        'hover:shadow-lg hover:border-teal-200/50 active:scale-[0.98]',
        'transition-all duration-200 cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isCompleted && onComplete) {
                onComplete();
              }
            }}
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
              isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-300 hover:border-teal-500'
            )}
          >
            {isCompleted && (
              <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />
            )}
          </motion.button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Time & Priority */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{task.scheduled_time || '09:00'}</span>
            </div>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className={cn('text-xs font-medium', priorityStyle.color)}>
              {priorityStyle.label}
            </span>
          </div>

          {/* Title */}
          <p className={cn(
            'text-sm font-semibold mb-2',
            isCompleted 
              ? 'text-slate-500 line-through' 
              : 'text-slate-900'
          )}>
            {task.title_ar || task.title}
          </p>

          {/* Details */}
          <div className="space-y-1.5">
            {/* Customer */}
            {task.customer_name && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{task.customer_name}</span>
              </div>
            )}

            {/* Type */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {task.type === 'call' && 'مكالمة'}
                {task.type === 'followup' && 'متابعة'}
                {task.type === 'visit' && 'زيارة ميدانية'}
                {task.type === 'payment' && 'تسجيل دفعة'}
                {task.type === 'other' && 'أخرى'}
              </span>
            </div>

            {/* Notes Preview */}
            {task.notes && !isCompleted && (
              <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{task.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronLeft className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
      </div>

      {/* Completed At */}
      {isCompleted && task.completed_at && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              تم الإنجاز: {format(new Date(task.completed_at), 'd MMM yyyy - HH:mm', { locale: ar })}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MobileTaskItem;
