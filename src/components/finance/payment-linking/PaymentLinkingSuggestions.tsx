import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useUnlinkedPayments, useBulkLinkPayments } from '@/hooks/usePaymentLinking';
import { useCustomers } from '@/hooks/useCustomers';
import { 
  Zap, 
  Brain, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Receipt,
  Phone,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3
  }).format(amount);
};

interface PaymentSuggestion {
  paymentId: string;
  payment: any;
  suggestedCustomers: Array<{
    customer: any;
    confidence: number;
    reasons: string[];
  }>;
}

export const PaymentLinkingSuggestions: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<PaymentSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { data: unlinkedPayments } = useUnlinkedPayments();
  const { data: customers } = useCustomers();
  const bulkLinkMutation = useBulkLinkPayments();

  // Smart matching algorithm
  const analyzePayments = () => {
    if (!unlinkedPayments || !customers) return;

    setIsAnalyzing(true);

    setTimeout(() => {
      const newSuggestions: PaymentSuggestion[] = [];

      unlinkedPayments.forEach(payment => {
        const paymentAmount = payment.amount || 0;
        const paymentPhone = payment.notes?.match(/\d{8,}/)?.[0]; // Extract phone from notes
        const paymentDate = new Date(payment.payment_date);

        const customerMatches = customers.map(customer => {
          let confidence = 0;
          const reasons: string[] = [];

          // Phone number matching
          if (paymentPhone && 
              (customer.phone?.includes(paymentPhone) || 
               customer.alternative_phone?.includes(paymentPhone))) {
            confidence += 40;
            reasons.push('تطابق رقم الهاتف');
          }

          // Amount-based patterns (frequent amounts for this customer)
          if (paymentAmount > 0) {
            const amountRange = paymentAmount * 0.1; // 10% tolerance
            if (Math.abs(paymentAmount - 100) < amountRange) { // Common amount pattern
              confidence += 20;
              reasons.push('مبلغ شائع للعميل');
            }
          }

          // Name similarity in payment notes
          const customerName = customer.customer_type === 'individual' 
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            : customer.company_name || '';

          if (payment.notes && customerName) {
            const notesLower = payment.notes.toLowerCase();
            const nameParts = customerName.toLowerCase().split(' ');
            
            nameParts.forEach(part => {
              if (part.length > 2 && notesLower.includes(part)) {
                confidence += 15;
                reasons.push('تطابق جزئي في الاسم');
              }
            });
          }

          // Recent transaction history - simple confidence boost for active customers
          if (customer.is_active) {
            confidence += 10;
            reasons.push('عميل نشط');
          }

          // Email domain matching (if available)
          if (payment.notes && customer.email && customer.email.includes('@')) {
            const emailDomain = customer.email.split('@')[1];
            if (payment.notes.toLowerCase().includes(emailDomain.toLowerCase())) {
              confidence += 25;
              reasons.push('تطابق نطاق البريد الإلكتروني');
            }
          }

          return {
            customer,
            confidence: Math.min(confidence, 95), // Cap at 95%
            reasons
          };
        })
        .filter(match => match.confidence > 20) // Only show matches with >20% confidence
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3); // Top 3 matches

        if (customerMatches.length > 0) {
          newSuggestions.push({
            paymentId: payment.id,
            payment,
            suggestedCustomers: customerMatches
          });
        }
      });

      setSuggestions(newSuggestions);
      setIsAnalyzing(false);

      toast({
        title: "تم تحليل المدفوعات",
        description: `تم العثور على ${newSuggestions.length} اقتراح للربط`,
      });
    }, 2000); // Simulate analysis time
  };

  const handleSelectSuggestion = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuggestions([...selectedSuggestions, paymentId]);
    } else {
      setSelectedSuggestions(selectedSuggestions.filter(id => id !== paymentId));
    }
  };

  const applySelectedSuggestions = async () => {
    const linkingData = selectedSuggestions.map(paymentId => {
      const suggestion = suggestions.find(s => s.paymentId === paymentId);
      const topCustomer = suggestion?.suggestedCustomers[0];
      
      return {
        paymentId,
        customerId: topCustomer?.customer.id || '',
        shouldCreateInvoice: true,
        invoiceData: {
          notes: `فاتورة مُنشأة من الربط الذكي - ثقة ${topCustomer?.confidence}%`
        }
      };
    }).filter(data => data.customerId);

    if (linkingData.length === 0) {
      toast({
        title: "لا توجد اقتراحات صالحة",
        description: "اختر اقتراحات صحيحة للتطبيق",
        variant: "destructive"
      });
      return;
    }

    try {
      await bulkLinkMutation.mutateAsync(linkingData);
      setSelectedSuggestions([]);
      // Refresh suggestions
      analyzePayments();
    } catch (error) {
      console.error('Error applying suggestions:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'عالية';
    if (confidence >= 60) return 'متوسطة';
    return 'منخفضة';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            الربط الذكي للمدفوعات
          </CardTitle>
          <CardDescription>
            استخدام الذكاء الاصطناعي لربط المدفوعات بالعملاء المناسبين تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={analyzePayments}
              disabled={isAnalyzing || !unlinkedPayments?.length}
            >
              {isAnalyzing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  بدء التحليل الذكي
                </>
              )}
            </Button>
            
            {suggestions.length > 0 && (
              <Button
                variant="outline"
                onClick={applySelectedSuggestions}
                disabled={selectedSuggestions.length === 0 || bulkLinkMutation.isPending}
              >
                <Target className="mr-2 h-4 w-4" />
                تطبيق المحدد ({selectedSuggestions.length})
              </Button>
            )}
          </div>

          {isAnalyzing && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div>
                  <p className="font-medium">تحليل المدفوعات جاري...</p>
                  <p className="text-sm text-muted-foreground">
                    نحن نحلل أنماط المدفوعات وبيانات العملاء لإيجاد أفضل التطابقات
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Results */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              اقتراحات الربط ({suggestions.length})
            </CardTitle>
            <CardDescription>
              مراجعة وتطبيق اقتراحات الربط الذكي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.paymentId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.includes(suggestion.paymentId)}
                        onChange={(e) => handleSelectSuggestion(suggestion.paymentId, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <h4 className="font-medium">
                          دفعة #{suggestion.payment.payment_number}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(suggestion.payment.amount)} • {new Date(suggestion.payment.payment_date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">العملاء المقترحين:</Label>
                    {suggestion.suggestedCustomers.map((match, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-3">
                        <div className="flex items-center gap-3">
                          {match.customer.customer_type === 'individual' ? (
                            <Users className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Receipt className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {match.customer.customer_type === 'individual' 
                                ? `${match.customer.first_name || ''} ${match.customer.last_name || ''}`.trim()
                                : match.customer.company_name
                              }
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {match.customer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {match.customer.phone}
                                </span>
                              )}
                              {match.customer.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {match.customer.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${getConfidenceColor(match.confidence)} text-xs`}>
                            {getConfidenceLabel(match.confidence)} ({match.confidence}%)
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {match.reasons.join(' • ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No suggestions state */}
      {!isAnalyzing && suggestions.length === 0 && unlinkedPayments && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد اقتراحات متاحة</h3>
            <p className="text-muted-foreground text-center mb-4">
              {unlinkedPayments.length === 0 
                ? 'جميع المدفوعات مربوطة بالفعل'
                : 'ابدأ التحليل الذكي للحصول على اقتراحات ربط المدفوعات'
              }
            </p>
            {unlinkedPayments.length > 0 && (
              <Button onClick={analyzePayments}>
                <Zap className="mr-2 h-4 w-4" />
                بدء التحليل
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};