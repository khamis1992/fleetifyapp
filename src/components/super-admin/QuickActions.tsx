import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Settings, 
  FileText, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Database,
  Bell,
  BarChart3,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAction = (actionType: string, route?: string) => {
    if (route) {
      navigate(route);
    } else {
      // إجراءات خاصة
      switch (actionType) {
        case 'database_health':
          toast.info('جاري فحص صحة قاعدة البيانات...');
          // يمكن إضافة منطق فحص قاعدة البيانات هنا
          break;
        case 'system_alerts':
          toast.info('عرض تنبيهات النظام');
          break;
        case 'notifications':
          toast.info('إرسال إشعارات النظام');
          break;
        default:
          toast.info(`تم النقر على: ${actionType}`);
      }
    }
  };

  const actions = [
    {
      label: 'إضافة شركة',
      description: 'إنشاء حساب شركة جديد',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      route: '/super-admin/companies',
      badge: 'شائع',
      action: () => handleAction('add_company', '/super-admin/companies')
    },
    {
      label: 'إعدادات النظام',
      description: 'تكوين معاملات النظام',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      route: '/super-admin/settings',
      action: () => handleAction('system_settings', '/super-admin/settings')
    },
    {
      label: 'تقارير النظام',
      description: 'عرض تحليلات وتقارير النظام',
      icon: BarChart3,
      color: 'from-green-500 to-green-600',
      route: '/reports',
      action: () => handleAction('system_reports', '/reports')
    },
    {
      label: 'إدارة المستخدمين',
      description: 'إدارة مستخدمي النظام',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      route: '/super-admin/users',
      action: () => handleAction('user_management', '/super-admin/users')
    },
    {
      label: 'الأمان والحماية',
      description: 'إعدادات الأمان والمراقبة',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      route: '/super-admin/security',
      badge: 'مهم',
      action: () => handleAction('security', '/super-admin/security')
    },
    {
      label: 'تنبيهات النظام',
      description: 'عرض وإدارة تنبيهات النظام',
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      action: () => handleAction('system_alerts')
    },
    {
      label: 'صحة قاعدة البيانات',
      description: 'مراقبة وفحص حالة قاعدة البيانات',
      icon: Database,
      color: 'from-teal-500 to-teal-600',
      action: () => handleAction('database_health')
    },
    {
      label: 'إدارة الإشعارات',
      description: 'إرسال وإدارة إشعارات النظام',
      icon: Bell,
      color: 'from-indigo-500 to-indigo-600',
      action: () => handleAction('notifications')
    }
  ];

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">الإجراءات السريعة</CardTitle>
          <Badge variant="outline" className="text-xs">
            مدير النظام
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-3 hover:shadow-card transition-all duration-300 group border-border/50 hover:border-primary/20 relative"
              onClick={action.action}
            >
              {action.badge && (
                <Badge 
                  variant={action.badge === 'مهم' ? 'destructive' : 'secondary'}
                  className="absolute -top-2 -right-2 text-xs"
                >
                  {action.badge}
                </Badge>
              )}
              <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {action.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};