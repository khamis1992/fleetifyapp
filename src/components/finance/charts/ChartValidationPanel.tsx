import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Wrench, 
  RefreshCw,
  FileSearch,
  Users,
  Network,
  Hash,
  GitBranch
} from 'lucide-react';
import { useChartValidation, useFixChartHierarchy } from '@/hooks/useChartValidation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const ChartValidationPanel: React.FC = () => {
  const { data: validation, isLoading, refetch } = useChartValidation();
  const fixHierarchy = useFixChartHierarchy();

  const getIssueIcon = (issueType: string) => {
    const iconProps = { className: "h-4 w-4" };
    switch (issueType) {
      case 'orphaned_accounts':
        return <Users {...iconProps} />;
      case 'circular_references':
        return <Network {...iconProps} />;
      case 'incorrect_levels':
        return <GitBranch {...iconProps} />;
      case 'duplicate_codes':
        return <Hash {...iconProps} />;
      case 'missing_parents':
        return <FileSearch {...iconProps} />;
      default:
        return <AlertTriangle {...iconProps} />;
    }
  };

  const getIssueTitle = (issueType: string) => {
    switch (issueType) {
      case 'orphaned_accounts':
        return 'حسابات يتيمة';
      case 'circular_references':
        return 'مراجع دائرية';
      case 'incorrect_levels':
        return 'مستويات خاطئة';
      case 'duplicate_codes':
        return 'أكواد مكررة';
      case 'missing_parents':
        return 'حسابات بدون أب';
      default:
        return issueType;
    }
  };

  const getIssueDescription = (issueType: string) => {
    switch (issueType) {
      case 'orphaned_accounts':
        return 'حسابات تشير إلى حساب أب غير موجود';
      case 'circular_references':
        return 'حسابات تشير لبعضها البعض في حلقة مغلقة';
      case 'incorrect_levels':
        return 'حسابات بمستويات غير صحيحة';
      case 'duplicate_codes':
        return 'أكواد حسابات مكررة';
      case 'missing_parents':
        return 'حسابات تحتاج حساب أب';
      default:
        return 'مشكلة غير محددة';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            التحقق من صحة دليل الحسابات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          التحقق من صحة دليل الحسابات
          {validation?.is_valid ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
        </CardTitle>
        <CardDescription>
          فحص الهيكل الهرمي لدليل الحسابات والتأكد من صحته
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debug information */}
        {validation && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Debug: {JSON.stringify(validation, null, 2)}
          </div>
        )}
        
        {validation?.is_valid ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              دليل الحسابات سليم ولا يحتوي على أخطاء
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تم العثور على {validation?.total_issues} مشكلة في دليل الحسابات
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">المشاكل المكتشفة:</h4>
              <div className="grid gap-3">
                {validation?.issues ? Object.entries(validation.issues).map(([issueType, count]) => {
                  if (count === 0) return null;
                  
                  return (
                    <div key={issueType} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getIssueIcon(issueType)}
                        <div>
                          <div className="font-medium">{getIssueTitle(issueType)}</div>
                          <div className="text-sm text-muted-foreground">
                            {getIssueDescription(issueType)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {count}
                      </Badge>
                    </div>
                  );
                }) : (
                  <div className="text-center text-muted-foreground py-4">
                    لا توجد تفاصيل متاحة عن المشاكل
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={() => fixHierarchy.mutate()}
                disabled={fixHierarchy.isPending}
                className="flex items-center gap-2"
              >
                {fixHierarchy.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                إصلاح المشاكل تلقائياً
              </Button>
              
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                إعادة فحص
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                سيقوم الإصلاح التلقائي بنقل الحسابات اليتيمة إلى المستوى الأول وإعادة حساب جميع المستويات
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};