import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Home, 
  Users, 
  FileText, 
  DollarSign, 
  Calculator,
  Search,
  Download,
  Clock,
  Building,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
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

const RealEstateQuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasCompanyAdminAccess, companyId } = useUnifiedCompanyAccess();

  const quickActions: QuickAction[] = [
    {
      id: 'add-property',
      title: 'إضافة عقار جديد',
      description: 'تسجيل عقار جديد في المحفظة',
      icon: Home,
      color: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/30',
      route: '/properties/add',
      badge: 'شائع',
      requiresCompanyAccess: true
    },
    {
      id: 'add-owner',
      title: 'تسجيل مالك',
      description: 'إضافة مالك عقار جديد',
      icon: UserCheck,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/owners',
      badge: 'سريع',
      requiresAdmin: true
    },
    {
      id: 'add-tenant',
      title: 'إضافة مستأجر',
      description: 'تسجيل مستأجر جديد',
      icon: Users,
      color: 'from-accent/20 to-accent/10 border-accent/30 hover:border-accent/40',
      route: '/tenants/add',
      requiresCompanyAccess: true
    },
    {
      id: 'create-contract',
      title: 'إنشاء عقد إيجار',
      description: 'إنشاء عقد إيجار جديد',
      icon: FileText,
      color: 'from-warning/10 to-warning/5 border-warning/20 hover:border-warning/30',
      route: '/property-contracts/add',
      requiresAdmin: true
    },
    {
      id: 'record-payment',
      title: 'تسجيل دفعة',
      description: 'تسجيل دفعة إيجار أو عمولة',
      icon: DollarSign,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/property-payments/add',
      requiresAdmin: true
    },
    {
      id: 'property-reports',
      title: 'تقارير العقارات',
      description: 'عرض تقارير الأداء والإيرادات',
      icon: Download,
      color: 'from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/30',
      route: '/reports/properties',
      requiresCompanyAccess: true
    }
  ];

  // تصفية الإجراءات بناءً على الصلاحيات
  const filterActionsByPermissions = (actions: QuickAction[]) => {
    return actions.filter(action => {
      if (action.requiresAdmin && !hasCompanyAdminAccess) {
        return false;
      }
      
      if (action.requiresCompanyAccess && !companyId) {
        return false;
      }
      
      return true;
    });
  };

  const availableQuickActions = filterActionsByPermissions(quickActions);

  const handleActionClick = (action: QuickAction) => {
    if (action.requiresAdmin && !hasCompanyAdminAccess) {
      toast.error('تحتاج إلى صلاحيات إدارية للوصول لهذه الميزة');
      return;
    }
    
    if (action.requiresCompanyAccess && !companyId) {
      toast.error('تحتاج إلى الانتماء لشركة للوصول لهذه الميزة');
      return;
    }
    
    navigate(action.route);
  };

  const ActionButton = ({ action, index }: { action: QuickAction; index: number }) => (
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
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <motion.div 
              className="p-3 rounded-lg bg-background/80 group-hover:bg-background/90 transition-smooth"
              whileHover={{ rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <action.icon size={24} className="text-foreground/80" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-foreground group-hover:text-foreground/90 transition-colors text-base">
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
              <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/90 transition-smooth">
                {action.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
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
                <Building size={20} />
              </motion.div>
              <div>
                <CardTitle className="text-lg">إجراءات العقارات</CardTitle>
                <p className="text-sm text-muted-foreground">العمليات الأكثر استخداماً للعقارات</p>
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
              <Building size={48} className="mx-auto mb-4 opacity-50" />
              <p>لا توجد إجراءات متاحة</p>
              <p className="text-sm">تحتاج إلى صلاحيات إضافية للوصول للإجراءات السريعة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RealEstateQuickActions;