import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetId } from '@/hooks/useDashboardLayout';

interface DraggableWidgetProps {
  id: DashboardWidgetId;
  colSpan: number;
  visible: boolean;
  isEditMode: boolean;
  onToggleVisibility?: () => void;
  children: React.ReactNode;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  id,
  colSpan,
  visible,
  isEditMode,
  onToggleVisibility,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // إذا كانت البطاقة مخفية وليس في وضع التعديل، لا تظهرها
  if (!visible && !isEditMode) {
    return null;
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        `col-span-${colSpan}`,
        'relative',
        isDragging && 'z-50 opacity-90',
        !visible && isEditMode && 'opacity-50',
        isEditMode && 'cursor-move'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible || isEditMode ? 1 : 0.5, y: 0 }}
      whileHover={isEditMode ? { scale: 1.01 } : undefined}
    >
      {/* مقبض السحب وأزرار التحكم (تظهر فقط في وضع التعديل) */}
      {isEditMode && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1">
          {/* مقبض السحب */}
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 bg-coral-500 text-white rounded-lg shadow-lg cursor-grab active:cursor-grabbing hover:bg-coral-600 transition-colors"
            title="اسحب لإعادة الترتيب"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
          {/* زر إظهار/إخفاء */}
          <button
            onClick={onToggleVisibility}
            className={cn(
              'p-1.5 rounded-lg shadow-lg transition-colors',
              visible
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-400 text-white hover:bg-gray-500'
            )}
            title={visible ? 'إخفاء البطاقة' : 'إظهار البطاقة'}
          >
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* حدود التعديل */}
      {isEditMode && (
        <div className={cn(
          'absolute inset-0 rounded-2xl border-2 border-dashed pointer-events-none',
          isDragging ? 'border-coral-500' : 'border-coral-300'
        )} />
      )}

      {/* المحتوى */}
      <div className={cn(
        isEditMode && 'pointer-events-none select-none'
      )}>
        {children}
      </div>
    </motion.div>
  );
};

