import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  GitBranch,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useChartValidation, useFixChartHierarchy } from '@/hooks/useChartValidation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const ChartValidationPanel: React.FC = () => {
  const { data: validation, isLoading, refetch } = useChartValidation();
  const fixHierarchy = useFixChartHierarchy();
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  const toggleIssueExpansion = (issueType: string) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueType]: !prev[issueType]
    }));
  };

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

  const renderIssueDetails = (issueType: string, details: any[]) => {
    if (!details || details.length === 0) return null;

    switch (issueType) {
      case 'orphaned_accounts':
        return (
          <div className="space-y-2 mt-3">
            {details.map((account: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <Badge variant="outline" className="text-xs">
                  يتيم
                </Badge>
                <div className="flex flex-col gap-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-medium">{account.account_name_ar || account.account_name}</span>
                    <code className="px-1 py-0.5 bg-background rounded text-xs">
                      {account.account_code}
                    </code>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    يشير إلى حساب أب غير موجود: {account.parent_account_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'duplicate_codes':
        return (
          <div className="space-y-2 mt-3">
            {details.map((duplicate: any, index: number) => (
              <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                <div className="font-medium mb-1 text-right">
                  كود مكرر: <code className="px-1 py-0.5 bg-background rounded text-xs">{duplicate.account_code}</code>
                </div>
                <div className="space-y-1">
                  {duplicate.accounts.map((account: any, idx: number) => (
                    <div key={idx} className="text-xs text-muted-foreground text-right">
                      • {account.account_name_ar || account.account_name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case 'incorrect_levels':
        return (
          <div className="space-y-2 mt-3">
            {details.map((account: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <div className="text-xs text-muted-foreground">
                  المستوى: {account.current_level} ← {account.expected_level}
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-medium">{account.account_name_ar || account.account_name}</span>
                    <code className="px-1 py-0.5 bg-background rounded text-xs">
                      {account.account_code}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <FileSearch className="h-5 w-5" />
            التحقق من صحة دليل الحسابات
          </CardTitle>
        </CardHeader>
        <CardContent dir="rtl">
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
        <CardTitle className="flex items-center gap-2 text-right">
          <FileSearch className="h-5 w-5" />
          التحقق من صحة دليل الحسابات
          {validation?.is_valid ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
        </CardTitle>
        <CardDescription className="text-right">
          فحص الهيكل الهرمي لدليل الحسابات والتأكد من صحته
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" dir="rtl">
        {validation?.is_valid ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-right">
              دليل الحسابات سليم ولا يحتوي على أخطاء
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-right">
                تم العثور على {validation?.total_issues} مشكلة في دليل الحسابات
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium text-right">المشاكل المكتشفة:</h4>
              <div className="grid gap-3">
                {validation?.issues ? Object.entries(validation.issues).map(([issueType, count]) => {
                  const numCount = Number(count);
                  if (numCount === 0) return null;
                  
                  const details = validation?.details?.[issueType as keyof typeof validation.details] || [];
                  const isExpanded = expandedIssues[issueType];
                  
                  return (
                    <div key={issueType} className="border rounded-lg">
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleIssueExpansion(issueType)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                            <Badge variant="destructive">
                              {numCount}
                            </Badge>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-medium flex items-center gap-2 justify-end">
                                  {details.length > 0 && (
                                    isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )
                                  )}
                                  {getIssueTitle(issueType)}
                                </div>
                                <div className="text-sm text-muted-foreground text-right">
                                  {getIssueDescription(issueType)}
                                </div>
                              </div>
                              {getIssueIcon(issueType)}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        {details.length > 0 && (
                          <CollapsibleContent>
                            <div className="px-3 pb-3">
                              {renderIssueDetails(issueType, details)}
                            </div>
                          </CollapsibleContent>
                        )}
                      </Collapsible>
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
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <span>إعادة فحص</span>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                onClick={() => fixHierarchy.mutate()}
                disabled={fixHierarchy.isPending}
                className="flex items-center gap-2"
              >
                <span>إصلاح المشاكل تلقائياً</span>
                {fixHierarchy.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-right">
                سيقوم الإصلاح التلقائي بنقل الحسابات اليتيمة إلى المستوى الأول وإعادة حساب جميع المستويات
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};