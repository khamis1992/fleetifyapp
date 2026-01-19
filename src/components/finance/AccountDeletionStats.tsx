import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Trash2, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AccountDeletionStatsProps {
  totalAccounts: number;
  deletedCount: number;
  deactivatedCount: number;
  failedCount: number;
  systemAccounts: number;
  isProcessing?: boolean;
  className?: string;
}

export const AccountDeletionStats: React.FC<AccountDeletionStatsProps> = ({
  totalAccounts,
  deletedCount,
  deactivatedCount,
  failedCount,
  systemAccounts,
  isProcessing = false,
  className
}) => {
  const processedCount = deletedCount + deactivatedCount + failedCount;
  const remainingCount = totalAccounts - processedCount;
  const progressPercentage = totalAccounts > 0 ? (processedCount / totalAccounts) * 100 : 0;
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          إحصائيات حذف الحسابات
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse">
              جاري المعالجة...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* شريط التقدم */}
        {totalAccounts > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>التقدم الإجمالي</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
            <div className="text-xs text-muted-foreground text-center">
              {processedCount} من {totalAccounts} حساب تمت معالجتها
            </div>
          </div>
        )}

        {/* الإحصائيات المفصلة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* إجمالي الحسابات */}
          <div className="p-3 border rounded-lg text-center">
            <Database className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="font-bold text-lg">{totalAccounts}</div>
            <div className="text-xs text-muted-foreground">إجمالي</div>
          </div>
          
          {/* تم حذفها */}
          <div className="p-3 border rounded-lg text-center border-red-200 bg-red-50">
            <Trash2 className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="font-bold text-lg text-red-600">{deletedCount}</div>
            <div className="text-xs text-red-700">تم حذفها</div>
          </div>
          
          {/* تم إلغاء تفعيلها */}
          <div className="p-3 border rounded-lg text-center border-yellow-200 bg-yellow-50">
            <Shield className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="font-bold text-lg text-yellow-600">{deactivatedCount}</div>
            <div className="text-xs text-yellow-700">إلغاء تفعيل</div>
          </div>
          
          {/* فشل */}
          <div className="p-3 border rounded-lg text-center border-slate-200">
            {failedCount > 0 ? (
              <>
                <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="font-bold text-lg text-red-600">{failedCount}</div>
                <div className="text-xs text-red-700">فشل</div>
              </>
            ) : (
              <>
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="font-bold text-lg text-green-600">0</div>
                <div className="text-xs text-green-700">لا أخطاء</div>
              </>
            )}
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            <span>حسابات نظامية: <strong>{systemAccounts}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span>متبقي: <strong>{remainingCount}</strong></span>
          </div>
        </div>

        {/* حالة العملية */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">جاري معالجة الحسابات...</span>
          </div>
        )}

        {/* تحذيرات */}
        {failedCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">
              فشل في حذف {failedCount} حساب - قد تحتاج لتنظيف المراجع المعلقة
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountDeletionStats;
