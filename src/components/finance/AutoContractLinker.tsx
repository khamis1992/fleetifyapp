import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAutoContractLinking } from '@/hooks/useAutoContractLinking';
import { useUnlinkedPayments } from '@/hooks/useUnlinkedPayments';
import { Link2, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export const AutoContractLinker = () => {
  const [showResults, setShowResults] = useState(false);
  const autoLinkMutation = useAutoContractLinking();
  const { data: unlinkedPayments } = useUnlinkedPayments();

  const unlinkedCount = unlinkedPayments?.filter(p => p.agreement_number)?.length || 0;

  const handleAutoLink = async () => {
    setShowResults(false);
    try {
      await autoLinkMutation.mutateAsync();
      setShowResults(true);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const results = autoLinkMutation.data;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          ربط المدفوعات بالعقود تلقائياً
        </CardTitle>
        <CardDescription>
          ربط المدفوعات بالعقود بناءً على رقم الاتفاقية بضغطة زر واحدة
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">المدفوعات غير المربوطة:</span>
            <Badge variant="secondary">{unlinkedCount}</Badge>
          </div>
          
          <Button 
            onClick={handleAutoLink}
            disabled={autoLinkMutation.isPending || unlinkedCount === 0}
            className="gap-2"
          >
            {autoLinkMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الربط...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                ربط تلقائي
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {autoLinkMutation.isPending && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>جاري معالجة المدفوعات...</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        )}

        {/* Results */}
        {showResults && results && (
          <div className="space-y-3">
            <h4 className="font-medium">نتائج العملية:</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-sm">
                  <div className="font-medium text-green-700 dark:text-green-300">
                    {results.successfullyLinked}
                  </div>
                  <div className="text-green-600 dark:text-green-400">تم الربط</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                <AlertTriangle className="h-4 w-4 text-gray-600" />
                <div className="text-sm">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {results.totalProcessed}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">تم المعالجة</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="text-sm">
                  <div className="font-medium text-red-700 dark:text-red-300">
                    {results.errors.length}
                  </div>
                  <div className="text-red-600 dark:text-red-400">فشل</div>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {results.successfullyLinked > 0 && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  تم ربط {results.successfullyLinked} دفعة بنجاح من أصل {results.totalProcessed} دفعة
                </AlertDescription>
              </Alert>
            )}

            {/* Error Summary */}
            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  فشل في ربط {results.errors.length} دفعة. 
                  {results.errors.length <= 3 && (
                    <div className="mt-2 space-y-1">
                      {results.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-xs">• {error}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* No unlinked payments */}
        {unlinkedCount === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              جميع المدفوعات مربوطة بالعقود بالفعل
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};