import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedSecurityDashboard } from './EnhancedSecurityDashboard';
import { SecurityActionsPanel } from './SecurityActionsPanel';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { 
  Shield, 
  Settings, 
  BarChart3,
  AlertTriangle 
} from 'lucide-react';

export const UnifiedPerformanceDashboard: React.FC = () => {
  const { hasCompanyAdminAccess } = useUnifiedCompanyAccess();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة مراقبة الأداء والأمان</h1>
          <p className="text-muted-foreground">
            مراقبة شاملة لأداء النظام والأمان مع أدوات التحسين المتقدمة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-600">النظام آمن</span>
        </div>
      </div>

      {hasCompanyAdminAccess ? (
        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              مراقبة الأداء
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              أدوات الإدارة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="space-y-6">
            <EnhancedSecurityDashboard />
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <SecurityActionsPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                وصول محدود
              </p>
              <p className="text-xs text-yellow-600">
                تحتاج صلاحيات إدارية للوصول الكامل لأدوات المراقبة والإدارة
              </p>
            </div>
          </div>
          <EnhancedSecurityDashboard />
        </div>
      )}
    </div>
  );
};