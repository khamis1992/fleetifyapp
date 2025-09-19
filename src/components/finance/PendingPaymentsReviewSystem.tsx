import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertCircle, 
  CheckCircle, 
  Link, 
  Search, 
  FileText, 
  DollarSign,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PendingPayment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  customer_id?: string;
  contract_id?: string;
  agreement_number?: string;
  reference_number?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  allocation_status: 'unallocated' | 'partially_allocated' | 'fully_allocated';
  linking_confidence: number;
  processing_notes?: string;
  customers?: {
    id: string;
    customer_type?: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  contracts?: {
    id: string;
    contract_number: string;
    monthly_amount: number;
  };
}

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  monthly_amount: number;
  balance_due: number;
  customer: {
    customer_type?: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
}

export const PendingPaymentsReviewSystem: React.FC = () => {
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [linkingNotes, setLinkingNotes] = useState('');

  // جلب المدفوعات المعلقة
  const { data: pendingPayments, isLoading, refetch } = useQuery({
    queryKey: ['pending-payments', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          amount,
          payment_date,
          customer_id,
          contract_id,
          agreement_number,
          reference_number,
          processing_status,
          allocation_status,
          linking_confidence,
          processing_notes,
          customers(id, customer_type, first_name, last_name, company_name),
          contracts(id, contract_number, monthly_amount)
        `)
        .eq('company_id', companyId)
        .or('processing_status.eq.pending,allocation_status.eq.unallocated,linking_confidence.lt.0.5')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId
  });

  // جلب العقود المتاحة للربط
  const { data: availableContracts } = useQuery({
    queryKey: ['available-contracts', companyId, selectedPayment?.id],
    queryFn: async () => {
      if (!companyId || !selectedPayment) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          monthly_amount,
          balance_due,
          customer:customers(customer_type, first_name, last_name, company_name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .gt('balance_due', 0);

      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId && !!selectedPayment
  });

  // ربط المدفوعة بالعقد
  const linkPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, contractId, notes }: { 
      paymentId: string; 
      contractId: string; 
      notes?: string; 
    }) => {
      const contract = availableContracts?.find(c => c.id === contractId);
      if (!contract) throw new Error('العقد غير موجود');

      const confidence = calculateLinkingConfidence(selectedPayment!, contract);
      
      const { error } = await supabase
        .from('payments')
        .update({
          contract_id: contractId,
          customer_id: contract.customer_id,
          processing_status: 'completed',
          allocation_status: confidence > 0.8 ? 'fully_allocated' : 'partially_allocated',
          linking_confidence: confidence,
          processing_notes: notes || `ربط يدوي - ثقة: ${Math.round(confidence * 100)}%`
        })
        .eq('id', paymentId);

      if (error) throw error;

      // تسجيل محاولة الربط
      await (supabase as any).from('payment_contract_linking_attempts').insert({
        payment_id: paymentId,
        selected_contract_id: contractId,
        linking_confidence: confidence,
        linking_method: 'manual',
        matching_contracts: [
          { id: contract.id, contract_number: contract.contract_number, monthly_amount: contract.monthly_amount }
        ] as any,
        attempted_contract_identifiers: {
          contract_number: contract.contract_number,
          customer_id: contract.customer_id
        }
      });

      return { success: true, confidence };
    },
    onSuccess: () => {
      toast({
        title: 'تم الربط بنجاح',
        description: 'تم ربط المدفوعة بالعقد وتحديث حالة المعالجة'
      });
      setSelectedPayment(null);
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
    },
    onError: (error) => {
      toast({
        title: 'فشل في الربط',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // الربط التلقائي الذكي
  const autoLinkMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const payment = pendingPayments?.find(p => p.id === paymentId);
      if (!payment) throw new Error('المدفوعة غير موجودة');

      // البحث عن أفضل مطابقة
      const matches = await findBestMatches(payment);
      if (matches.length === 0) {
        throw new Error('لم يتم العثور على عقود مطابقة');
      }

      const bestMatch = matches[0];
      if (bestMatch.confidence < 0.6) {
        throw new Error('مستوى الثقة منخفض جداً للربط التلقائي');
      }

      // تنفيذ الربط
      const { error } = await supabase
        .from('payments')
        .update({
          contract_id: bestMatch.contract.id,
          customer_id: bestMatch.contract.customer_id,
          processing_status: 'completed',
          allocation_status: bestMatch.confidence > 0.8 ? 'fully_allocated' : 'partially_allocated',
          linking_confidence: bestMatch.confidence,
          processing_notes: `ربط تلقائي - ${bestMatch.reason}`
        })
        .eq('id', paymentId);

      if (error) throw error;

      return bestMatch;
    },
    onSuccess: (result) => {
      toast({
        title: 'تم الربط التلقائي',
        description: `تم ربط المدفوعة بالعقد (ثقة: ${Math.round(result.confidence * 100)}%)`
      });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
    },
    onError: (error) => {
      toast({
        title: 'فشل في الربط التلقائي',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // حساب مستوى الثقة في الربط
  const calculateLinkingConfidence = (payment: PendingPayment, contract: Contract): number => {
    let confidence = 0.3; // أساس

    // تطابق المبلغ
    if (payment.amount === contract.monthly_amount) {
      confidence += 0.4;
    } else if (Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount <= 0.1) {
      confidence += 0.2;
    }

    // تطابق رقم الاتفاقية
    if (payment.agreement_number && contract.contract_number.includes(payment.agreement_number)) {
      confidence += 0.3;
    }

    // وجود رقم مرجعي
    if (payment.reference_number) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  };

  // البحث عن أفضل المطابقات
  const findBestMatches = async (payment: PendingPayment) => {
    if (!availableContracts) return [];

    const matches = availableContracts.map(contract => ({
      contract,
      confidence: calculateLinkingConfidence(payment, contract),
      reason: getMatchReason(payment, contract)
    }));

    return matches
      .filter(match => match.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  };

  const getMatchReason = (payment: PendingPayment, contract: Contract): string => {
    const reasons = [];
    
    if (payment.amount === contract.monthly_amount) {
      reasons.push('تطابق كامل في المبلغ');
    } else if (Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount <= 0.1) {
      reasons.push('تطابق جزئي في المبلغ');
    }

    if (payment.agreement_number && contract.contract_number.includes(payment.agreement_number)) {
      reasons.push('تطابق في رقم الاتفاقية');
    }

    return reasons.join(' + ') || 'مطابقة عامة';
  };

  const filteredPayments = pendingPayments?.filter(payment => {
    const pn = (payment.payment_number || '').toLowerCase();
    const rn = (payment.reference_number || '').toLowerCase();
    const cn = payment.customers
      ? ((payment.customers.customer_type === 'corporate'
          ? payment.customers.company_name || ''
          : `${payment.customers.first_name || ''} ${payment.customers.last_name || ''}`) || '')
          .toLowerCase()
      : '';
    const q = searchTerm.toLowerCase();
    return pn.includes(q) || cn.includes(q) || rn.includes(q);
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري تحميل المدفوعات المعلقة...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            نظام مراجعة المدفوعات المعلقة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="البحث بالرقم أو اسم العميل أو المرجع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredPayments?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">مدفوعات معلقة</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredPayments?.filter(p => p.linking_confidence < 0.5).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">ثقة منخفضة</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredPayments?.filter(p => p.allocation_status === 'unallocated').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">غير مُوزعة</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredPayments?.filter(p => p.processing_status === 'pending').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">معالجة معلقة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المدفوعات المعلقة */}
      <div className="space-y-4">
        {filteredPayments?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">ممتاز! لا توجد مدفوعات معلقة</h3>
              <p className="text-muted-foreground">
                جميع المدفوعات تم ربطها ومعالجتها بنجاح
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPayments?.map((payment) => (
            <Card key={payment.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{payment.payment_number}</h4>
                       <Badge variant={payment.linking_confidence > 0.8 ? "default" : 
                                    payment.linking_confidence > 0.5 ? "secondary" : "destructive"}>
                         ثقة: {Math.round((payment.linking_confidence || 0) * 100)}%
                       </Badge>
                      <Badge variant="secondary">
                        {payment.processing_status === 'pending' ? 'معلق' : 
                         payment.processing_status === 'processing' ? 'جاري المعالجة' :
                         'مُكتمل'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">المبلغ:</span>
                        <div className="font-medium">{payment.amount} د.ك</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">التاريخ:</span>
                        <div>{new Date(payment.payment_date).toLocaleDateString('ar')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">العميل:</span>
                        <div>{payment.customers?.name || 'غير محدد'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المرجع:</span>
                        <div>{payment.reference_number || 'غير متوفر'}</div>
                      </div>
                    </div>

                    {payment.processing_notes && (
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        <FileText className="h-4 w-4 inline mr-1" />
                        {payment.processing_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoLinkMutation.mutate(payment.id)}
                      disabled={autoLinkMutation.isPending}
                    >
                      <Link className="h-4 w-4 mr-1" />
                      ربط تلقائي
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          ربط يدوي
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>ربط المدفوعة يدوياً</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded">
                            <div>
                              <span className="text-sm text-muted-foreground">رقم المدفوعة:</span>
                              <div className="font-medium">{payment.payment_number}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">المبلغ:</span>
                              <div className="font-medium">{payment.amount} د.ك</div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">اختر العقد المناسب:</label>
                            <Select value={selectedContract} onValueChange={setSelectedContract}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر عقد..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableContracts?.map((contract) => (
                                  <SelectItem key={contract.id} value={contract.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{contract.contract_number}</span>
                                      <span className="text-muted-foreground mr-2">
                                        {contract.customer.name} - {contract.monthly_amount} د.ك
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium">ملاحظات الربط:</label>
                            <Input
                              placeholder="ملاحظات اختيارية..."
                              value={linkingNotes}
                              onChange={(e) => setLinkingNotes(e.target.value)}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                              إلغاء
                            </Button>
                            <Button
                              onClick={() => linkPaymentMutation.mutate({
                                paymentId: payment.id,
                                contractId: selectedContract,
                                notes: linkingNotes
                              })}
                              disabled={!selectedContract || linkPaymentMutation.isPending}
                            >
                              <Link className="h-4 w-4 mr-1" />
                              تأكيد الربط
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingPaymentsReviewSystem;