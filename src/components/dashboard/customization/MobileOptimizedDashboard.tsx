import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, 
  List, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Car, 
  FileText, 
  Users, 
  CreditCard, 
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';

// أنواع عرض لوحة التحكم للأجهزة المحمولة
enum ViewMode {
  GRID = 'grid',
  LIST = 'list',
  COMPACT = 'compact'
}

// تعريف واجهة للبطاقة الأساسية
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  compact?: boolean;
}

// بطاقة مقياس للهاتف المحمول
const MobileMetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  onClick,
  compact = false 
}) => {
  if (compact) {
    return (
      <motion.div
        className={cn(
          "bg-white rounded-lg p-3 shadow-sm flex items-center gap-3 cursor-pointer",
          "active:scale-95 transition-transform"
        )}
        onClick={onClick}
        whileTap={{ scale: 0.95 }}
      >
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-neutral-500">{title}</p>
          <p className="text-lg font-bold text-neutral-900">{value}</p>
          {change && (
            <p className="text-xs text-green-600">{change}</p>
          )}
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl p-4 shadow-sm cursor-pointer",
        "active:scale-95 transition-transform"
      )}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-neutral-600" />
        {change && (
          <span className="text-xs font-medium text-green-600">{change}</span>
        )}
      </div>
      <h3 className="text-sm text-neutral-500 mb-1">{title}</h3>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
    </motion.div>
  );
};

// قائمة سريعة للتنقل على الهاتف
const MobileQuickNav: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onItemClick: (item: string) => void;
}> = ({ isVisible, onClose, onItemClick }) => {
  const navigate = useNavigate();
  
  const quickActions = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'fleet', label: 'الأسطول', icon: Car },
    { id: 'contracts', label: 'العقود', icon: FileText },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'payments', label: 'المدفوعات', icon: CreditCard },
    { id: 'search', label: 'البحث', icon: Search },
    { id: 'calendar', label: 'التقويم', icon: Calendar },
    { id: 'analytics', label: 'التحليلات', icon: TrendingUp }
  ];
  
  const handleItemClick = (item: string) => {
    onItemClick(item);
    onClose();
    
    // التنقل إلى الصفحة المناسبة
    switch (item) {
      case 'home':
        navigate('/dashboard');
        break;
      case 'fleet':
        navigate('/fleet');
        break;
      case 'contracts':
        navigate('/contracts');
        break;
      case 'customers':
        navigate('/customers');
        break;
      case 'payments':
        navigate('/finance/payments');
        break;
      case 'search':
        navigate('/search');
        break;
      case 'calendar':
        navigate('/fleet/reservations');
        break;
      case 'analytics':
        navigate('/reports');
        break;
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h2 className="text-lg font-bold text-neutral-900">التنقل السريع</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-2">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleItemClick(action.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <action.icon className="w-5 h-5 text-neutral-600" />
                    <span className="font-medium text-neutral-900">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// مكون لوحة التحكم للهاتف
export const MobileOptimizedDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [currentPage, setCurrentPage] = useState(0);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // التحقق من حجم الشاشة
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  
  // تحديد عدد البطاقات في الصفحة الواحدة حسب حجم الشاشة
  const cardsPerPage = isMobile ? 4 : isTablet ? 6 : 8;
  
  // البيانات للعرض
  const metrics = [
    {
      id: 'vehicles',
      title: 'المركبات',
      value: stats?.totalVehicles || 0,
      change: '+5%',
      icon: Car,
      color: 'bg-blue-500',
      onClick: () => navigate('/fleet')
    },
    {
      id: 'contracts',
      title: 'العقود',
      value: stats?.activeContracts || 0,
      change: '+3%',
      icon: FileText,
      color: 'bg-green-500',
      onClick: () => navigate('/contracts')
    },
    {
      id: 'customers',
      title: 'العملاء',
      value: stats?.totalCustomers || 0,
      change: '+12%',
      icon: Users,
      color: 'bg-amber-500',
      onClick: () => navigate('/customers')
    },
    {
      id: 'revenue',
      title: 'الإيرادات',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      change: '+8%',
      icon: CreditCard,
      color: 'bg-purple-500',
      onClick: () => navigate('/finance')
    }
  ];
  
  // البطاقات في الصفحة الحالية
  const currentCards = metrics.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage
  );
  
  // إجمالي الصفحات
  const totalPages = Math.ceil(metrics.length / cardsPerPage);
  
  // الانتقال للصفحة التالية
  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  // الانتقال للصفحة السابقة
  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // إعادة تعيين الصفحة عند تغيير وضع العرض
  useEffect(() => {
    setCurrentPage(0);
  }, [viewMode]);
  
  // إعادة تعيين الصفحة عند تغيير حجم الشاشة
  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile, isTablet]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-neutral-200 rounded w-3/4 mb-1"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* رأس الصفحة للهاتف */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQuickNavOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-neutral-700" />
            </button>
            
            <h1 className="text-lg font-bold text-neutral-900">لوحة التحكم</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <UnifiedNotificationBell />
          </div>
        </div>
        
        {/* شريط البحث والفلترة */}
        <div className="px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="البحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-10 py-2 bg-neutral-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              <Filter className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
          
          {/* خيارات الفلترة */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-neutral-200"
              >
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    الكل
                  </button>
                  <button className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                    المركبات
                  </button>
                  <button className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                    العقود
                  </button>
                  <button className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                    العملاء
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      
      {/* المحتوى الرئيسي */}
      <main className="p-4">
        {/* أزرار تغيير وضع العرض */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-neutral-700">
            عرض البيانات
          </h2>
          
          <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-lg">
            <button
              onClick={() => setViewMode(ViewMode.GRID)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === ViewMode.GRID ? "bg-white shadow-sm" : ""
              )}
            >
              <Grid className="w-4 h-4 text-neutral-700" />
            </button>
            <button
              onClick={() => setViewMode(ViewMode.LIST)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === ViewMode.LIST ? "bg-white shadow-sm" : ""
              )}
            >
              <List className="w-4 h-4 text-neutral-700" />
            </button>
            <button
              onClick={() => setViewMode(ViewMode.COMPACT)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === ViewMode.COMPACT ? "bg-white shadow-sm" : ""
              )}
            >
              <Layers className="w-4 h-4 text-neutral-700" />
            </button>
          </div>
        </div>
        
        {/* عرض البطاقات حسب وضع العرض */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={
              viewMode === ViewMode.GRID ? "grid grid-cols-2 gap-4" :
              viewMode === ViewMode.LIST ? "space-y-3" :
              "space-y-3"
            }
          >
            {currentCards.map((metric, index) => (
              <MobileMetricCard
                key={metric.id}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                icon={metric.icon}
                color={metric.color}
                onClick={metric.onClick}
                compact={viewMode === ViewMode.COMPACT}
              />
            ))}
          </motion.div>
        </AnimatePresence>
        
        {/* أزرار التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                currentPage === 0
                  ? "bg-neutral-100 text-neutral-400"
                  : "bg-white border border-neutral-200 text-neutral-700"
              )}
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === currentPage ? "bg-blue-500" : "bg-neutral-300"
                  )}
                />
              ))}
            </div>
            
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                currentPage === totalPages - 1
                  ? "bg-neutral-100 text-neutral-400"
                  : "bg-white border border-neutral-200 text-neutral-700"
              )}
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* إشعار مهم للتحسينات المستقبلية */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">نصائح للتحسين</h3>
              <p className="text-xs text-blue-700 mt-1">
                يمكنك سحب البطاقات لإعادة ترتيبها، أو الضغط مطولاً لإضافة اختصارات للشاشة الرئيسية.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* القائمة السريعة */}
      <MobileQuickNav
        isVisible={isQuickNavOpen}
        onClose={() => setIsQuickNavOpen(false)}
        onItemClick={(item) => console.log('Clicked:', item)}
      />
    </div>
  );
};

export default MobileOptimizedDashboard;
