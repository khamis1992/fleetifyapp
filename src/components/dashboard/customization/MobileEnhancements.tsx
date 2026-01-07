import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings,
  Search,
  Filter,
  X,
  Menu,
  Home,
  Grid3x3,
  BarChart3,
  Users,
  Car,
  FileText,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';

// تحسينات الأداء للأجهزة المحمولة
const MOBILE_PERFORMANCE_SETTINGS = {
  LAZY_LOAD_THRESHOLD: 50, // عدد العناصر قبل التحميل التدريجي
  SWIPE_SENSITIVITY: 10, // حساسية التمرير
  DEBOUNCE_DELAY: 300, // تأخير التحديث
  PREFETCH_DISTANCE: 100 // مسافة التحميل المسبق
};

// حالة الاتصال
const ConnectionIndicator: React.FC<{ isConnected: boolean; isOffline: boolean }> = ({ 
  isConnected, 
  isOffline 
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-slate-900">لوحة التحكم</h2>
      </div>
      
      <div className="flex items-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600">بدون اتصال</span>
          </>
        ) : isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600">متصل</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
            <span className="text-xs text-amber-600">جاري الاتصال...</span>
          </>
        )}
      </div>
    </div>
  );
};

// مكون القائمة المنزلقة للأجهزة المحمولة
const MobileTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon: React.ElementType }[];
}> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex overflow-x-auto bg-white border-b border-slate-200 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
            activeTab === tab.id
              ? "border-b-2 border-rose-500 text-coral-600"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <tab.icon className="w-4 h-4" />
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// مكون البطاقة المحسنة للأجهزة المحمولة
const EnhancedMobileMetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: string | number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  isOffline?: boolean;
}> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color,
  onClick,
  isOffline = false
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer",
        isOffline && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-slate-500">{title}</h3>
            <p className="text-lg font-bold text-slate-900">{formatValue(value)}</p>
          </div>
        </div>
        
        {change && (
          <div className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
            {typeof change === 'number' && change > 0 && '+'}
            {change}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// قائمة التنقل السريعة للأجهزة المحمولة
const QuickActionMenu: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  actions: { icon: React.ElementType; label: string; onClick: () => void }[];
}> = ({ isOpen, onToggle, onClose, actions }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 top-0 z-50 bg-white border-b border-slate-200 shadow-lg"
        >
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-medium text-slate-900">الإجراءات السريعة</h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 p-4">
            {actions.map((action, index) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-slate-700 hover:bg-slate-100"
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// المكون الرئيسي للوحة التحكم المحسنة للأجهزة المحمولة
export const MobileEnhancedDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isMobile, isTablet } = useMediaQuery();
  const { data: stats, isLoading, error, refetch } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();
  
  // حالات المكون
  const [activeView, setActiveView] = useState<'overview' | 'contracts' | 'vehicles' | 'payments' | 'customers'>('overview');
  const [isOffline, setIsOffline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setConnectionStatus('connected');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // تحقق من الحالة الحالية
    setIsOffline(!navigator.onLine);
    setConnectionStatus(navigator.onLine ? 'connected' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // الإجراءات السريعة
  const quickActions = [
    {
      icon: Plus,
      label: 'عقد جديد',
      onClick: () => navigate('/contracts')
    },
    {
      icon: Car,
      label: 'مركبة جديدة',
      onClick: () => navigate('/vehicles/new')
    },
    {
      icon: Users,
      label: 'عميل جديد',
      onClick: () => navigate('/customers/new')
    },
    {
      icon: FileText,
      label: 'فاتورة جديدة',
      onClick: () => navigate('/invoices/new')
    },
    {
      icon: CreditCard,
      label: 'دفع جديد',
      onClick: () => navigate('/payments/new')
    }
  ];
  
  // تبويب عرض البيانات
  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: Home },
    { id: 'contracts', label: 'العقود', icon: FileText },
    { id: 'vehicles', label: 'المركبات', icon: Car },
    { id: 'payments', label: 'المدفوعات', icon: CreditCard },
    { id: 'customers', label: 'العملاء', icon: Users }
  ];
  
  // عرض المحتوى بناءً على التبويب النشط
  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="grid grid-cols-2 gap-4 p-4">
            <EnhancedMobileMetricCard
              title="المركبات"
              value={stats?.totalVehicles || 0}
              change={stats?.vehicleChange || 0}
              icon={Car}
              color="bg-blue-500"
              onClick={() => setActiveView('vehicles')}
              isOffline={isOffline}
            />
            <EnhancedMobileMetricCard
              title="العقود النشطة"
              value={stats?.activeContracts || 0}
              change={stats?.contractChange || 0}
              icon={FileText}
              color="bg-green-500"
              onClick={() => setActiveView('contracts')}
              isOffline={isOffline}
            />
            <EnhancedMobileMetricCard
              title="العملاء"
              value={stats?.totalCustomers || 0}
              change={stats?.customerChange || 0}
              icon={Users}
              color="bg-purple-500"
              onClick={() => setActiveView('customers')}
              isOffline={isOffline}
            />
            <EnhancedMobileMetricCard
              title="المدفوعات"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              change={stats?.revenueChange || 0}
              icon={CreditCard}
              color="bg-rose-500"
              onClick={() => setActiveView('payments')}
              isOffline={isOffline}
            />
          </div>
        );
        
      case 'contracts':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-slate-900 mb-2">العقود الحديثة</h3>
            </div>
            {/* هنا سيتم عرض قائمة العقود مع التمرير السريع */}
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p>قائمة العقود</p>
            </div>
          </div>
        );
        
      case 'vehicles':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-slate-900 mb-2">المركبات</h3>
            </div>
            {/* هنا سيتم عرض قائمة المركبات مع التمرير السريع */}
            <div className="text-center py-8 text-slate-500">
              <Car className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p>قائمة المركبات</p>
            </div>
          </div>
        );
        
      case 'payments':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-slate-900 mb-2">المدفوعات</h3>
            </div>
            {/* هنا سيتم عرض قائمة المدفوعات مع التمرير السريع */}
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p>قائمة المدفوعات</p>
            </div>
          </div>
        );
        
      case 'customers':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-slate-900 mb-2">العملاء</h3>
            </div>
            {/* هنا سيتم عرض قائمة العملاء مع التمرير السريع */}
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p>قائمة العملاء</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // واجهة الجوال
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* مؤشر الاتصال */}
        <ConnectionIndicator isConnected={connectionStatus === 'connected'} isOffline={isOffline} />
        
        {/* تبويب التنقل */}
        <MobileTabBar
          activeTab={activeView}
          onTabChange={setActiveView}
          tabs={tabs}
        />
        
        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto">
          {isOffline ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <WifiOff className="w-12 h-12 mb-4" />
              <h2 className="text-lg font-medium mb-2">غير متصل بالإنترنت</h2>
              <p className="text-sm">يتم عرض البيانات المخزنة مؤقتاً</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>
        
        {/* شريط الأدوات السريع */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="p-2 bg-slate-100 rounded-lg text-slate-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 bg-slate-100 rounded-lg text-slate-700"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <UnifiedNotificationBell />
              
              <button
                onClick={() => navigate('/settings')}
                className="p-2 bg-slate-100 rounded-lg text-slate-700"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* قائمة الإجراءات السريعة */}
        <QuickActionMenu
          isOpen={showQuickActions}
          onToggle={() => setShowQuickActions(!showQuickActions)}
          onClose={() => setShowQuickActions(false)}
          actions={quickActions}
        />
      </div>
    );
  }
  
  // واجهة الأجهزة اللوحية
  if (isTablet) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* مؤشر الاتصال */}
        <ConnectionIndicator isConnected={connectionStatus === 'connected'} isOffline={isOffline} />
        
        {/* تبويب التنقل */}
        <MobileTabBar
          activeTab={activeView}
          onTabChange={setActiveView}
          tabs={tabs}
        />
        
        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    );
  }
  
  // واجهة سطح المكتب
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">لوحة التحكم</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* بطاقات المقاييس */}
          <EnhancedMobileMetricCard
            title="المركبات"
            value={stats?.totalVehicles || 0}
            change={stats?.vehicleChange || 0}
            icon={Car}
            color="bg-blue-500"
            onClick={() => navigate('/vehicles')}
            isOffline={isOffline}
          />
          <EnhancedMobileMetricCard
            title="العقود النشطة"
            value={stats?.activeContracts || 0}
            change={stats?.contractChange || 0}
            icon={FileText}
            color="bg-green-500"
            onClick={() => navigate('/contracts')}
            isOffline={isOffline}
          />
          <EnhancedMobileMetricCard
            title="العملاء"
            value={stats?.totalCustomers || 0}
            change={stats?.customerChange || 0}
            icon={Users}
            color="bg-purple-500"
            onClick={() => navigate('/customers')}
            isOffline={isOffline}
          />
          <EnhancedMobileMetricCard
            title="المدفوعات"
            value={formatCurrency(stats?.monthlyRevenue || 0)}
            change={stats?.revenueChange || 0}
            icon={CreditCard}
            color="bg-rose-500"
            onClick={() => navigate('/payments')}
            isOffline={isOffline}
          />
        </div>
      </div>
    </div>
  );
};

export default MobileEnhancedDashboard;
