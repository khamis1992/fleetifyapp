import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Car, User, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRenewContract } from "@/hooks/useContractRenewal";
import { useToast } from "@/hooks/use-toast";
import type { EligibleContract } from "@/hooks/useEligibleContractsForRenewal";
import { format, addMonths } from "date-fns";

interface BatchContractRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: EligibleContract[];
  onSuccess?: () => void;
}

export const BatchContractRenewalDialog: React.FC<BatchContractRenewalDialogProps> = ({
  open,
  onOpenChange,
  contracts,
  onSuccess
}) => {
  const { toast } = useToast();
  const renewContract = useRenewContract();
  
  const [renewalData, setRenewalData] = useState({
    duration_months: 12,
    new_amount: 0,
    terms: ""
  });

  const totalOutstanding = contracts.reduce((sum, contract) => sum + contract.outstanding_amount, 0);
  const totalOriginalAmount = contracts.reduce((sum, contract) => sum + contract.contract_amount, 0);

  const handleRenewalDataChange = (field: string, value: any) => {
    setRenewalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBatchRenewal = async () => {
    try {
      for (const contract of contracts) {
        const newEndDate = addMonths(new Date(), renewalData.duration_months);
        
        await renewContract.mutateAsync({
          contract_id: contract.contract_id,
          new_end_date: format(newEndDate, 'yyyy-MM-dd'),
          new_amount: renewalData.new_amount || contract.contract_amount,
          renewal_terms: renewalData.terms || 'تجديد تلقائي ذكي'
        });
      }

      toast({
        title: "تم التجديد بنجاح",
        description: `تم تجديد ${contracts.length} عقد بنجاح`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error during batch renewal:", error);
      toast({
        title: "خطأ في التجديد",
        description: "حدث خطأ أثناء تجديد العقود",
        variant: "destructive",
      });
    }
  };

  const suggestedNewAmount = totalOriginalAmount + (totalOutstanding * 0.1); // Add 10% to cover outstanding

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تجديد العقود المحددة ({contracts.length})</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                ملخص العقود المحددة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{contracts.length}</div>
                  <div className="text-sm text-muted-foreground">عدد العقود</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {totalOutstanding.toFixed(3)} د.ك
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي المبلغ المستحق</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {totalOriginalAmount.toFixed(3)} د.ك
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي قيمة العقود الأصلية</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Renewal Settings */}
          <Card>
            <CardHeader>
              <CardTitle>إعدادات التجديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">مدة التجديد (بالأشهر)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={renewalData.duration_months}
                    onChange={(e) => handleRenewalDataChange('duration_months', parseInt(e.target.value))}
                    min="1"
                    max="60"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">مبلغ العقد الجديد (د.ك)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    value={renewalData.new_amount || ''}
                    onChange={(e) => handleRenewalDataChange('new_amount', parseFloat(e.target.value))}
                    placeholder={`مقترح: ${suggestedNewAmount.toFixed(3)}`}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    المبلغ المقترح يتضمن 10% إضافية لتغطية المبالغ المستحقة
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="terms">شروط التجديد</Label>
                <Textarea
                  id="terms"
                  value={renewalData.terms}
                  onChange={(e) => handleRenewalDataChange('terms', e.target.value)}
                  placeholder="أدخل شروط التجديد الإضافية..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Alert for Outstanding Payments */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              تحذير: هذه العقود تحتوي على مبالغ مستحقة. يُنصح بتحصيل المدفوعات المستحقة قبل التجديد أو تضمينها في العقد الجديد.
            </AlertDescription>
          </Alert>

          {/* Contract List */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل العقود</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contracts.map((contract, index) => (
                  <div key={contract.contract_id}>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{contract.contract_number}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {contract.customer_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {contract.vehicle_info}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          مستحق: {contract.outstanding_amount.toFixed(3)} د.ك
                        </div>
                        <div className="text-sm text-muted-foreground">
                          أصلي: {contract.contract_amount.toFixed(3)} د.ك
                        </div>
                      </div>
                    </div>
                    {index < contracts.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={renewContract.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleBatchRenewal}
              disabled={renewContract.isPending || !renewalData.duration_months}
            >
              {renewContract.isPending ? "جاري التجديد..." : "تأكيد التجديد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};