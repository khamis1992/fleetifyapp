import React from 'react';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { useHasCompanyAdminAccess } from '@/hooks/useCompanyScope';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const AuditPage: React.FC = () => {
  const hasAdminAccess = useHasCompanyAdminAccess();

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              تحتاج إلى صلاحيات إدارية للوصول إلى سجل العمليات
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
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">سجل العمليات</h1>
            <p className="text-muted-foreground">مراجعة جميع العمليات والأنشطة في النظام</p>
          </div>
        </div>

        <AuditLogViewer />
      </div>
    </div>
  );
};

export default AuditPage;