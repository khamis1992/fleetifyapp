import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceMatchResult } from '@/types/invoiceOCR';
import { CheckCircle, User, FileText, AlertCircle } from 'lucide-react';

interface InvoiceMatchingViewProps {
  matchResult: InvoiceMatchResult;
  onSelectMatch: (customerId?: string, contractId?: string) => void;
  onCreateNew: () => void;
}

export const InvoiceMatchingView = ({ 
  matchResult, 
  onSelectMatch, 
  onCreateNew 
}: InvoiceMatchingViewProps) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">نتائج المطابقة الذكية</h3>

        {matchResult.confidence > 0 ? (
          <div className="space-y-4">
            {/* Best Match */}
            <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold">المطابقة المقترحة</span>
                </div>
                <Badge className={getConfidenceColor(matchResult.confidence)}>
                  {matchResult.confidence}% ثقة
                </Badge>
              </div>

              <div className="space-y-2">
                {matchResult.customer_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">العميل:</span>
                    <span>{matchResult.customer_name}</span>
                  </div>
                )}

                {matchResult.contract_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">العقد:</span>
                    <span>{matchResult.contract_number}</span>
                  </div>
                )}

                {matchResult.match_reasons.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-medium">أسباب المطابقة:</span>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                      {matchResult.match_reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button
                onClick={() => onSelectMatch(matchResult.customer_id, matchResult.contract_id)}
                className="w-full mt-4"
              >
                تأكيد هذه المطابقة
              </Button>
            </div>

            {/* Alternative Matches */}
            {matchResult.alternatives.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  خيارات بديلة
                </h4>
                <div className="space-y-2">
                  {matchResult.alternatives.slice(0, 3).map((alt, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onSelectMatch(alt.customer_id, alt.contract_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          {alt.customer_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{alt.customer_name}</span>
                            </div>
                          )}
                          {alt.contract_number && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{alt.contract_number}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">{alt.reason}</p>
                        </div>
                        <Badge variant="outline" className={getConfidenceColor(alt.confidence)}>
                          {alt.confidence}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              لم يتم العثور على مطابقات تلقائية
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              يمكنك اختيار العميل والعقد يدوياً أو إنشاء سجل جديد
            </p>
          </div>
        )}

        <Button
          onClick={onCreateNew}
          variant="outline"
          className="w-full mt-4"
        >
          اختيار يدوي أو إنشاء جديد
        </Button>
      </Card>
    </div>
  );
};
