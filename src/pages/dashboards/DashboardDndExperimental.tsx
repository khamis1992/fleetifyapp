/**
 * داشبورد تجريبي مع السحب والإفلات
 * يتيح للمستخدم إعادة ترتيب الويدجات حسب رغبته
 * 
 * @component DashboardDndExperimental
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  Settings,
  Sparkles,
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
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Widget Types
type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

interface Widget {
  id: string;
  title: string;
  type: 'stat' | 'chart' | 'list' | 'calendar' | 'alerts';
  size: WidgetSize;
  icon: React.ElementType;
  color: string;
}

// Default Widgets Configuration
const DEFAULT_WIDGETS: Widget[] = [
  { id: 'vehicles', title: 'إجمالي المركبات', type: 'stat', size: 'small', icon: Car, color: 'coral' },
  { id: 'contracts', title: 'العقود النشطة', type: 'stat', size: 'small', icon: FileText, color: 'blue' },
  { id: 'customers', title: 'إجمالي العملاء', type: 'stat', size: 'small', icon: Users, color: 'green' },
  { id: 'revenue', title: 'إيرادات الشهر', type: 'stat', size: 'small', icon: Banknote, color: 'amber' },
  { id: 'chart-revenue', title: 'الأداء المالي', type: 'chart', size: 'large', icon: TrendingUp, color: 'coral' },
  { id: 'chart-fleet', title: 'حالة الأسطول', type: 'chart', size: 'medium', icon: Car, color: 'blue' },
  { id: 'alerts', title: 'التنبيهات', type: 'alerts', size: 'medium', icon: AlertTriangle, color: 'red' },
  { id: 'upcoming', title: 'المواعيد القادمة', type: 'calendar', size: 'medium', icon: Calendar, color: 'purple' },
  { id: 'maintenance', title: 'الصيانة', type: 'list', size: 'medium', icon: Wrench, color: 'orange' },
];

// Size to grid classes mapping
const SIZE_CLASSES: Record<WidgetSize, string> = {
  small: 'col-span-3',
  medium: 'col-span-4',
  large: 'col-span-5',
  wide: 'col-span-6',
};

// Sortable Widget Component
interface SortableWidgetProps {
  widget: Widget;
  children: React.ReactNode;
  isLocked: boolean;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ widget, children, isLocked }) => {
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
        SIZE_CLASSES[widget.size],
        isDragging && 'opacity-50'
      )}
    >
      <div
        className={cn(
          'bg-white rounded-[1.25rem] shadow-sm hover:shadow-lg transition-all h-full relative group',
          isDragging && 'ring-2 ring-blue-500 shadow-2xl scale-105'
        )}
      >
        {/* Drag Handle */}
        {!isLocked && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-gray-100/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}
        {children}
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
}

const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  progressLabel,
  progressValue,
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
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
            isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{title}</p>
      </div>
      {progressValue !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-neutral-400">{progressLabel}</span>
            <span className="font-semibold text-neutral-600">{progressValue}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', colors.progress)} style={{ width: `${progressValue}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

// Chart Widget Content
interface ChartWidgetProps {
  type: 'area' | 'pie' | 'bar';
  data: any[];
  title: string;
  subtitle?: string;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ type, data, title, subtitle }) => {
  if (type === 'area') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-neutral-900 text-sm">{title}</h3>
          {subtitle && <p className="text-[10px] text-neutral-400">{subtitle}</p>}
        </div>
        <div className="flex-1 min-h-[140px]">
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
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-2">
          <h3 className="font-bold text-neutral-900 text-sm">{title}</h3>
        </div>
        <div className="flex-1 min-h-[120px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
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
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 p-1.5 bg-neutral-50 rounded-lg">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
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
const AlertsWidget: React.FC = () => {
  const alerts = [
    { id: 1, type: 'warning', message: 'عقد ينتهي خلال 3 أيام', time: 'منذ 2 ساعة' },
    { id: 2, type: 'danger', message: 'دفعة متأخرة - أحمد محمد', time: 'منذ 5 ساعات' },
    { id: 3, type: 'info', message: 'صيانة مجدولة - تويوتا كامري', time: 'غداً' },
  ];

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 text-sm">التنبيهات</h3>
        <Badge className="bg-red-100 text-red-600 text-[10px]">{alerts.length} جديد</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'p-2.5 rounded-xl border-r-4 bg-neutral-50',
              alert.type === 'warning' && 'border-amber-500',
              alert.type === 'danger' && 'border-red-500',
              alert.type === 'info' && 'border-blue-500'
            )}
          >
            <p className="text-xs text-neutral-700 font-medium">{alert.message}</p>
            <p className="text-[10px] text-neutral-400 mt-1">{alert.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Calendar Widget Content
const CalendarWidget: React.FC = () => {
  const events = [
    { id: 1, title: 'تجديد عقد - شركة الخليج', date: 'اليوم', time: '10:00 ص' },
    { id: 2, title: 'موعد صيانة', date: 'غداً', time: '2:00 م' },
    { id: 3, title: 'اجتماع مراجعة', date: 'الأحد', time: '11:00 ص' },
  ];

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 text-sm">المواعيد القادمة</h3>
        <Calendar className="w-4 h-4 text-neutral-400" />
      </div>
      <div className="flex-1 space-y-2 overflow-auto">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 p-2 bg-neutral-50 rounded-xl">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex flex-col items-center justify-center">
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
const MaintenanceWidget: React.FC = () => {
  const items = [
    { id: 1, vehicle: 'تويوتا كامري 2023', status: 'جاري', progress: 60 },
    { id: 2, vehicle: 'هوندا أكورد 2022', status: 'مجدول', progress: 0 },
    { id: 3, vehicle: 'نيسان ألتيما 2023', status: 'مكتمل', progress: 100 },
  ];

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 text-sm">الصيانة</h3>
        <Wrench className="w-4 h-4 text-neutral-400" />
      </div>
      <div className="flex-1 space-y-2 overflow-auto">
        {items.map((item) => (
          <div key={item.id} className="p-2.5 bg-neutral-50 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-neutral-700">{item.vehicle}</p>
              <Badge className={cn(
                'text-[9px]',
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
    localStorage.setItem('dashboard-layout', JSON.stringify(widgets));
    toast({
      title: '💾 تم الحفظ',
      description: 'تم حفظ ترتيب الويدجات',
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
          />
        );
      case 'chart-revenue':
        return <ChartWidget type="area" data={revenueData} title="الأداء المالي" subtitle="تحليل الإيرادات" />;
      case 'chart-fleet':
        return <ChartWidget type="pie" data={fleetData} title="حالة الأسطول" />;
      case 'alerts':
        return <AlertsWidget />;
      case 'upcoming':
        return <CalendarWidget />;
      case 'maintenance':
        return <MaintenanceWidget />;
      default:
        return <div className="p-4 text-center text-neutral-400">Widget</div>;
    }
  };

  // Get active widget for overlay
  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  return (
    <div className="min-h-screen bg-neutral-150">
      {/* Test Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 text-center text-sm">
        <FlaskConical className="w-4 h-4 inline ml-2" />
        <span className="font-medium">وضع الاختبار</span> - داشبورد تجريبي مع خاصية السحب والإفلات
        <Link to="/dashboard" className="mr-4 underline hover:no-underline">
          العودة للداشبورد الأصلي
        </Link>
      </div>

      <div className="p-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-5">
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
              <p className="text-sm text-neutral-500">اسحب الويدجات لإعادة ترتيبها حسب رغبتك</p>
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
            className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-blue-700">
              <strong>نصيحة:</strong> مرر المؤشر فوق أي ويدجت ثم اسحب من أيقونة 
              <GripVertical className="w-4 h-4 inline mx-1 text-blue-500" />
              لإعادة ترتيب الويدجات. يمكنك قفل الترتيب بعد الانتهاء.
            </p>
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
            <div className="grid grid-cols-12 gap-4 auto-rows-[140px]">
              {widgets.map((widget) => (
                <SortableWidget key={widget.id} widget={widget} isLocked={isLocked}>
                  {getWidgetContent(widget)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeWidget && (
              <div className={cn(
                SIZE_CLASSES[activeWidget.size],
                'bg-white rounded-[1.25rem] shadow-2xl ring-2 ring-blue-500 scale-105'
              )}>
                {getWidgetContent(activeWidget)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

