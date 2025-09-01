import React from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
  badge?: string;
  permission?: string;
}

const QuickActionsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const quickActions: QuickAction[] = [
    {
      id: 'add-customer',
      title: 'إضافة عميل جديد',
      description: 'تسجيل عميل جديد في النظام',
      icon: Users,
      color: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/30',
      route: '/customers',
      badge: 'شائع'
    },
    {
      id: 'add-vehicle',
      title: 'إضافة مركبة',
      description: 'تسجيل مركبة جديدة في الأسطول',
      icon: Car,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/fleet',
      badge: 'سريع'
    },
    {
      id: 'create-contract',
      title: 'إنشاء عقد',
      description: 'إنشاء عقد إيجار جديد',
      icon: FileText,
      color: 'from-accent/20 to-accent/10 border-accent/30 hover:border-accent/40',
      route: '/contracts'
    },
    {
      id: 'record-payment',
      title: 'تسجيل دفعة',
      description: 'تسجيل دفعة مالية جديدة',
      icon: DollarSign,
      color: 'from-success/10 to-success/5 border-success/20 hover:border-success/30',
      route: '/finance/payments'
    },
    {
      id: 'financial-calculator',
      title: 'الحاسبة المالية',
      description: 'احتساب التكاليف والأرباح',
      icon: Calculator,
      color: 'from-warning/10 to-warning/5 border-warning/20 hover:border-warning/30',
      route: '/finance/calculator'
    },
    {
      id: 'search-records',
      title: 'البحث المتقدم',
      description: 'البحث في جميع سجلات النظام',
      icon: Search,
      color: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/30',
      route: '/search'
    }
  ];

  const recentActions: QuickAction[] = [
    {
      id: 'export-data',
      title: 'تصدير البيانات',
      description: 'تصدير التقارير والبيانات',
      icon: Download,
      color: 'from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/30',
      route: '/reports'
    },
    {
      id: 'import-data',
      title: 'استيراد البيانات',
      description: 'استيراد بيانات من ملفات CSV',
      icon: Upload,
      color: 'from-warning/10 to-warning/5 border-warning/20 hover:border-warning/30',
      route: '/import'
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    navigate(action.route);
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className={`cursor-pointer transition-smooth bg-gradient-card shadow-card hover:shadow-elevated ${action.color} border group`}
              onClick={() => handleActionClick(action)}
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
          </TooltipTrigger>
          <TooltipContent>
            <p>انقر للانتقال إلى {action.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );

  return (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <ActionButton key={action.id} action={action} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>


    </div>
  );
};

export default QuickActionsDashboard;