import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Zap, 
  TrendingUp,
  Brain,
  Target,
  RefreshCw
} from 'lucide-react';
import { useSmartPaymentLinking, useAutoLinkPayments, SmartLinkingSuggestion } from '@/hooks/useSmartPaymentLinking';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3
  }).format(amount);
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return 'text-green-600';
  if (confidence >= 0.7) return 'text-blue-600';
  if (confidence >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
};

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.9) return { variant: 'default' as const, text: 'عالية جداً' };
  if (confidence >= 0.7) return { variant: 'secondary' as const, text: 'عالية' };
  if (confidence >= 0.5) return { variant: 'outline' as const, text: 'متوسطة' };
  return { variant: 'destructive' as const, text: 'منخفضة' };
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'auto_link':
      return <Zap className="h-4 w-4 text-green-600" />;
    case 'review_required':
      return <Eye className="h-4 w-4 text-blue-600" />;
    case 'manual_link':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
};

export const SmartLinkingSuggestions: React.FC = () => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const { data: suggestions, isLoading, refetch } = useSmartPaymentLinking();
  const autoLinkMutation = useAutoLinkPayments();

  const handleSelectSuggestion = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuggestions([...selectedSuggestions, paymentId]);
    } else {
      setSelectedSuggestions(selectedSuggestions.filter(id => id !== paymentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuggestions(suggestions?.map(s => s.paymentId) || []);
    } else {
      setSelectedSuggestions([]);
    }
  };

  const handleAutoLink = () => {
    if (!suggestions) return;
    
    const autoLinkSuggestions = suggestions.filter(s => 
      s.suggestedAction === 'auto_link' && s.confidence >= 0.8
    );
    
    autoLinkMutation.mutate(autoLinkSuggestions);
  };

  const handleAcceptSelected = () => {
    if (!suggestions || selectedSuggestions.length === 0) return;
    
    const selectedSuggestionsData = suggestions.filter(s => 
      selectedSuggestions.includes(s.paymentId)
    );
    
    autoLinkMutation.mutate(selectedSuggestionsData);
    setSelectedSuggestions([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span>جاري تحليل المدفوعات للربط الذكي...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            الاقتراحات الذكية للربط
          </CardTitle>
          <CardDescription>
            لا توجد اقتراحات ذكية متاحة حالياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              جميع المدفوعات مربوطة أو لا توجد أنماط واضحة للربط
            </p>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              إعادة التحليل
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const autoLinkCount = suggestions.filter(s => s.suggestedAction === 'auto_link' && s.confidence >= 0.8).length;
  const reviewRequiredCount = suggestions.filter(s => s.suggestedAction === 'review_required').length;
  const manualLinkCount = suggestions.filter(s => s.suggestedAction === 'manual_link').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاقتراحات</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suggestions.length}</div>
            <p className="text-xs text-muted-foreground">اقتراح للربط الذكي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ربط تلقائي</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoLinkCount}</div>
            <p className="text-xs text-muted-foreground">مؤهل للربط التلقائي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">يحتاج مراجعة</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewRequiredCount}</div>
            <p className="text-xs text-muted-foreground">مراجعة مطلوبة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ربط يدوي</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{manualLinkCount}</div>
            <p className="text-xs text-muted-foreground">يحتاج تدخل يدوي</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                الاقتراحات الذكية للربط
              </CardTitle>
              <CardDescription>
                اقتراحات مبنية على تحليل ذكي للمدفوعات والعقود
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              {autoLinkCount > 0 && (
                <Button
                  onClick={handleAutoLink}
                  disabled={autoLinkMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  ربط تلقائي ({autoLinkCount})
                </Button>
              )}
              
              <Button
                onClick={handleAcceptSelected}
                disabled={selectedSuggestions.length === 0 || autoLinkMutation.isPending}
                variant="outline"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                قبول المحدد ({selectedSuggestions.length})
              </Button>

              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                إعادة التحليل
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Progress Bar for Auto Linking */}
        {autoLinkMutation.isPending && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>جاري الربط التلقائي...</span>
                <span>معالجة...</span>
              </div>
              <Progress value={50} />
            </div>
          </CardContent>
        )}

        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.length === suggestions.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>العقد المقترح</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>نسبة الثقة</TableHead>
                  <TableHead>نوع التطابق</TableHead>
                  <TableHead>الإجراء المقترح</TableHead>
                  <TableHead>الأسباب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => {
                  const confidenceBadge = getConfidenceBadge(suggestion.confidence);
                  
                  return (
                    <TableRow key={suggestion.paymentId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.includes(suggestion.paymentId)}
                          onChange={(e) => handleSelectSuggestion(suggestion.paymentId, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {suggestion.paymentId.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{suggestion.contractNumber}</div>
                          <div className="text-sm text-muted-foreground">{suggestion.contractId?.slice(-8)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{suggestion.customerName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant={confidenceBadge.variant}>
                            {confidenceBadge.text}
                          </Badge>
                          <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {suggestion.matchType === 'contract_number' ? 'رقم العقد' :
                           suggestion.matchType === 'amount_date' ? 'المبلغ والتاريخ' :
                           suggestion.matchType === 'customer_pattern' ? 'نمط العميل' :
                           'تحليل الملاحظات'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionIcon(suggestion.suggestedAction)}
                          <span className="text-sm">
                            {suggestion.suggestedAction === 'auto_link' ? 'ربط تلقائي' :
                             suggestion.suggestedAction === 'review_required' ? 'مراجعة مطلوبة' :
                             'ربط يدوي'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {suggestion.reasons.map((reason, index) => (
                            <div key={index} className="text-muted-foreground">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};