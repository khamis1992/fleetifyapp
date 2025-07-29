import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCostCenters, useBanks } from "@/hooks/useTreasury";
import { useActiveContracts } from "@/hooks/useContracts";

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  contractId?: string;
  type: 'receipt' | 'payment';
}

export function PaymentForm({ open, onOpenChange, customerId, vendorId, invoiceId, contractId, type }: PaymentFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { data: costCenters } = useCostCenters();
  const { data: banks } = useBanks();

  // Fetch contracts for the customer/vendor
  const { data: contracts } = useActiveContracts(customerId, vendorId);

  const [paymentData, setPaymentData] = useState({
    payment_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    check_number: '',
    bank_account: '',
    cost_center_id: '',
    bank_id: '',
    currency: 'KWD',
    notes: '',
    contract_id: contractId || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.profile?.company_id) {
      toast.error("User company not found");
      return;
    }

    if (!paymentData.payment_number) {
      toast.error("رقم الدفعة مطلوب");
      return;
    }

    if (paymentData.amount <= 0) {
      toast.error("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('payments').insert({
        ...paymentData,
        company_id: user.profile.company_id,
        payment_type: type,
        customer_id: type === 'receipt' ? customerId : null,
        vendor_id: type === 'payment' ? vendorId : null,
        invoice_id: invoiceId,
        contract_id: paymentData.contract_id || null,
        cost_center_id: paymentData.cost_center_id || null,
        bank_id: paymentData.bank_id || null,
        status: 'completed',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success(`تم إنشاء ${type === 'receipt' ? 'إيصال القبض' : 'إيصال الصرف'} بنجاح`);
      onOpenChange(false);
      
      // Reset form
      setPaymentData({
        payment_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'cash',
        reference_number: '',
        check_number: '',
        bank_account: '',
        cost_center_id: '',
        bank_id: '',
        currency: 'KWD',
        notes: '',
        contract_id: '',
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error("حدث خطأ في إنشاء الدفعة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'receipt' ? 'إنشاء إيصال قبض جديد' : 'إنشاء إيصال صرف جديد'}
          </DialogTitle>
          <DialogDescription>
            {type === 'receipt' 
              ? 'أدخل تفاصيل المبلغ المقبوض من العميل' 
              : 'أدخل تفاصيل المبلغ المدفوع للمورد'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الدفعة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_number">رقم الإيصال *</Label>
                <Input
                  id="payment_number"
                  value={paymentData.payment_number}
                  onChange={(e) => setPaymentData({...paymentData, payment_number: e.target.value})}
                  placeholder={type === 'receipt' ? "REC-2024-001" : "PAY-2024-001"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">تاريخ الدفعة *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.000"
                  min="0"
                  step="0.001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Select value={paymentData.currency} onValueChange={(value) => setPaymentData({...paymentData, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="EUR">يورو (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_center_id">مركز التكلفة</Label>
                <Select value={paymentData.cost_center_id} onValueChange={(value) => setPaymentData({...paymentData, cost_center_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مركز تكلفة</SelectItem>
                    {costCenters?.filter(center => center.id && center.id.trim() !== '').map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.center_name_ar || center.center_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_id">البنك</Label>
                <Select value={paymentData.bank_id} onValueChange={(value) => setPaymentData({...paymentData, bank_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البنك" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون بنك</SelectItem>
                    {banks?.filter(bank => bank.id && bank.id.trim() !== '').map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name_ar || bank.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">طريقة الدفع *</Label>
                <Select value={paymentData.payment_method} onValueChange={(value) => setPaymentData({...paymentData, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="debit_card">بطاقة خصم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_id">العقد المرتبط (اختياري)</Label>
                <Select value={paymentData.contract_id} onValueChange={(value) => setPaymentData({...paymentData, contract_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العقد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون عقد</SelectItem>
                    {contracts?.map(contract => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">رقم المرجع</Label>
                <Input
                  id="reference_number"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                  placeholder="رقم المرجع أو التحويل"
                />
              </div>

              {paymentData.payment_method === 'check' && (
                <div className="space-y-2">
                  <Label htmlFor="check_number">رقم الشيك</Label>
                  <Input
                    id="check_number"
                    value={paymentData.check_number}
                    onChange={(e) => setPaymentData({...paymentData, check_number: e.target.value})}
                    placeholder="رقم الشيك"
                  />
                </div>
              )}

              {(paymentData.payment_method === 'bank_transfer' || paymentData.payment_method === 'check') && (
                <div className="space-y-2">
                  <Label htmlFor="bank_account">الحساب البنكي</Label>
                  <Input
                    id="bank_account"
                    value={paymentData.bank_account}
                    onChange={(e) => setPaymentData({...paymentData, bank_account: e.target.value})}
                    placeholder="رقم الحساب البنكي"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : "حفظ الإيصال"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}