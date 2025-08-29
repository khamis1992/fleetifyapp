import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Zap, Settings, Calculator, CheckCircle } from 'lucide-react';
import {
  useUnpaidObligations,
  useSmartPaymentAllocation,
  useManualPaymentAllocation,
} from '@/hooks/useFinancialObligations';
import type { 
  AllocationStrategy, 
  ManualAllocationRequest,
  UnpaidObligation 
} from '@/types/financial-obligations';
import {
  ALLOCATION_STRATEGIES,
  OBLIGATION_TYPE_LABELS,
  OBLIGATION_STATUS_LABELS,
} from '@/types/financial-obligations';

interface SmartPaymentAllocationProps {
  paymentId: string;
  customerId: string;
  paymentAmount: number;
  onAllocationComplete?: () => void;
}

export const SmartPaymentAllocation: React.FC<SmartPaymentAllocationProps> = ({
  paymentId,
  customerId,
  paymentAmount,
  onAllocationComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allocationMode, setAllocationMode] = useState<'smart' | 'manual'>('smart');
  const [selectedStrategy, setSelectedStrategy] = useState<AllocationStrategy>('fifo');
  const [manualAllocations, setManualAllocations] = useState<ManualAllocationRequest[]>([]);
  const [selectedObligations, setSelectedObligations] = useState<Set<string>>(new Set());

  const { data: unpaidObligations, isLoading } = useUnpaidObligations(customerId, selectedStrategy);
  const smartAllocationMutation = useSmartPaymentAllocation();
  const manualAllocationMutation = useManualPaymentAllocation();

  // إعادة تعيين التخصيصات اليدوية عند تغيير الاستراتيجية
  useEffect(() => {
    if (allocationMode === 'manual' && unpaidObligations) {
      setManualAllocations(
        unpaidObligations.map(obligation => ({
          obligation_id: obligation.id,
          amount: 0,
        }))
      );
    }
  }, [allocationMode, unpaidObligations]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
    }).format(amount);
  };

  const handleSmartAllocation = async () => {
    try {
      await smartAllocationMutation.mutateAsync({
        paymentId,
        customerId,
        amount: paymentAmount,
        strategy: selectedStrategy,
      });
      setIsOpen(false);
      onAllocationComplete?.();
    } catch (error) {
      console.error('Error in smart allocation:', error);
    }
  };

  const handleManualAllocation = async () => {
    const validAllocations = manualAllocations.filter(allocation => allocation.amount > 0);
    
    if (validAllocations.length === 0) {
      return;
    }

    try {
      await manualAllocationMutation.mutateAsync({
        paymentId,
        allocations: validAllocations,
      });
      setIsOpen(false);
      onAllocationComplete?.();
    } catch (error) {
      console.error('Error in manual allocation:', error);
    }
  };

  const updateManualAllocation = (obligationId: string, amount: number) => {
    setManualAllocations(prev =>
      prev.map(allocation =>
        allocation.obligation_id === obligationId
          ? { ...allocation, amount }
          : allocation
      )
    );
  };

  const toggleObligationSelection = (obligationId: string) => {
    setSelectedObligations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(obligationId)) {
        newSet.delete(obligationId);
      } else {
        newSet.add(obligationId);
      }
      return newSet;
    });
  };

  const autoDistributeAmount = () => {
    if (!unpaidObligations || selectedObligations.size === 0) return;

    const selectedObs = unpaidObligations.filter(o => selectedObligations.has(o.id));
    let remainingAmount = paymentAmount;
    const newAllocations = [...manualAllocations];

    // توزيع المبلغ على الالتزامات المحددة
    selectedObs.forEach(obligation => {
      if (remainingAmount <= 0) return;
      
      const allocationAmount = Math.min(remainingAmount, obligation.remaining_amount);
      const index = newAllocations.findIndex(a => a.obligation_id === obligation.id);
      
      if (index !== -1) {
        newAllocations[index].amount = allocationAmount;
        remainingAmount -= allocationAmount;
      }
    });

    setManualAllocations(newAllocations);
  };

  const getTotalManualAllocation = () => {
    return manualAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  };

  const getRemainingAmount = () => {
    return paymentAmount - getTotalManualAllocation();
  };

  // محاكاة التخصيص الذكي لعرض النتائج المتوقعة
  const simulateSmartAllocation = () => {
    if (!unpaidObligations) return [];
    
    let remainingAmount = paymentAmount;
    const allocations: Array<{ obligation: UnpaidObligation; amount: number }> = [];
    
    for (const obligation of unpaidObligations) {
      if (remainingAmount <= 0) break;
      
      const allocationAmount = Math.min(remainingAmount, obligation.remaining_amount);
      allocations.push({ obligation, amount: allocationAmount });
      remainingAmount -= allocationAmount;
    }
    
    return allocations;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Zap className="h-4 w-4" />
            تخصيص ذكي
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin ml-2" />
            جاري تحميل الالتزامات...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Zap className="h-4 w-4" />
          تخصيص ذكي
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            تخصيص المدفوعات الذكي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات الدفعة */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الدفعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>مبلغ الدفعة</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(paymentAmount)}
                  </div>
                </div>
                <div>
                  <Label>عدد الالتزامات غير المدفوعة</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    {unpaidObligations?.length || 0}
                  </div>
                </div>
                <div>
                  <Label>إجمالي المبلغ المستحق</Label>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(
                      unpaidObligations?.reduce((sum, o) => sum + o.remaining_amount, 0) || 0
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* إعدادات التخصيص */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات التخصيص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>نوع التخصيص</Label>
                  <Select value={allocationMode} onValueChange={(value: 'smart' | 'manual') => setAllocationMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smart">تخصيص ذكي تلقائي</SelectItem>
                      <SelectItem value="manual">تخصيص يدوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {allocationMode === 'smart' && (
                  <div>
                    <Label>استراتيجية التخصيص</Label>
                    <Select value={selectedStrategy} onValueChange={(value: AllocationStrategy) => setSelectedStrategy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOCATION_STRATEGIES.map(strategy => (
                          <SelectItem key={strategy.value} value={strategy.value}>
                            <div>
                              <div className="font-medium">{strategy.label}</div>
                              <div className="text-sm text-gray-500">{strategy.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* معاينة التخصيص */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {allocationMode === 'smart' ? 'معاينة التخصيص الذكي' : 'التخصيص اليدوي'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allocationMode === 'smart' ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    معاينة كيفية توزيع المبلغ حسب الاستراتيجية المحددة:
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ المستحق</TableHead>
                        <TableHead>تاريخ الاستحقاق</TableHead>
                        <TableHead>أيام التأخير</TableHead>
                        <TableHead>المبلغ المخصص</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulateSmartAllocation().map(({ obligation, amount }) => (
                        <TableRow key={obligation.id}>
                          <TableCell>
                            {OBLIGATION_TYPE_LABELS[obligation.obligation_type]}
                          </TableCell>
                          <TableCell>{formatCurrency(obligation.remaining_amount)}</TableCell>
                          <TableCell>
                            {format(new Date(obligation.due_date), 'dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            {obligation.days_overdue > 0 && (
                              <Badge variant="destructive">{obligation.days_overdue} يوم</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      حدد الالتزامات والمبالغ المراد تخصيصها:
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={autoDistributeAmount}
                        disabled={selectedObligations.size === 0}
                      >
                        توزيع تلقائي على المحدد
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label>إجمالي المخصص</Label>
                      <div className="font-bold text-blue-600">
                        {formatCurrency(getTotalManualAllocation())}
                      </div>
                    </div>
                    <div>
                      <Label>المتبقي</Label>
                      <div className={`font-bold ${getRemainingAmount() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(getRemainingAmount())}
                      </div>
                    </div>
                    <div>
                      <Label>الحالة</Label>
                      <div className="flex items-center gap-2">
                        {getRemainingAmount() === 0 ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">مكتمل</span>
                          </>
                        ) : getRemainingAmount() > 0 ? (
                          <span className="text-orange-600">متبقي مبلغ</span>
                        ) : (
                          <span className="text-red-600">تجاوز المبلغ</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>تحديد</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ المستحق</TableHead>
                        <TableHead>تاريخ الاستحقاق</TableHead>
                        <TableHead>المبلغ المخصص</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidObligations?.map((obligation) => {
                        const allocation = manualAllocations.find(a => a.obligation_id === obligation.id);
                        return (
                          <TableRow key={obligation.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedObligations.has(obligation.id)}
                                onCheckedChange={() => toggleObligationSelection(obligation.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {OBLIGATION_TYPE_LABELS[obligation.obligation_type]}
                            </TableCell>
                            <TableCell>{formatCurrency(obligation.remaining_amount)}</TableCell>
                            <TableCell>
                              {format(new Date(obligation.due_date), 'dd/MM/yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                max={obligation.remaining_amount}
                                value={allocation?.amount || 0}
                                onChange={(e) => updateManualAllocation(
                                  obligation.id,
                                  parseFloat(e.target.value) || 0
                                )}
                                className="w-32"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* أزرار الإجراءات */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={allocationMode === 'smart' ? handleSmartAllocation : handleManualAllocation}
              disabled={
                smartAllocationMutation.isPending ||
                manualAllocationMutation.isPending ||
                (allocationMode === 'manual' && getTotalManualAllocation() === 0)
              }
            >
              {(smartAllocationMutation.isPending || manualAllocationMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              {allocationMode === 'smart' ? 'تطبيق التخصيص الذكي' : 'تطبيق التخصيص اليدوي'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
