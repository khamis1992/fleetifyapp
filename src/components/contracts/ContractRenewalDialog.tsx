import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Calendar, DollarSign } from 'lucide-react';
import { useRenewContract } from '@/hooks/useContractRenewal';

interface ContractRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
}

export const ContractRenewalDialog: React.FC<ContractRenewalDialogProps> = ({
  open,
  onOpenChange,
  contract
}) => {
  const [renewalData, setRenewalData] = useState({
    new_end_date: '',
    new_amount: contract?.contract_amount || 0,
    renewal_terms: '',
    renewal_period_months: 12
  });

  const renewContract = useRenewContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!renewalData.new_end_date) {
      return;
    }

    try {
      await renewContract.mutateAsync({
        contract_id: contract.id,
        ...renewalData
      });
      onOpenChange(false);
      
      // Reset form
      setRenewalData({
        new_end_date: '',
        new_amount: contract?.contract_amount || 0,
        renewal_terms: '',
        renewal_period_months: 12
      });
    } catch (error) {
      console.error('Error renewing contract:', error);
    }
  };

  // Calculate suggested end date based on original contract duration
  const calculateSuggestedEndDate = () => {
    if (!contract) return '';
    
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const suggestedEndDate = new Date(contract.end_date);
    suggestedEndDate.setDate(suggestedEndDate.getDate() + durationDays);
    
    return suggestedEndDate.toISOString().split('T')[0];
  };

  const fillSuggestedDate = () => {
    setRenewalData({
      ...renewalData,
      new_end_date: calculateSuggestedEndDate()
    });
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            تجديد العقد رقم {contract.contract_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات العقد الحالي</CardTitle>
              <CardDescription>تفاصيل العقد المراد تجديده</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ انتهاء العقد الحالي</Label>
                <div className="p-3 bg-muted rounded-md">
                  {new Date(contract.end_date).toLocaleDateString('ar-SA')}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>قيمة العقد الحالية</Label>
                <div className="p-3 bg-muted rounded-md">
                  {contract.contract_amount?.toFixed(3)} د.ك
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>مدة العقد الحالي</Label>
                <div className="p-3 bg-muted rounded-md">
                  {Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))} يوم
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>نوع العقد</Label>
                <div className="p-3 bg-muted rounded-md">
                  {contract.contract_type === 'rental' ? 'إيجار' : 
                   contract.contract_type === 'service' ? 'خدمة' : 
                   contract.contract_type === 'maintenance' ? 'صيانة' : 'مبيعات'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Renewal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل التجديد</CardTitle>
              <CardDescription>معلومات العقد الجديد بعد التجديد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_end_date">تاريخ انتهاء العقد الجديد *</Label>
                <div className="flex gap-2">
                  <Input
                    id="new_end_date"
                    type="date"
                    value={renewalData.new_end_date}
                    onChange={(e) => setRenewalData({...renewalData, new_end_date: e.target.value})}
                    required
                  />
                  <Button type="button" variant="outline" onClick={fillSuggestedDate}>
                    <Calendar className="h-4 w-4 mr-2" />
                    نفس المدة
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new_amount">قيمة العقد الجديد (د.ك)</Label>
                <Input
                  id="new_amount"
                  type="number"
                  step="0.001"
                  value={renewalData.new_amount}
                  onChange={(e) => setRenewalData({...renewalData, new_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="renewal_terms">شروط التجديد</Label>
                <Textarea
                  id="renewal_terms"
                  value={renewalData.renewal_terms}
                  onChange={(e) => setRenewalData({...renewalData, renewal_terms: e.target.value})}
                  placeholder="شروط وملاحظات خاصة بالتجديد"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={renewContract.isPending}>
              {renewContract.isPending ? 'جاري التجديد...' : 'تجديد العقد'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};