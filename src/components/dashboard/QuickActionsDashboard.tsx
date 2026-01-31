import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  Calculator,
  Search,
  Download,
  Upload,
  Clock,
  Zap,
  Gavel,
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { EnhancedCustomerDialog } from '@/components/customers/EnhancedCustomerForm';
import { VehicleForm } from '@/components/fleet/VehicleForm';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
  badge?: string;
  permission?: string;
  requiresAdmin?: boolean;
  requiresCompanyAccess?: boolean;
}

const QuickActionsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasCompanyAdminAccess, companyId } = useUnifiedCompanyAccess();
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [showCreateContract, setShowCreateContract] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'add-customer',
      title: 'إضافة عميل جديد',
      description: 'تسجيل عميل جديد في النظام',
      icon: Users,
      color: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/30',
      route: '/customers',
      badge: 'شائع',
      requiresCompanyAccess: true
    },
    {
      id: 'add-vehicle',
      title: 'إضافة مركبة',
      description: 'تسجيل مركبة جديدة في الأسطول',
      icon: Car,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/fleet',
      badge: 'سريع',
      requiresAdmin: true
    },
    {
      id: 'create-contract',
      title: 'إنشاء عقد',
      description: 'إنشاء عقد إيجار جديد',
      icon: FileText,
      color: 'from-accent/20 to-accent/10 border-accent/30 hover:border-accent/40',
      route: '/contracts',
      requiresAdmin: true
    },
    {
      id: 'record-payment',
      title: 'تسجيل دفعة',
      description: 'واجهة متقدمة لتسجيل وإدارة الدفعات',
      icon: DollarSign,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/payments/quick-payment',
      requiresAdmin: true
    },
    {
      id: 'financial-calculator',
      title: 'الحاسبة المالية',
      description: 'احتساب التكاليف والأرباح',
      icon: Calculator,
      color: 'from-warning/10 to-warning/5 border-warning/20 hover:border-warning/30',
      route: '/finance/calculator',
      requiresCompanyAccess: true
    },
    {
      id: 'search-records',
      title: 'البحث المتقدم',
      description: 'البحث في جميع سجلات النظام',
      icon: Search,
      color: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/30',
      route: '/search',
      requiresCompanyAccess: true
    },
    {
      id: 'lawsuit-data',
      title: 'بيانات التقاضي',
      description: 'عرض وإدارة بيانات القضايا المُنشأة',
      icon: Database,
      color: 'from-teal-50 to-teal-100 border-teal-300 hover:border-teal-400',
      route: '/legal/lawsuit-data',
      badge: 'جديد',
      requiresAdmin: true
    },
    {
      id: 'delinquency',
      title: 'إدارة المتعثرات',
      description: 'متابعة العملاء المتعثرين ماليًا',
      icon: Gavel,
      color: 'from-red-50 to-red-100 border-red-300 hover:border-red-400',
      route: '/legal/delinquency',
      requiresAdmin: true
    }
  ];

  const recentActions: QuickAction[] = [
    {
      id: 'export-data',
      title: 'تصدير البيانات',
      description: 'تصدير التقارير والبيانات',
      icon: Download,
      color: 'from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/30',
      route: '/reports',
      requiresCompanyAccess: true
    },
    {
      id: 'import-data',
      title: 'استيراد البيانات',
      description: 'استيراد بيانات من ملفات CSV',
      icon: Upload,
      color: 'from-warning/10 to-warning/5 border-warning/20 hover:border-warning/30',
      route: '/import',
      requiresAdmin: true
    }
  ];

  // تصفية الإجراءات بناءً على الصلاحيات
  const filterActionsByPermissions = (actions: QuickAction[]) => {
    return actions.filter(action => {
      // إذا كان الإجراء يتطلب صلاحيات إدارية
      if (action.requiresAdmin && !hasCompanyAdminAccess) {
        return false;
      }
      
      // إذا كان الإجراء يتطلب وصول للشركة
      if (action.requiresCompanyAccess && !companyId) {
        return false;
      }
      
      return true;
    });
  };

  const availableQuickActions = filterActionsByPermissions(quickActions);
  const availableRecentActions = filterActionsByPermissions(recentActions);

  const handleActionClick = (action: QuickAction) => {
    // التحقق من الصلاحيات قبل التنقل
    if (action.requiresAdmin && !hasCompanyAdminAccess) {
      toast.error('تحتاج إلى صلاحيات إدارية للوصول لهذه الميزة');
      return;
    }
    
    if (action.requiresCompanyAccess && !companyId) {
      toast.error('تحتاج إلى الانتماء لشركة للوصول لهذه الميزة');
      return;
    }
    
    // معالجة خاصة للإجراءات التي تفتح dialogs
    if (action.id === 'add-customer') {
      setShowCreateCustomer(true);
      return;
    }
    
    if (action.id === 'add-vehicle') {
      setShowCreateVehicle(true);
      return;
    }
    
    if (action.id === 'create-contract') {
      setShowCreateContract(true);
      return;
    }
    
    if (action.id === 'record-payment') {
      // التنقل إلى صفحة تسجيل الدفعات المحسّنة
      navigate('/payments/quick-payment');
      return;
    }
    
    navigate(action.route);
  };

  const handleCustomerCreated = (customer: any) => {
    setShowCreateCustomer(false);
    toast.success('تم إنشاء العميل بنجاح');
  };

  const handleVehicleCreated = () => {
    setShowCreateVehicle(false);
    toast.success('تم إضافة المركبة بنجاح');
  };

  const handleContractCreated = (contract: any) => {
    setShowCreateContract(false);
    toast.success('تم إنشاء العقد بنجاح');
  };

  const ActionButton = ({ action, index, variant = 'default' }: { 
    action: QuickAction; 
    index: number; 
    variant?: 'default' | 'compact' 
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`cursor-pointer transition-smooth bg-gradient-card shadow-card hover:shadow-elevated ${action.color} border group`}
        onClick={() => handleActionClick(action)}
        title={`انقر للانتقال إلى ${action.title}`}
        data-tour={action.id}
      >
        <CardContent className={variant === 'compact' ? 'p-4' : 'p-6'}>
          <div className="flex items-start gap-4">
            <motion.div 
              className="p-3 rounded-lg bg-background/80 group-hover:bg-background/90 transition-smooth"
              whileHover={{ rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <action.icon size={variant === 'compact' ? 20 : 24} className="text-foreground/80" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className={`font-semibold text-foreground group-hover:text-foreground/90 transition-colors ${
                  variant === 'compact' ? 'text-sm' : 'text-base'
                }`}>
                  {action.title}
                </h3>
                {action.badge && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-background/80 text-foreground/80 border-border/40"
                  >
                    {action.badge}
                  </Badge>
                )}
              </div>
              <p className={`text-muted-foreground group-hover:text-muted-foreground/90 transition-smooth ${
                variant === 'compact' ? 'text-xs' : 'text-sm'
              }`}>
                {action.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <>
      {/* Quick Actions Grid */}
      <motion.section 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
          </div>
          
          {/* Header */}
          <div className="relative mb-8">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-slate-900 mb-2">ابدأ بسرعة</h3>
              <p className="text-slate-600 text-lg">اختر إجراء لتنفيذه بنقرة واحدة</p>
            </div>
          </div>
          
          {/* Actions Grid */}
          {availableQuickActions.length > 0 ? (
            <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* عقد جديد */}
              <motion.div 
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0 }}
                whileHover={{ y: -4 }}
              >
                <button 
                  onClick={() => handleActionClick(quickActions[2])}
                  className="w-full h-full p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 hover:from-red-500 hover:to-red-600 border border-red-200 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/90 transition-all">
                      <FileText className="w-7 h-7 text-red-600 group-hover:text-red-700" />
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-white text-sm text-center">عقد جديد</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-red-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-300"></div>
                </button>
              </motion.div>
              
              {/* إضافة مركبة */}
              <motion.div 
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                whileHover={{ y: -4 }}
              >
                <button 
                  onClick={() => handleActionClick(quickActions[1])}
                  className="w-full h-full p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-500 hover:to-orange-600 border border-orange-200 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/90 transition-all">
                      <Car className="w-7 h-7 text-orange-600 group-hover:text-orange-700" />
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-white text-sm text-center">إضافة مركبة</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-300"></div>
                </button>
              </motion.div>
              
              {/* عميل جديد */}
              <motion.div
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                whileHover={{ y: -4 }}
              >
                <button
                  onClick={() => handleActionClick(quickActions[0])}
                  className="w-full h-full p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-500 hover:to-blue-600 border border-blue-200 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/90 transition-all">
                      <Users className="w-7 h-7 text-blue-600 group-hover:text-blue-700" />
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-white text-sm text-center">عميل جديد</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-300"></div>
                </button>
              </motion.div>
              
              {/* تسجيل دفعة */}
              <motion.div 
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                whileHover={{ y: -4 }}
              >
                <button 
                  onClick={() => handleActionClick(quickActions[3])}
                  className="w-full h-full p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-500 hover:to-yellow-600 border border-amber-200 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/90 transition-all">
                      <DollarSign className="w-7 h-7 text-amber-600 group-hover:text-amber-700" />
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-white text-sm text-center">تسجيل دفعة</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-300"></div>
                </button>
              </motion.div>
              
              {/* الحاسبة المالية */}
              <motion.div 
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                whileHover={{ y: -4 }}
              >
                <button 
                  onClick={() => handleActionClick(quickActions[4])}
                  className="w-full h-full p-6 rounded-2xl bg-gradient-to-br from-red-50 to-pink-100 hover:from-red-600 hover:to-pink-600 border border-pink-200 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/90 transition-all">
                      <Calculator className="w-7 h-7 text-pink-600 group-hover:text-pink-700" />
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-white text-sm text-center">الحاسبة المالية</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-pink-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-300"></div>
                </button>
              </motion.div>
              
              {/* البحث المتقدم */}
              <motion.div 
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <button 
                  onClick={() => handleActionClick(quickActions[5])}
                  className="w-full h-full p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-red-100 hover:from-orange-600 hover:to-red-600 border border-orange-200 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/90 transition-all">
                      <Search className="w-7 h-7 text-orange-600 group-hover:text-orange-700" />
                    </div>
                    <span className="font-semibold text-slate-800 group-hover:text-white text-sm text-center">البحث المتقدم</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-300"></div>
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-semibold mb-2">لا توجد إجراءات متاحة</p>
              <p className="text-sm">تحتاج إلى صلاحيات إضافية للوصول للإجراءات السريعة</p>
            </div>
          )}
          
          {/* Keyboard Shortcuts Hint */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded">K</kbd>
                <span className="mr-2">لفتح قائمة الإجراءات السريعة</span>
              </span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Customer Creation Dialog */}
      <EnhancedCustomerDialog
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onSuccess={handleCustomerCreated}
        onCancel={() => setShowCreateCustomer(false)}
        context="standalone"
      />

      {/* Vehicle Creation Dialog */}
      <VehicleForm
        open={showCreateVehicle}
        onOpenChange={(open) => {
          setShowCreateVehicle(open);
          if (!open) handleVehicleCreated();
        }}
      />

      {/* Contract Creation Dialog - الموحد */}
      <SimpleContractWizard
        open={showCreateContract}
        onOpenChange={setShowCreateContract}
      />
    </>
  );
};

export default QuickActionsDashboard;