import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Lightbulb,
  Wand2,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { ContractPreview, ProcessingResult, useIntelligentContractProcessor } from '@/hooks/useIntelligentContractProcessor';

interface IntelligentContractPreviewProps {
  preview: ContractPreview;
  onApplyCorrections: (resultIndex: number, correctionsToApply: string[]) => void;
  onProceedWithData: () => void;
  onCancel: () => void;
}

export const IntelligentContractPreview: React.FC<IntelligentContractPreviewProps> = ({
  preview,
  onApplyCorrections,
  onProceedWithData,
  onCancel
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedCorrections, setSelectedCorrections] = useState<Record<number, string[]>>({});
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const { downloadProcessingReport } = useIntelligentContractProcessor();

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const toggleCorrection = (resultIndex: number, field: string) => {
    const current = selectedCorrections[resultIndex] || [];
    const updated = current.includes(field)
      ? current.filter(f => f !== field)
      : [...current, field];
    
    setSelectedCorrections({
      ...selectedCorrections,
      [resultIndex]: updated
    });
  };

  const applySelectedCorrections = (resultIndex: number) => {
    const corrections = selectedCorrections[resultIndex] || [];
    if (corrections.length > 0) {
      onApplyCorrections(resultIndex, corrections);
      setSelectedCorrections({
        ...selectedCorrections,
        [resultIndex]: []
      });
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-info" />;
    }
  };

  const getSeverityVariant = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'secondary' as const;
      case 'info':
        return 'outline' as const;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const filteredResults = showOnlyIssues 
    ? preview.processedData.filter(result => 
        result.validation_issues.length > 0 || result.corrections.length > 0
      )
    : preview.processedData;

  const hasIssues = preview.summary.errors > 0 || preview.summary.warnings > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ملخص المعالجة الذكية</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyIssues(!showOnlyIssues)}
              >
                {showOnlyIssues ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                {showOnlyIssues ? 'عرض الكل' : 'عرض المشاكل فقط'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadProcessingReport}
              >
                <Download className="h-4 w-4 mr-2" />
                تحميل التقرير
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{preview.summary.total_rows}</div>
              <div className="text-sm text-muted-foreground">إجمالي الصفوف</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{preview.summary.errors}</div>
              <div className="text-sm text-muted-foreground">أخطاء</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{preview.summary.warnings}</div>
              <div className="text-sm text-muted-foreground">تحذيرات</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{preview.summary.auto_fixes}</div>
              <div className="text-sm text-muted-foreground">إصلاحات تلقائية</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{preview.summary.suggestions_count}</div>
              <div className="text-sm text-muted-foreground">اقتراحات</div>
            </div>
          </div>
          
          {hasIssues && (
            <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-center text-warning">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  تم العثور على {preview.summary.errors} خطأ و {preview.summary.warnings} تحذير
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                يرجى مراجعة البيانات أدناه وتطبيق التصحيحات المقترحة قبل المتابعة
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const originalIndex = preview.processedData.indexOf(result);
            const isExpanded = expandedRows.has(originalIndex);
            const hasIssuesOrCorrections = result.validation_issues.length > 0 || result.corrections.length > 0;
            
            return (
              <Card key={originalIndex} className={hasIssuesOrCorrections ? 'border-warning/50' : ''}>
                <Collapsible>
                  <CollapsibleTrigger 
                    className="w-full"
                    onClick={() => toggleRowExpansion(originalIndex)}
                  >
                    <CardHeader className="hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium">
                            صف {originalIndex + 1}: {result.processed_data.customer_name || 'غير محدد'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.validation_issues.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {result.validation_issues.filter(i => i.severity === 'error').length} خطأ
                            </Badge>
                          )}
                          {result.corrections.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {result.corrections.length} اقتراح
                            </Badge>
                          )}
                          {result.auto_fixes_applied.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {result.auto_fixes_applied.length} إصلاح
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-4">
                        {/* Validation Issues */}
                        {result.validation_issues.length > 0 && (
                          <div>
                            <h4 className="font-medium text-destructive mb-2 flex items-center">
                              <XCircle className="h-4 w-4 mr-2" />
                              مشاكل التحقق ({result.validation_issues.length})
                            </h4>
                            <div className="space-y-2">
                              {result.validation_issues.map((issue, issueIndex) => (
                                <div key={issueIndex} className="flex items-start gap-2 p-2 bg-muted rounded">
                                  {getSeverityIcon(issue.severity)}
                                  <div className="flex-1">
                                    <span className="font-medium">{issue.field}:</span> {issue.issue}
                                  </div>
                                  <Badge variant={getSeverityVariant(issue.severity)} className="text-xs">
                                    {issue.severity === 'error' ? 'خطأ' : issue.severity === 'warning' ? 'تحذير' : 'معلومة'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Corrections */}
                        {result.corrections.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-primary flex items-center">
                                <Wand2 className="h-4 w-4 mr-2" />
                                التصحيحات المقترحة ({result.corrections.length})
                              </h4>
                              {selectedCorrections[originalIndex]?.length > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => applySelectedCorrections(originalIndex)}
                                >
                                  تطبيق المحدد ({selectedCorrections[originalIndex].length})
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {result.corrections.map((correction, corrIndex) => {
                                const isSelected = selectedCorrections[originalIndex]?.includes(correction.field);
                                return (
                                  <div key={corrIndex} className="p-3 bg-primary/5 rounded border border-primary/20">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleCorrection(originalIndex, correction.field)}
                                      />
                                      <div className="flex-1 space-y-1">
                                        <div className="font-medium">{correction.field}</div>
                                        <div className="text-sm">
                                          <span className="text-muted-foreground">من:</span>{' '}
                                          <span className="bg-destructive/10 px-1 rounded">{correction.original_value || 'فارغ'}</span>
                                          <span className="mx-2">←</span>
                                          <span className="text-muted-foreground">إلى:</span>{' '}
                                          <span className="bg-success/10 px-1 rounded">{correction.suggested_value}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{correction.reason}</div>
                                      </div>
                                      <div className={`text-xs ${getConfidenceColor(correction.confidence)}`}>
                                        ثقة: {Math.round(correction.confidence * 100)}%
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Auto Fixes Applied */}
                        {result.auto_fixes_applied.length > 0 && (
                          <div>
                            <h4 className="font-medium text-success mb-2 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              الإصلاحات المطبقة ({result.auto_fixes_applied.length})
                            </h4>
                            <div className="space-y-1">
                              {result.auto_fixes_applied.map((fix, fixIndex) => (
                                <div key={fixIndex} className="text-sm p-2 bg-success/10 rounded">
                                  <span className="font-medium">{fix.field}:</span> {fix.fix_description}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {result.suggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium text-info mb-2 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-2" />
                              الاقتراحات ({result.suggestions.length})
                            </h4>
                            <div className="space-y-1">
                              {result.suggestions.map((suggestion, sugIndex) => (
                                <div key={sugIndex} className="text-sm p-2 bg-info/10 rounded">
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
            
            <div className="space-x-2 space-x-reverse">
              <Button
                onClick={onProceedWithData}
                disabled={preview.summary.errors > 0}
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                متابعة مع البيانات المعالجة
              </Button>
            </div>
          </div>
          
          {preview.summary.errors > 0 && (
            <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
              ⚠️ لا يمكن المتابعة مع وجود أخطاء. يرجى تصحيح الأخطاء أولاً.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};