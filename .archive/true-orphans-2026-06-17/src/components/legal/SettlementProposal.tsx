import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Percent, Calendar, Plus, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface SettlementProposalProps {
  caseId: string;
  caseNumber: string;
  clientName: string;
  totalClaim: number;
  onProposalCreated?: (data: unknown) => void;
}

export const SettlementProposal: React.FC<SettlementProposalProps> = ({
  caseId,
  caseNumber,
  clientName,
  totalClaim,
  onProposalCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [dropFees, setDropFees] = useState(false);
  const [lateFees, setLateFees] = useState(0);
  const [courtFees, setCourtFees] = useState(0);
  const [usePaymentPlan, setUsePaymentPlan] = useState(false);
  const [months, setMonths] = useState(3);
  const [terms, setTerms] = useState('');
  const [days, setDays] = useState(14);
  const [notes, setNotes] = useState('');

  const reducedAmount = totalClaim * (1 - discount / 100);
  const finalAmount = dropFees ? reducedAmount : reducedAmount + lateFees;
  const monthlyPayment = usePaymentPlan ? Math.ceil(finalAmount / months) : 0;

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!terms.trim()) {
        toast.error('يرجى إدخال شروط التسوية');
        return;
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const proposal = {
        caseId,
        caseNumber,
        clientName,
        originalAmount: totalClaim,
        discount,
        reducedAmount,
        dropLateFees: dropFees,
        lateFees,
        courtFees,
        usePaymentPlan,
        months: usePaymentPlan ? months : null,
        monthlyPayment: usePaymentPlan ? monthlyPayment : null,
        terms,
        expiryDate: expiryDate.toISOString().split('T')[0],
        notes,
      };

      toast.success('تم إنشاء عرض التسوية بنجاح');
      onProposalCreated?.(proposal);

      setDiscount(0);
      setDropFees(false);
      setLateFees(0);
      setCourtFees(0);
      setUsePaymentPlan(false);
      setMonths(3);
      setTerms('');
      setDays(14);
      setNotes('');
      setOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          عرض تسوية جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء عرض تسوية</DialogTitle>
          <DialogDescription>
            قضية {caseNumber} - {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">إجمالي المطالبة</span>
              <span className="text-2xl font-bold">{formatCurrency(totalClaim)}</span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                الخصم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="discount">نسبة الخصم (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="text-right p-2 bg-muted rounded w-32">
                  <div className="text-sm text-muted-foreground">المبلغ المخفض</div>
                  <div className="text-lg font-bold">{formatCurrency(reducedAmount)}</div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  الخصم: {formatCurrency(totalClaim - reducedAmount)} ({discount}%)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                الرسوم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dropFees"
                  checked={dropFees}
                  onCheckedChange={(checked) => setDropFees(checked === true)}
                />
                <Label htmlFor="dropFees">إسقاط الرسوم المتأخرة</Label>
              </div>
              <div>
                <Label htmlFor="lateFees">الرسوم المتأخرة</Label>
                <Input
                  id="lateFees"
                  type="number"
                  value={lateFees}
                  onChange={(e) => setLateFees(parseFloat(e.target.value) || 0)}
                  disabled={dropFees}
                />
              </div>
              <div>
                <Label htmlFor="courtFees">رسوم المحكمة</Label>
                <Input
                  id="courtFees"
                  type="number"
                  value={courtFees}
                  onChange={(e) => setCourtFees(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                خطة الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="plan"
                  checked={usePaymentPlan}
                  onCheckedChange={(checked) => setUsePaymentPlan(checked === true)}
                />
                <Label htmlFor="plan">استخدام خطة دفع قسط</Label>
              </div>
              {usePaymentPlan && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="months">عدد الأقساط</Label>
                    <Input
                      id="months"
                      type="number"
                      min="1"
                      max="24"
                      value={months}
                      onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="text-right p-2 bg-muted rounded w-32">
                    <div className="text-sm text-muted-foreground">القسط الشهري</div>
                    <div className="text-lg font-bold">{formatCurrency(monthlyPayment)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">المبلغ النهائي</span>
              <span className="text-3xl font-bold text-primary">{formatCurrency(finalAmount)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="terms">شروط التسوية</Label>
            <Textarea
              id="terms"
              placeholder="أدخل الشروط والأحكام..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="days">صلاحية العرض (أيام)</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 14)}
              />
            </div>
            <div className="p-2 bg-muted rounded text-right">
              <div className="text-sm text-muted-foreground">تنتهي في</div>
              <div className="text-sm font-semibold">
                {new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('ar-KW')}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              placeholder="ملاحظات إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'جاري...' : 'إنشاء العرض'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettlementProposal;
