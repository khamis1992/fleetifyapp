import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Grip, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// إعدادات لوحة التحكم الافتراضية
const DEFAULT_DASHBOARD_SETTINGS = {
  layout: 'standard', // 'compact', 'standard', 'expanded'
  widgets: {
    stats: { visible: true, order: 1 },
    performanceChart: { visible: true, order: 2 },
    fleetStatus: { visible: true, order: 3 },
    maintenanceSchedule: { visible: true, order: 4 },
    reservationsCalendar: { visible: true, order: 5 },
    revenueForecast: { visible: true, order: 6 },
    recentActivities: { visible: true, order: 7 }
  },
  theme: 'light', // 'light', 'dark'
  compactMode: false
};

// أسماء الأدوات
const WIDGET_NAMES = {
  stats: 'الإحصائيات الرئيسية',
  performanceChart: 'الأداء المالي',
  fleetStatus: 'حالة الأسطول',
  maintenanceSchedule: 'جدول الصيانة',
  reservationsCalendar: 'تقويم الحجوزات',
  revenueForecast: 'توقعات الإيرادات',
  recentActivities: 'النشاطات الأخيرة'
};

// أنواع التخطيط
const LAYOUT_OPTIONS = [
  { value: 'compact', label: 'مضغوط', description: 'عرض المزيد من البيانات في مساحة أقل' },
  { value: 'standard', label: 'قياسي', description: 'التوازن بين الوضوح والمعلومات' },
  { value: 'expanded', label: 'موصول', description: 'عرض المزيد من التفاصيل' }
];

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: typeof DEFAULT_DASHBOARD_SETTINGS) => void;
  currentSettings: typeof DEFAULT_DASHBOARD_SETTINGS;
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
  currentSettings
}) => {
  const [activeTab, setActiveTab] = useState('widgets');
  const [settings, setSettings] = useState(currentSettings);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  
  // حفظ الإعدادات عند التغيير
  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);
  
  // تطبيق الإعدادات
  const applySettings = () => {
    onSettingsChange(settings);
    // حفظ الإعدادات في التخزين المحلي
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
    onClose();
  };
  
  // إعادة تعيين الإعدادات
  const resetSettings = () => {
    setSettings(DEFAULT_DASHBOARD_SETTINGS);
  };
  
  // تبديل رؤية الأداة
  const toggleWidgetVisibility = (widget: string) => {
    setSettings({
      ...settings,
      widgets: {
        ...settings.widgets,
        [widget]: {
          ...settings.widgets[widget as keyof typeof settings.widgets],
          visible: !settings.widgets[widget as keyof typeof settings.widgets].visible
        }
      }
    });
  };
  
  // بدء سحب الأداة
  const handleDragStart = (widget: string) => {
    setDraggedWidget(widget);
  };
  
  // الانتهاء من سحب الأداة
  const handleDragEnd = (widget: string) => {
    if (draggedWidget && draggedWidget !== widget) {
      const draggedWidgetOrder = settings.widgets[draggedWidget as keyof typeof settings.widgets].order;
      const targetWidgetOrder = settings.widgets[widget as keyof typeof settings.widgets].order;
      
      const newWidgets = { ...settings.widgets };
      
      // تبديل ترتيب الأدوات
      Object.keys(newWidgets).forEach(key => {
        const widgetOrder = newWidgets[key as keyof typeof newWidgets].order;
        
        if (widgetOrder === draggedWidgetOrder) {
          newWidgets[key as keyof typeof newWidgets].order = targetWidgetOrder;
        } else if (widgetOrder === targetWidgetOrder) {
          newWidgets[key as keyof typeof newWidgets].order = draggedWidgetOrder;
        }
      });
      
      setSettings({ ...settings, widgets: newWidgets });
    }
    setDraggedWidget(null);
  };
  
  // الحصول على الأدوات مرتبة حسب الترتيب
  const getOrderedWidgets = () => {
    return Object.entries(settings.widgets)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, value]) => ({ id: key, ...value }));
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* خلفية شفافة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* نافذة التخصيص */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 max-h-[90vh] overflow-hidden"
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-700" />
                <h2 className="text-lg font-bold text-neutral-900">تخصيص لوحة التحكم</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            
            {/* تبويبات التخصيص */}
            <div className="flex border-b border-neutral-200">
              {[
                { id: 'widgets', label: 'الأدوات' },
                { id: 'layout', label: 'التخطيط' },
                { id: 'theme', label: 'المظهر' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors relative",
                    activeTab === tab.id
                      ? "text-coral-600"
                      : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"
                      layoutId="tabIndicator"
                    />
                  )}
                </button>
              ))}
            </div>
            
            {/* محتوى التخصيص */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* تبويب الأدوات */}
              {activeTab === 'widgets' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-2">اختر الأدوات التي تظهر:</h3>
                  {getOrderedWidgets().map(widget => (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          className="w-5 h-5 flex items-center justify-center cursor-move"
                          draggable
                          onDragStart={() => handleDragStart(widget.id)}
                          onDragEnd={() => handleDragEnd(widget.id)}
                        >
                          <Grip className="w-4 h-4 text-neutral-400" />
                        </button>
                        <span className="text-sm font-medium text-neutral-700">
                          {WIDGET_NAMES[widget.id as keyof typeof WIDGET_NAMES]}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleWidgetVisibility(widget.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-200 transition-colors"
                      >
                        {widget.visible ? (
                          <Eye className="w-4 h-4 text-neutral-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* تبويب التخطيط */}
              {activeTab === 'layout' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-2">اختر التخطيط:</h3>
                  {LAYOUT_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        settings.layout === option.value
                          ? "bg-rose-50 border border-rose-200"
                          : "bg-neutral-50 border border-transparent hover:bg-neutral-100"
                      )}
                    >
                      <input
                        type="radio"
                        name="layout"
                        value={option.value}
                        checked={settings.layout === option.value}
                        onChange={() => setSettings({ ...settings, layout: option.value as any })}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-900">{option.label}</div>
                        <div className="text-xs text-neutral-500">{option.description}</div>
                      </div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          settings.layout === option.value
                            ? "border-rose-500"
                            : "border-neutral-300"
                        )}
                      >
                        {settings.layout === option.value && (
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              {/* تبويب المظهر */}
              {activeTab === 'theme' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-2">المظهر:</h3>
                  
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm font-medium text-neutral-700">الوضع الليلي</span>
                    <button
                      onClick={() => setSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-colors",
                        settings.theme === 'dark' ? "bg-rose-500" : "bg-neutral-300"
                      )}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: settings.theme === 'dark' ? 6 : 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm font-medium text-neutral-700">وضع مضغوط</span>
                    <button
                      onClick={() => setSettings({ ...settings, compactMode: !settings.compactMode })}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-colors",
                        settings.compactMode ? "bg-rose-500" : "bg-neutral-300"
                      )}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: settings.compactMode ? 6 : 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* أزرار الإجراءات */}
            <div className="flex items-center justify-between p-4 border-t border-neutral-200">
              <button
                onClick={resetSettings}
                className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                إعادة تعيين
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={applySettings}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-coral-600 transition-colors"
                >
                  تطبيق
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// دالة لاسترداد إعدادات لوحة التحكم من التخزين المحلي
export const getDashboardSettings = (): typeof DEFAULT_DASHBOARD_SETTINGS => {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_SETTINGS;
  
  try {
    const stored = localStorage.getItem('dashboardSettings');
    if (stored) {
      return { ...DEFAULT_DASHBOARD_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading dashboard settings:', error);
  }
  
  return DEFAULT_DASHBOARD_SETTINGS;
};

export default DashboardCustomizer;
