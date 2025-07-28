import React from 'react';
import { SubscriptionManagement } from '@/components/subscription/SubscriptionManagement';
import { useHasCompanyAdminAccess } from '@/hooks/useCompanyScope';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';

const SubscriptionPage: React.FC = () => {
  const hasAdminAccess = useHasCompanyAdminAccess();

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              تحتاج إلى صلاحيات إدارية للوصول إلى إعدادات الاشتراك
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
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراك</h1>
            <p className="text-muted-foreground">إدارة خطة الاشتراك والميزات المتاحة</p>
          </div>
        </div>

        <SubscriptionManagement />
      </div>
    </div>
  );
};

export default SubscriptionPage;