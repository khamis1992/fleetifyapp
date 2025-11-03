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
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { EnhancedCustomerDialog } from '@/components/customers/EnhancedCustomerForm';
import { VehicleForm } from '@/components/fleet/VehicleForm';
import { EnhancedContractForm } from '@/components/contracts/EnhancedContractForm';
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
      description: 'تسجيل دفعة مالية جديدة',
      icon: DollarSign,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/finance/payments',
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
      // فتح صفحة تسجيل الدفعات الجديدة
      window.open('/payment-sheets/index.html', '_blank');
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
      <div className="space-y-6">
        {/* Primary Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-2 rounded-lg bg-primary/10 text-primary"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Zap size={20} />
                  </motion.div>
                  <div>
                    <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
                    <p className="text-sm text-muted-foreground">العمليات الأكثر استخداماً</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Clock size={10} className="ml-1" />
                  موفر للوقت
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {availableQuickActions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableQuickActions.map((action, index) => (
                    <ActionButton key={action.id} action={action} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>لا توجد إجراءات متاحة</p>
                  <p className="text-sm">تحتاج إلى صلاحيات إضافية للوصول للإجراءات السريعة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

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

      {/* Contract Creation Dialog */}
      <EnhancedContractForm
        open={showCreateContract}
        onOpenChange={setShowCreateContract}
        onSubmit={handleContractCreated}
      />
    </>
  );
};

export default QuickActionsDashboard;