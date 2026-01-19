import React from 'react';
import { BackupManagement } from '@/components/admin/BackupManagement';
import { useHasGlobalAccess } from '@/hooks/useCompanyScope';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

const BackupPage: React.FC = () => {
  const hasGlobalAccess = useHasGlobalAccess();

  if (!hasGlobalAccess) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              تحتاج إلى صلاحيات النظام للوصول إلى إدارة النسخ الاحتياطية
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
            <Database className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة النسخ الاحتياطية</h1>
            <p className="text-muted-foreground">إنشاء واستعادة النسخ الاحتياطية للنظام</p>
          </div>
        </div>

        <BackupManagement />
      </div>
    </div>
  );
};

export default BackupPage;