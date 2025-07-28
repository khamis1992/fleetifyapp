import React from 'react';
import { PerformanceMonitoring } from '@/components/performance/PerformanceMonitoring';
import { useHasCompanyAdminAccess } from '@/hooks/useCompanyScope';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

const PerformancePage: React.FC = () => {
  const hasAdminAccess = useHasCompanyAdminAccess();

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              تحتاج إلى صلاحيات إدارية للوصول إلى مراقبة الأداء
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">مراقبة الأداء</h1>
            <p className="text-muted-foreground">مراقبة أداء النظام والتنبيهات في الوقت الفعلي</p>
          </div>
        </div>

        <PerformanceMonitoring />
      </div>
    </div>
  );
};

export default PerformancePage;