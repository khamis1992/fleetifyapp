import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Bulk tenant mutations must be implemented as audited server-side commands.
 * The previous UI only animated progress over hard-coded companies.
 */
export const BulkOperations: React.FC = () => (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>العمليات الجماعية غير مفعلة</AlertTitle>
    <AlertDescription>
      لا توجد أوامر خادم مدققة لتنفيذ تغييرات جماعية على الشركات. تم تعطيل المحاكاة التي كانت تعرض نجاحًا دون تعديل البيانات.
    </AlertDescription>
  </Alert>
);
