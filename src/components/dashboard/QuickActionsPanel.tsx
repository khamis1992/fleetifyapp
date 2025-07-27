import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Users, 
  Car, 
  Calculator,
  Settings,
  BarChart3,
  Zap
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
  category: 'create' | 'manage' | 'analyze' | 'configure';
  priority?: boolean;
}

interface QuickActionsPanelProps {
  actions?: QuickAction[];
  loading?: boolean;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ 
  actions = [], 
  loading = false 
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'create': return 'bg-success/10 text-success border-success/20';
      case 'manage': return 'bg-primary/10 text-primary border-primary/20';
      case 'analyze': return 'bg-accent/10 text-accent-foreground border-accent/20';
      case 'configure': return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-glass backdrop-blur-sm border-0 shadow-glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded animate-pulse" />
            <div className="w-24 h-5 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultActions: QuickAction[] = [
    {
      id: '1',
      title: 'عقد جديد',
      description: 'إضافة عقد إيجار جديد',
      icon: FileText,
      action: () => console.log('Navigate to new contract'),
      category: 'create',
      priority: true
    },
    {
      id: '2',
      title: 'عميل جديد',
      description: 'تسجيل عميل جديد',
      icon: Users,
      action: () => console.log('Navigate to new customer'),
      category: 'create'
    },
    {
      id: '3',
      title: 'مركبة جديدة',
      description: 'إضافة مركبة للأسطول',
      icon: Car,
      action: () => console.log('Navigate to new vehicle'),
      category: 'create'
    },
    {
      id: '4',
      title: 'التقارير المالية',
      description: 'عرض التقارير والتحليلات',
      icon: BarChart3,
      action: () => console.log('Navigate to reports'),
      category: 'analyze'
    },
    {
      id: '5',
      title: 'إدارة الحسابات',
      description: 'إدارة الحسابات المالية',
      icon: Calculator,
      action: () => console.log('Navigate to accounts'),
      category: 'manage'
    },
    {
      id: '6',
      title: 'الإعدادات',
      description: 'إعدادات النظام',
      icon: Settings,
      action: () => console.log('Navigate to settings'),
      category: 'configure'
    }
  ];

  const displayActions = actions.length > 0 ? actions : defaultActions;

  return (
    <Card className="bg-gradient-glass backdrop-blur-sm border-0 shadow-glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          إجراءات سريعة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {displayActions.map((action, index) => {
            const ActionIcon = action.icon;
            
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="relative"
              >
                <Button
                  variant="ghost"
                  onClick={action.action}
                  className={`w-full h-auto p-4 flex flex-col items-center gap-2 rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${getCategoryColor(action.category)}`}
                >
                  {action.priority && (
                    <Badge className="absolute -top-1 -right-1 w-2 h-2 p-0 bg-destructive border-0" />
                  )}
                  
                  <ActionIcon size={20} />
                  
                  <div className="text-center">
                    <div className="text-sm font-medium leading-tight">
                      {action.title}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel;