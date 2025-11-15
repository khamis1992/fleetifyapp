import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Calendar, DollarSign, Info } from 'lucide-react';
import { useRenewContract } from '@/hooks/useContractRenewal';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

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
    new_amount: 0,
    renewal_terms: ''
  });

  const renewContract = useRenewContract();
  const { toast } = useToast();
  const { formatCurrency, currency } = useCurrencyFormatter();

  // Reset form when contract changes or dialog opens
  useEffect(() => {
    if (contract && open) {
      setRenewalData({
        new_end_date: calculateSuggestedEndDate(),
        new_amount: contract.contract_amount || 0,
        renewal_terms: ''
      });
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!renewalData.new_end_date) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد تاريخ انتهاء العقد الجديد",
        variant: "destructive"
      });
      return;
    }

    try {
      await renewContract.mutateAsync({
        contract_id: contract.id,
        ...renewalData
      });
      
      toast({
        title: "نجح التجديد",
        description: "تم تجديد العقد بنجاح",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error renewing contract:', error);
      toast({
        title: "خطأ في التجديد",
        description: "حدث خطأ أثناء تجديد العقد",
        variant: "destructive"
      });
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

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'rent_to_own': return 'إيجار حتى التملك'
      case 'rental': return 'إيجار'
      case 'daily_rental': return 'إيجار يومي'
      case 'weekly_rental': return 'إيجار أسبوعي'
      case 'monthly_rental': return 'إيجار شهري'
      case 'yearly_rental': return 'إيجار سنوي'
      default: return 'إيجار'
    }
  };

  if (!contract) return null;

  const contractDuration = Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RefreshCw className="h-5 w-5 text-primary" />
            تجديد العقد
          </DialogTitle>
          <DialogDescription>
            تجديد العقد رقم {contract.contract_number}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Contract Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span>{getContractTypeLabel(contract.contract_type)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{contractDuration} يوم</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{formatCurrency(contract.contract_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_end_date" className="text-right">
              تاريخ انتهاء العقد الجديد *
            </Label>
            <Input
              id="new_end_date"
              type="date"
              value={renewalData.new_end_date}
              onChange={(e) => setRenewalData({...renewalData, new_end_date: e.target.value})}
              required
              className="text-right"
            />
            <p className="text-xs text-muted-foreground text-right">
              العقد الحالي ينتهي في: {new Date(contract.end_date).toLocaleDateString('en-GB')}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new_amount" className="text-right">
              قيمة العقد الجديد ({currency})
            </Label>
            <Input
              id="new_amount"
              type="number"
              step="0.001"
              value={renewalData.new_amount}
              onChange={(e) => setRenewalData({...renewalData, new_amount: parseFloat(e.target.value) || 0})}
              placeholder="0.000"
              className="text-right"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="renewal_terms" className="text-right">
              ملاحظات التجديد (اختياري)
            </Label>
            <Textarea
              id="renewal_terms"
              value={renewalData.renewal_terms}
              onChange={(e) => setRenewalData({...renewalData, renewal_terms: e.target.value})}
              placeholder="أي ملاحظات أو تعديلات على شروط العقد"
              rows={2}
              className="text-right"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={renewContract.isPending}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={renewContract.isPending}
              className="min-w-[120px]"
            >
              {renewContract.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  جاري التجديد...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  تجديد العقد
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};