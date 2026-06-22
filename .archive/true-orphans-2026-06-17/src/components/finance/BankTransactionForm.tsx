import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateBankTransaction, useBanks } from "@/hooks/useTreasury";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BankTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankId?: string;
  type?: 'deposit' | 'withdrawal';
}

export function BankTransactionForm({ open, onOpenChange, bankId, type }: BankTransactionFormProps) {
  const { user } = useAuth();
  const { data: banks, isLoading: banksLoading } = useBanks();
  const createBankTransaction = useCreateBankTransaction();

  const [transactionData, setTransactionData] = useState({
    transaction_number: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: (type || 'deposit') as any,
    amount: 0,
    description: '',
    reference_number: '',
    check_number: '',
    bank_id: bankId || '',
    counterpart_bank_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.profile?.company_id) {
      toast.error("User company not found");
      return;
    }

    if (!transactionData.transaction_number) {
      toast.error("رقم العملية مطلوب");
      return;
    }

    if (!transactionData.bank_id) {
      toast.error("يرجى اختيار البنك");
      return;
    }

    if (transactionData.amount <= 0) {
      toast.error("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }

    try {
      // Get current bank balance to calculate balance_after
      const selectedBank = banks?.find(bank => bank.id === transactionData.bank_id);
      const currentBalance = selectedBank?.current_balance || 0;
      
      let newBalance;
      if (transactionData.transaction_type === 'deposit') {
        newBalance = currentBalance + transactionData.amount;
      } else {
        newBalance = currentBalance - transactionData.amount;
      }

      await createBankTransaction.mutateAsync({
        ...transactionData,
        company_id: user.profile.company_id,
        balance_after: newBalance,
        status: 'completed',
        reconciled: false,
        created_by: user.id,
      });

      toast.success("تم إنشاء العملية البنكية بنجاح");
      onOpenChange(false);
      
      // Reset form
      setTransactionData({
        transaction_number: '',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: (type || 'deposit') as any,
        amount: 0,
        description: '',
        reference_number: '',
        check_number: '',
        bank_id: bankId || '',
        counterpart_bank_id: '',
      });
    } catch (error) {
      console.error('Error creating bank transaction:', error);
      toast.error("حدث خطأ في إنشاء العملية البنكية");
    }
  };

  if (banksLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            إنشاء عملية بنكية جديدة
          </DialogTitle>
          <DialogDescription>
            أدخل تفاصيل العملية البنكية (إيداع أو سحب)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات العملية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction_number">رقم العملية *</Label>
                <Input
                  id="transaction_number"
                  value={transactionData.transaction_number}
                  onChange={(e) => setTransactionData({...transactionData, transaction_number: e.target.value})}
                  placeholder="TXN-2024-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">تاريخ العملية *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={transactionData.transaction_date}
                  onChange={(e) => setTransactionData({...transactionData, transaction_date: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_id">البنك *</Label>
                <Select 
                  value={transactionData.bank_id} 
                  onValueChange={(value) => setTransactionData({...transactionData, bank_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البنك" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks?.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_type">نوع العملية *</Label>
                <Select 
                  value={transactionData.transaction_type} 
                  onValueChange={(value) => setTransactionData({...transactionData, transaction_type: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">إيداع</SelectItem>
                    <SelectItem value="withdrawal">سحب</SelectItem>
                    <SelectItem value="transfer">تحويل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData({...transactionData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.000"
                  min="0"
                  step="0.001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">رقم المرجع</Label>
                <Input
                  id="reference_number"
                  value={transactionData.reference_number}
                  onChange={(e) => setTransactionData({...transactionData, reference_number: e.target.value})}
                  placeholder="رقم المرجع أو التحويل"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_number">رقم الشيك</Label>
                <Input
                  id="check_number"
                  value={transactionData.check_number}
                  onChange={(e) => setTransactionData({...transactionData, check_number: e.target.value})}
                  placeholder="رقم الشيك (إن وجد)"
                />
              </div>

              {transactionData.transaction_type === 'transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="counterpart_bank_id">البنك المحول إليه</Label>
                  <Select 
                    value={transactionData.counterpart_bank_id} 
                    onValueChange={(value) => setTransactionData({...transactionData, counterpart_bank_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر البنك المحول إليه" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks?.filter(bank => bank.id !== transactionData.bank_id).map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.bank_name} - {bank.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">الوصف *</Label>
                <Textarea
                  id="description"
                  value={transactionData.description}
                  onChange={(e) => setTransactionData({...transactionData, description: e.target.value})}
                  placeholder="وصف العملية البنكية..."
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createBankTransaction.isPending}>
              {createBankTransaction.isPending ? "جاري الحفظ..." : "حفظ العملية"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}