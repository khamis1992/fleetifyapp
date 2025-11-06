/**
 * Smart Payment Matching Component
 * 
 * Intelligent payment-invoice matching interface.
 * Uses PaymentService smart matching algorithm.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services';
import { toast } from 'sonner';
import type { Payment, PaymentMatchSuggestion } from '@/types/payment';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Calendar, User } from 'lucide-react';

interface SmartPaymentMatchingProps {
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onMatch?: (invoiceId: string) => void;
}

export function SmartPaymentMatching({ payment, isOpen, onClose, onMatch }: SmartPaymentMatchingProps) {
  const queryClient = useQueryClient();
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  // Fetch matching suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['payment-matches', payment.id],
    queryFn: () => paymentService.findMatchingSuggestions(payment),
    enabled: isOpen && !!payment.id,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Match payment mutation
  const matchMutation = useMutation({
    mutationFn: (invoiceId: string) => 
      paymentService.matchPayment(payment.id, 'invoice', invoiceId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('✅ تم ربط الدفعة بنجاح!', {
          description: `الثقة: ${result.confidence}%`
        });
        
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        
        if (onMatch && result.invoice_id) {
          onMatch(result.invoice_id);
        }
        
        onClose();
      } else {
        toast.error('❌ فشل ربط الدفعة', {
          description: result.message
        });
      }
    },
    onError: (error: Error) => {
      toast.error('❌ حدث خطأ', {
        description: error.message
      });
    }
  });

  const handleMatch = (suggestionId: string) => {
    setSelectedSuggestion(suggestionId);
    matchMutation.mutate(suggestionId);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceBadgeVariant = (confidence: number): 'default' | 'secondary' | 'destructive' => {
    if (confidence >= 85) return 'default';
    if (confidence >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">مطابقة ذكية للدفعة</DialogTitle>
          <DialogDescription>
            النظام يقترح الفواتير الأكثر تطابقاً مع هذه الدفعة
          </DialogDescription>
        </DialogHeader>

        {/* Payment Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">معلومات الدفعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">المبلغ</p>
                  <p className="font-semibold">{payment.amount.toLocaleString()} {payment.currency || 'QAR'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">التاريخ</p>
                  <p className="font-semibold">{new Date(payment.payment_date).toLocaleDateString('ar')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">رقم الدفعة</p>
                  <p className="font-semibold">{payment.payment_number}</p>
                </div>
              </div>
              
              {payment.reference_number && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">الرقم المرجعي</p>
                    <p className="font-semibold">{payment.reference_number}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Matching Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">الفواتير المقترحة</h3>
            {suggestions && (
              <Badge variant="outline">
                {suggestions.length} فاتورة مقترحة
              </Badge>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="ml-3 text-gray-600">جاري البحث عن الفواتير المطابقة...</p>
            </div>
          )}

          {!isLoading && suggestions && suggestions.length === 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">لم يتم العثور على مطابقات</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      لم يتمكن النظام من إيجاد فواتير مطابقة لهذه الدفعة. يمكنك الربط يدوياً من قائمة الفواتير.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && suggestions && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <Card
                  key={suggestion.invoice_id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedSuggestion === suggestion.invoice_id ? 'ring-2 ring-blue-500' : ''
                  } ${getConfidenceColor(suggestion.confidence)}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-lg">{suggestion.invoice_number}</h4>
                          
                          <Badge variant={getConfidenceBadgeVariant(suggestion.confidence)}>
                            {suggestion.confidence}% ثقة
                          </Badge>
                          
                          {suggestion.confidence >= 85 && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              مطابقة قوية
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">المبلغ</p>
                            <p className="font-semibold">
                              {suggestion.amount.toLocaleString()} QAR
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">سبب المطابقة</p>
                            <p className="font-semibold">{suggestion.reason}</p>
                          </div>

                          {suggestion.confidence >= 85 && (
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-xs text-green-700 font-medium">
                                ✨ يمكن الربط التلقائي
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <Progress 
                            value={suggestion.confidence} 
                            className="h-2"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handleMatch(suggestion.invoice_id)}
                        disabled={matchMutation.isPending}
                        size="sm"
                        className="min-w-[100px]"
                      >
                        {matchMutation.isPending && selectedSuggestion === suggestion.invoice_id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            جاري الربط...
                          </>
                        ) : (
                          'ربط'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Manual Matching Option */}
        {!isLoading && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
              disabled={matchMutation.isPending}
            >
              إغلاق أو الربط يدوياً
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

