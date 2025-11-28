/**
 * داشبورد تجريبي مع السحب والإفلات + التكبير والتصغير
 * يتيح للمستخدم إعادة ترتيب وتغيير حجم الويدجات
 * 
 * @component DashboardDndExperimental
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  Car,
  FileText,
  Users,
  Banknote,
  TrendingUp,
  TrendingDown,
  Wrench,
  AlertTriangle,
  Clock,
  Calendar,
  ArrowUp,
  Bell,
  Search,
  GripVertical,
  ArrowLeft,
  FlaskConical,
  LayoutGrid,
  Save,
  RotateCcw,
  Lock,
  Unlock,
  Sparkles,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Widget Types - Now with height spans
type WidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'full';

interface Widget {
  id: string;
  title: string;
  type: 'stat' | 'chart' | 'list' | 'calendar' | 'alerts';
  colSpan: number; // 3, 4, 5, 6, or 12
  rowSpan: number; // 1, 2, or 3
  icon: React.ElementType;
  color: string;
}

// Default Widgets Configuration with proper sizing
const DEFAULT_WIDGETS: Widget[] = [
  { id: 'vehicles', title: 'إجمالي المركبات', type: 'stat', colSpan: 3, rowSpan: 1, icon: Car, color: 'coral' },
  { id: 'contracts', title: 'العقود النشطة', type: 'stat', colSpan: 3, rowSpan: 1, icon: FileText, color: 'blue' },
  { id: 'customers', title: 'إجمالي العملاء', type: 'stat', colSpan: 3, rowSpan: 1, icon: Users, color: 'green' },
  { id: 'revenue', title: 'إيرادات الشهر', type: 'stat', colSpan: 3, rowSpan: 1, icon: Banknote, color: 'amber' },
  { id: 'chart-revenue', title: 'الأداء المالي', type: 'chart', colSpan: 6, rowSpan: 2, icon: TrendingUp, color: 'coral' },
  { id: 'chart-fleet', title: 'حالة الأسطول', type: 'chart', colSpan: 3, rowSpan: 2, icon: Car, color: 'blue' },
  { id: 'alerts', title: 'التنبيهات', type: 'alerts', colSpan: 3, rowSpan: 2, icon: AlertTriangle, color: 'red' },
  { id: 'upcoming', title: 'المواعيد القادمة', type: 'calendar', colSpan: 4, rowSpan: 2, icon: Calendar, color: 'purple' },
  { id: 'maintenance', title: 'الصيانة', type: 'list', colSpan: 4, rowSpan: 2, icon: Wrench, color: 'orange' },
  { id: 'quick-stats', title: 'إحصائيات سريعة', type: 'stat', colSpan: 4, rowSpan: 1, icon: TrendingUp, color: 'green' },
];

// Get grid classes based on spans
const getGridClasses = (colSpan: number, rowSpan: number) => {
  const colClasses: Record<number, string> = {
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    12: 'col-span-12',
  };
  const rowClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
  };
  return `${colClasses[colSpan] || 'col-span-3'} ${rowClasses[rowSpan] || 'row-span-1'}`;
};

// Sortable Widget Component with Resize Controls
interface SortableWidgetProps {
  widget: Widget;
  children: React.ReactNode;
  isLocked: boolean;
  onResize: (id: string, direction: 'grow' | 'shrink') => void;
  onResizeHeight: (id: string, direction: 'grow' | 'shrink') => void;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ 
  widget, 
  children, 
  isLocked,
  onResize,
  onResizeHeight,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getGridClasses(widget.colSpan, widget.rowSpan),
        isDragging && 'opacity-50',
        'min-h-[120px]'
      )}
    >
      <div
        className={cn(
          'bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all h-full relative group overflow-hidden',
          isDragging && 'ring-2 ring-blue-500 shadow-2xl scale-[1.02]'
        )}
      >
        {/* Drag Handle */}
        {!isLocked && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-100/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Resize Controls */}
        {!isLocked && (
          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {/* Width Controls */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResize(widget.id, 'shrink'); }}
                    disabled={widget.colSpan <= 3}
                    className="p-1 rounded bg-gray-100/80 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3 text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تصغير العرض</TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResize(widget.id, 'grow'); }}
                    disabled={widget.colSpan >= 12}
                    className="p-1 rounded bg-gray-100/80 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3 text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تكبير العرض</TooltipContent>
              </UITooltip>
            </TooltipProvider>

            <div className="w-px bg-gray-300 mx-0.5" />

            {/* Height Controls */}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResizeHeight(widget.id, 'shrink'); }}
                    disabled={widget.rowSpan <= 1}
                    className="p-1 rounded bg-gray-100/80 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minimize2 className="w-3 h-3 text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تصغير الارتفاع</TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onResizeHeight(widget.id, 'grow'); }}
                    disabled={widget.rowSpan >= 3}
                    className="p-1 rounded bg-gray-100/80 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Maximize2 className="w-3 h-3 text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تكبير الارتفاع</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Size indicator */}
        {!isLocked && (
          <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-400 bg-gray-100/80 px-1.5 py-0.5 rounded">
              {widget.colSpan}×{widget.rowSpan}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

// Stat Widget Content
interface StatWidgetProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  progressLabel?: string;
  progressValue?: number;
  rowSpan?: number;
}

const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  progressLabel,
  progressValue,
  rowSpan = 1,
}) => {
  const isPositive = change && change > 0;
  const colorClasses: Record<string, { bg: string; text: string; progress: string }> = {
    coral: { bg: 'bg-coral-100', text: 'text-coral-600', progress: 'bg-coral-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', progress: 'bg-blue-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', progress: 'bg-green-500' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', progress: 'bg-amber-500' },
    red: { bg: 'bg-red-100', text: 'text-red-600', progress: 'bg-red-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', progress: 'bg-purple-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', progress: 'bg-orange-500' },
  };
  const colors = colorClasses[color] || colorClasses.coral;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0',
            isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <p className={cn("font-bold text-neutral-900", rowSpan > 1 ? "text-3xl" : "text-2xl")}>{value}</p>
        <p className="text-xs text-neutral-500 mt-0.5 truncate">{title}</p>
      </div>
      {progressValue !== undefined && (
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-neutral-400 truncate">{progressLabel}</span>
            <span className="font-semibold text-neutral-600 flex-shrink-0">{progressValue}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', colors.progress)} style={{ width: `${progressValue}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

// Chart Widget Content
interface ChartWidgetProps {
  type: 'area' | 'pie';
  data: any[];
  title: string;
  subtitle?: string;
  rowSpan?: number;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ type, data, title, subtitle, rowSpan = 1 }) => {
  const chartHeight = rowSpan === 1 ? 100 : rowSpan === 2 ? 180 : 260;

  if (type === 'area') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-2 flex-shrink-0">
          <h3 className="font-bold text-neutral-900 text-sm truncate">{title}</h3>
          {subtitle && <p className="text-[10px] text-neutral-400 truncate">{subtitle}</p>}
        </div>
        <div className="flex-1 min-h-0" style={{ minHeight: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenueDnd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e85a4f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#e85a4f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickFormatter={(v) => `${v}K`} />
              <Tooltip formatter={(value) => [`${value}K`, 'الإيرادات']} />
              <Area type="monotone" dataKey="value" stroke="#e85a4f" strokeWidth={2} fill="url(#colorRevenueDnd)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {rowSpan > 1 && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-100 flex-shrink-0">
            <div className="text-center">
              <p className="text-sm font-bold text-green-600">+22%</p>
              <p className="text-[9px] text-neutral-500">النمو</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-blue-600">120K</p>
              <p className="text-[9px] text-neutral-500">الإيرادات</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-purple-600">45</p>
              <p className="text-[9px] text-neutral-500">العقود</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-2 flex-shrink-0">
          <h3 className="font-bold text-neutral-900 text-sm truncate">{title}</h3>
        </div>
        <div className="flex-1 min-h-0 relative flex items-center justify-center" style={{ minHeight: chartHeight - 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="80%"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center">
            <p className="text-xl font-bold text-neutral-900">{data.reduce((sum, item) => sum + item.value, 0)}</p>
            <p className="text-[9px] text-neutral-400">إجمالي</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-2 flex-shrink-0">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 p-1.5 bg-neutral-50 rounded-lg overflow-hidden">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[9px] text-neutral-600 truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

// Alerts Widget Content
interface AlertsWidgetProps {
  rowSpan?: number;
}

const AlertsWidget: React.FC<AlertsWidgetProps> = ({ rowSpan = 1 }) => {
  const alerts = [
    { id: 1, type: 'warning', message: 'عقد ينتهي خلال 3 أيام', time: 'منذ 2 ساعة' },
    { id: 2, type: 'danger', message: 'دفعة متأخرة - أحمد محمد', time: 'منذ 5 ساعات' },
    { id: 3, type: 'info', message: 'صيانة مجدولة - تويوتا كامري', time: 'غداً' },
    { id: 4, type: 'warning', message: 'تجديد رخصة مركبة', time: 'بعد أسبوع' },
  ];

  const visibleAlerts = rowSpan === 1 ? alerts.slice(0, 2) : alerts;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="font-bold text-neutral-900 text-sm truncate">التنبيهات</h3>
        <Badge className="bg-red-100 text-red-600 text-[10px] flex-shrink-0">{alerts.length} جديد</Badge>
      </div>
      <div className="flex-1 min-h-0 space-y-2 overflow-auto">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'p-2.5 rounded-xl border-r-4 bg-neutral-50',
              alert.type === 'warning' && 'border-amber-500',
              alert.type === 'danger' && 'border-red-500',
              alert.type === 'info' && 'border-blue-500'
            )}
          >
            <p className="text-xs text-neutral-700 font-medium truncate">{alert.message}</p>
            <p className="text-[10px] text-neutral-400 mt-1">{alert.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Calendar Widget Content
interface CalendarWidgetProps {
  rowSpan?: number;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ rowSpan = 1 }) => {
  const events = [
    { id: 1, title: 'تجديد عقد - شركة الخليج', date: 'اليوم', time: '10:00 ص' },
    { id: 2, title: 'موعد صيانة', date: 'غداً', time: '2:00 م' },
    { id: 3, title: 'اجتماع مراجعة', date: 'الأحد', time: '11:00 ص' },
    { id: 4, title: 'تسليم مركبة جديدة', date: 'الاثنين', time: '9:00 ص' },
  ];

  const visibleEvents = rowSpan === 1 ? events.slice(0, 2) : events;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="font-bold text-neutral-900 text-sm truncate">المواعيد القادمة</h3>
        <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
      </div>
      <div className="flex-1 min-h-0 space-y-2 overflow-auto">
        {visibleEvents.map((event) => (
          <div key={event.id} className="flex items-center gap-3 p-2 bg-neutral-50 rounded-xl">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-purple-600">{event.date}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-700 truncate">{event.title}</p>
              <p className="text-[10px] text-neutral-400">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Maintenance Widget Content
interface MaintenanceWidgetProps {
  rowSpan?: number;
}

const MaintenanceWidget: React.FC<MaintenanceWidgetProps> = ({ rowSpan = 1 }) => {
  const items = [
    { id: 1, vehicle: 'تويوتا كامري 2023', status: 'جاري', progress: 60 },
    { id: 2, vehicle: 'هوندا أكورد 2022', status: 'مجدول', progress: 0 },
    { id: 3, vehicle: 'نيسان ألتيما 2023', status: 'مكتمل', progress: 100 },
    { id: 4, vehicle: 'كيا سبورتاج 2024', status: 'جاري', progress: 30 },
  ];

  const visibleItems = rowSpan === 1 ? items.slice(0, 2) : items;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="font-bold text-neutral-900 text-sm truncate">الصيانة</h3>
        <Wrench className="w-4 h-4 text-neutral-400 flex-shrink-0" />
      </div>
      <div className="flex-1 min-h-0 space-y-2 overflow-auto">
        {visibleItems.map((item) => (
          <div key={item.id} className="p-2.5 bg-neutral-50 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-neutral-700 truncate flex-1">{item.vehicle}</p>
              <Badge className={cn(
                'text-[9px] flex-shrink-0 mr-2',
                item.status === 'مكتمل' && 'bg-green-100 text-green-600',
                item.status === 'جاري' && 'bg-amber-100 text-amber-600',
                item.status === 'مجدول' && 'bg-blue-100 text-blue-600'
              )}>
                {item.status}
              </Badge>
            </div>
            <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  item.status === 'مكتمل' && 'bg-green-500',
                  item.status === 'جاري' && 'bg-amber-500',
                  item.status === 'مجدول' && 'bg-blue-500'
                )}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
export default function DashboardDndExperimental() {
  const { toast } = useToast();
  const { stats } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Sample data for charts
  const revenueData = useMemo(() => [
    { name: 'يناير', value: 45 },
    { name: 'فبراير', value: 52 },
    { name: 'مارس', value: 48 },
    { name: 'أبريل', value: 70 },
    { name: 'مايو', value: 65 },
    { name: 'يونيو', value: 80 },
  ], []);

  const fleetData = useMemo(() => [
    { name: 'مؤجرة', value: stats?.rentedVehicles || 85, color: '#e85a4f' },
    { name: 'متاحة', value: stats?.availableVehicles || 35, color: '#22c55e' },
    { name: 'صيانة', value: stats?.maintenanceVehicles || 15, color: '#eab308' },
    { name: 'محجوزة', value: 10, color: '#3b82f6' },
  ], [stats]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });

      toast({
        title: '✅ تم إعادة الترتيب',
        description: 'تم تحديث ترتيب الويدجات',
      });
    }
  };

  // Resize Width Handler
  const handleResize = useCallback((id: string, direction: 'grow' | 'shrink') => {
    setWidgets((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const sizes = [3, 4, 5, 6, 12];
        const currentIndex = sizes.indexOf(item.colSpan);
        const newIndex = direction === 'grow' 
          ? Math.min(currentIndex + 1, sizes.length - 1)
          : Math.max(currentIndex - 1, 0);
        return { ...item, colSpan: sizes[newIndex] };
      })
    );
  }, []);

  // Resize Height Handler
  const handleResizeHeight = useCallback((id: string, direction: 'grow' | 'shrink') => {
    setWidgets((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const newRowSpan = direction === 'grow'
          ? Math.min(item.rowSpan + 1, 3)
          : Math.max(item.rowSpan - 1, 1);
        return { ...item, rowSpan: newRowSpan };
      })
    );
  }, []);

  // Reset Layout
  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS);
    toast({
      title: '🔄 تم إعادة التعيين',
      description: 'تم استعادة الترتيب الافتراضي',
    });
  };

  // Save Layout
  const handleSave = () => {
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(widgets));
    toast({
      title: '💾 تم الحفظ',
      description: 'تم حفظ ترتيب وأحجام الويدجات',
    });
  };

  // Get widget content
  const getWidgetContent = (widget: Widget) => {
    switch (widget.id) {
      case 'vehicles':
        return (
          <StatWidget
            title={widget.title}
            value={stats?.totalVehicles || 0}
            change={stats?.vehiclesChange}
            icon={widget.icon}
            color={widget.color}
            progressLabel="نشاط المركبات"
            progressValue={stats?.vehicleActivityRate || 85}
            rowSpan={widget.rowSpan}
          />
        );
      case 'contracts':
        return (
          <StatWidget
            title={widget.title}
            value={stats?.activeContracts || 0}
            change={stats?.contractsChange}
            icon={widget.icon}
            color={widget.color}
            progressLabel="معدل الإكمال"
            progressValue={stats?.contractCompletionRate || 78}
            rowSpan={widget.rowSpan}
          />
        );
      case 'customers':
        return (
          <StatWidget
            title={widget.title}
            value={stats?.totalCustomers || 0}
            change={stats?.customersChange}
            icon={widget.icon}
            color={widget.color}
            progressLabel="رضا العملاء"
            progressValue={92}
            rowSpan={widget.rowSpan}
          />
        );
      case 'revenue':
        return (
          <StatWidget
            title={widget.title}
            value={formatCurrency(stats?.monthlyRevenue || 0, { notation: 'compact' })}
            change={stats?.revenueChange}
            icon={widget.icon}
            color={widget.color}
            rowSpan={widget.rowSpan}
          />
        );
      case 'quick-stats':
        return (
          <StatWidget
            title="معدل الإشغال"
            value="87%"
            change={5}
            icon={TrendingUp}
            color="green"
            rowSpan={widget.rowSpan}
          />
        );
      case 'chart-revenue':
        return <ChartWidget type="area" data={revenueData} title="الأداء المالي" subtitle="تحليل الإيرادات" rowSpan={widget.rowSpan} />;
      case 'chart-fleet':
        return <ChartWidget type="pie" data={fleetData} title="حالة الأسطول" rowSpan={widget.rowSpan} />;
      case 'alerts':
        return <AlertsWidget rowSpan={widget.rowSpan} />;
      case 'upcoming':
        return <CalendarWidget rowSpan={widget.rowSpan} />;
      case 'maintenance':
        return <MaintenanceWidget rowSpan={widget.rowSpan} />;
      default:
        return <div className="p-4 text-center text-neutral-400">Widget</div>;
    }
  };

  // Get active widget for overlay
  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Test Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 text-center text-sm">
        <FlaskConical className="w-4 h-4 inline ml-2" />
        <span className="font-medium">وضع الاختبار</span> - داشبورد تجريبي مع السحب والإفلات + التكبير والتصغير
        <Link to="/dashboard" className="mr-4 underline hover:no-underline">
          العودة للداشبورد الأصلي
        </Link>
      </div>

      <div className="p-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                لوحة التحكم التجريبية
                <Badge className="bg-purple-100 text-purple-700 text-xs">تجريبي</Badge>
              </h1>
              <p className="text-sm text-neutral-500">اسحب الويدجات لإعادة ترتيبها • استخدم +/- لتغيير الحجم</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Lock Toggle */}
            <Button
              variant={isLocked ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLocked(!isLocked)}
              className={cn(
                "gap-2",
                isLocked && "bg-red-500 hover:bg-red-600"
              )}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isLocked ? 'مقفل' : 'مفتوح'}
            </Button>

            {/* Reset Button */}
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              إعادة تعيين
            </Button>

            {/* Save Button */}
            <Button size="sm" onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4" />
              حفظ الترتيب
            </Button>
          </div>
        </header>

        {/* Instructions */}
        {!isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <strong>كيفية الاستخدام:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600">
                  <li>اسحب من أيقونة <GripVertical className="w-4 h-4 inline mx-1" /> لإعادة ترتيب الويدجات</li>
                  <li>استخدم <Plus className="w-3 h-3 inline mx-1" /><Minus className="w-3 h-3 inline mx-1" /> لتغيير العرض</li>
                  <li>استخدم <Maximize2 className="w-3 h-3 inline mx-1" /><Minimize2 className="w-3 h-3 inline mx-1" /> لتغيير الارتفاع</li>
                  <li>الحجم الحالي يظهر في أسفل يسار كل بطاقة</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bento Grid with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-12 gap-4 auto-rows-[120px]">
              {widgets.map((widget) => (
                <SortableWidget 
                  key={widget.id} 
                  widget={widget} 
                  isLocked={isLocked}
                  onResize={handleResize}
                  onResizeHeight={handleResizeHeight}
                >
                  {getWidgetContent(widget)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeWidget && (
              <div 
                className={cn(
                  'bg-white rounded-2xl shadow-2xl ring-2 ring-blue-500',
                  getGridClasses(activeWidget.colSpan, activeWidget.rowSpan)
                )}
                style={{ 
                  width: `${(activeWidget.colSpan / 12) * 100}%`,
                  height: activeWidget.rowSpan * 120 + (activeWidget.rowSpan - 1) * 16,
                }}
              >
                {getWidgetContent(activeWidget)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
