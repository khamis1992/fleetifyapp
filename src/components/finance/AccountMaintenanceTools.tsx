import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Search,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  Database
} from 'lucide-react';
import {
  useVerifyAccountIntegrity,
  useCleanupOrphanedReferences
} from '@/hooks/useEnhancedAccountDeletion';
import AccountDeletionLogViewer from './AccountDeletionLogViewer';

interface AccountMaintenanceToolsProps {
  className?: string;
}

export const AccountMaintenanceTools: React.FC<AccountMaintenanceToolsProps> = ({
  className
}) => {
  const [lastIntegrityCheck, setLastIntegrityCheck] = useState<any>(null);
  const [lastCleanup, setLastCleanup] = useState<any>(null);

  const verifyIntegrity = useVerifyAccountIntegrity();
  const cleanupOrphaned = useCleanupOrphanedReferences();

  const handleIntegrityCheck = async () => {
    try {
      const result = await verifyIntegrity.mutateAsync();
      setLastIntegrityCheck(result);
    } catch (error) {
      console.error('فشل فحص السلامة:', error);
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await cleanupOrphaned.mutateAsync();
      setLastCleanup(result);
      // إعادة فحص السلامة بعد التنظيف
      setTimeout(() => {
        handleIntegrityCheck();
      }, 1000);
    } catch (error) {
      console.error('فشل التنظيف:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          أدوات صيانة الحسابات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* فحص سلامة البيانات */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Search className="h-4 w-4" />
              فحص سلامة البيانات
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleIntegrityCheck}
              disabled={verifyIntegrity.isPending}
            >
              {verifyIntegrity.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              فحص الآن
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            فحص وجود مراجع معلقة أو حسابات محذوفة مرتبطة ببيانات أخرى
          </p>
          
          {lastIntegrityCheck && (
            <Alert>
              {lastIntegrityCheck.integrity_status === 'clean' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {lastIntegrityCheck.integrity_status === 'clean' ? (
                  'جميع البيانات سليمة ولا توجد مشاكل'
                ) : (
                  `تم العثور على ${lastIntegrityCheck.issues_found} مشكلة في البيانات`
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* تنظيف البيانات المعلقة */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              تنظيف البيانات المعلقة
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanup}
              disabled={cleanupOrphaned.isPending}
            >
              {cleanupOrphaned.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              تنظيف الآن
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            إزالة المراجع المعلقة للحسابات المحذوفة من جميع الجداول
          </p>
          
          {lastCleanup && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {lastCleanup.message}
                {lastCleanup.cleaned_records && (
                  <div className="mt-2">
                    {Object.entries(lastCleanup.cleaned_records).map(([table, count]) => (
                      <Badge key={table} variant="outline" className="mr-2 mb-1">
                        {table}: {count as number}
                      </Badge>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* سجل العمليات */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            سجل العمليات
          </h4>
          
          <p className="text-sm text-muted-foreground">
            عرض تاريخ جميع عمليات حذف الحسابات والبيانات المتأثرة
          </p>
          
          <AccountDeletionLogViewer
            trigger={
              <Button variant="outline" size="sm" className="w-full">
                <Database className="h-4 w-4 mr-2" />
                عرض السجل الكامل
              </Button>
            }
          />
        </div>

        <Separator />

        {/* إرشادات الاستخدام */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            إرشادات الاستخدام
          </h4>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>إلغاء التفعيل:</strong> آمن للحسابات التي تحتوي على بيانات مهمة
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>النقل والحذف:</strong> لنقل البيانات إلى حساب آخر ثم حذف الحساب
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>الحذف القسري:</strong> حذف نهائي - استخدم بحذر شديد
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountMaintenanceTools;
