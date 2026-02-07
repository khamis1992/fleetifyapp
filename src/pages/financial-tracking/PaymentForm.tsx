// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, DollarSign, Loader2 } from 'lucide-react';
import {
  calculateDelayFine,
  type CustomerWithRental,
  type CustomerVehicle,
} from '@/hooks/useRentalPayments';

interface PaymentFormProps {
  selectedCustomer: CustomerWithRental;
  displayPaymentDate: string;
  onDisplayPaymentDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  paymentAmount: string;
  onPaymentAmountChange: (amount: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  referenceNumber: string;
  onReferenceNumberChange: (ref: string) => void;
  paymentNotes: string;
  onPaymentNotesChange: (notes: string) => void;
  paymentDate: string;
  onSubmit: () => void;
  isSubmitting: boolean;
  customerVehicles: CustomerVehicle[];
  selectedVehicleId: string | null;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  selectedCustomer,
  displayPaymentDate,
  onDisplayPaymentDateChange,
  paymentAmount,
  onPaymentAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  referenceNumber,
  onReferenceNumberChange,
  paymentNotes,
  onPaymentNotesChange,
  paymentDate,
  onSubmit,
  isSubmitting,
  customerVehicles,
  selectedVehicleId,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          إضافة دفعة جديدة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="paymentDate">تاريخ الدفع</Label>
            <Input
              id="paymentDate"
              type="text"
              value={displayPaymentDate}
              onChange={onDisplayPaymentDateChange}
              placeholder="DD/MM/YYYY"
              className="mt-1"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground mt-1">
              مثال: 15/10/2024
            </p>
          </div>

          <div>
            <Label htmlFor="paymentAmount">المبلغ المدفوع (ريال)</Label>
            <Input
              id="paymentAmount"
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
              placeholder="أدخل المبلغ المدفوع..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">طريقة الدفع</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="cash">نقداً</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="check">شيك</option>
              <option value="credit_card">بطاقة ائتمان</option>
              <option value="debit_card">بطاقة مدين</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <Label htmlFor="referenceNumber">رقم المرجع / الشيك (اختياري)</Label>
            <Input
              id="referenceNumber"
              type="text"
              value={referenceNumber}
              onChange={(e) => onReferenceNumberChange(e.target.value)}
              placeholder="رقم التحويل أو الشيك..."
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {paymentMethod === 'bank_transfer' && 'رقم التحويل البنكي'}
              {paymentMethod === 'check' && 'رقم الشيك'}
              {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && 'آخر 4 أرقام من البطاقة'}
              {paymentMethod === 'cash' && 'اختياري'}
            </p>
          </div>

          <div className="md:col-span-2 flex items-end">
            <Button 
              onClick={onSubmit} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة الدفعة
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="paymentNotes">ملاحظات الدفع (اختياري)</Label>
          <Input
            id="paymentNotes"
            type="text"
            value={paymentNotes}
            onChange={(e) => onPaymentNotesChange(e.target.value)}
            placeholder="مثال: دفعة متأخرة، دفع غرامة الشهر السابق، إلخ..."
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            ⚡ سيتم إضافة ملاحظة تلقائية إذا تم تسوية غرامة من شهر سابق
          </p>
        </div>

        {/* Payment Calculation Preview */}
        {paymentDate && selectedCustomer && (() => {
          const dateValid = paymentDate && !isNaN(new Date(paymentDate).getTime());
          if (!dateValid) return null;

          const { fine, month, rent_amount } = calculateDelayFine(paymentDate, selectedCustomer.monthly_rent);
          
          if (!month) return null;

          const totalDue = rent_amount + fine;
          const paidAmount = parseFloat(paymentAmount) || 0;
          const pendingBalance = Math.max(0, totalDue - paidAmount);
          const isPartialPayment = paidAmount > 0 && paidAmount < totalDue;
          const isFullyPaid = paidAmount >= totalDue;
          
          return (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm w-full">
                  <p className="font-semibold text-blue-900 mb-2">حساب الدفعة:</p>
                  <div className="space-y-1 text-blue-800">
                    <div className="flex justify-between">
                      <span>• الشهر:</span>
                      <span className="font-semibold">{month}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• الإيجار الشهري:</span>
                      <span className="font-semibold">{rent_amount.toLocaleString('en-US')} ريال</span>
                    </div>
                    {fine > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>• غرامة التأخير:</span>
                        <span className="font-bold">{fine.toLocaleString('en-US')} ريال</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                      <span className="font-bold">الإجمالي المستحق:</span>
                      <span className="font-bold text-lg">{totalDue.toLocaleString('en-US')} ريال</span>
                    </div>
                    {paidAmount > 0 && (
                      <>
                        <div className="flex justify-between text-green-700">
                          <span>• المبلغ المدفوع:</span>
                          <span className="font-bold">{paidAmount.toLocaleString('en-US')} ريال</span>
                        </div>
                        {pendingBalance > 0 && (
                          <div className="flex justify-between text-orange-700 bg-orange-50 -mx-2 px-2 py-1 rounded">
                            <span className="font-bold">⚠️ الرصيد المتبقي:</span>
                            <span className="font-bold text-lg">{pendingBalance.toLocaleString('en-US')} ريال</span>
                          </div>
                        )}
                        {isFullyPaid && (
                          <div className="flex items-center justify-center gap-2 bg-green-100 text-green-700 -mx-2 px-2 py-2 rounded mt-2">
                            <span className="text-2xl">✅</span>
                            <span className="font-bold">دفع كامل</span>
                          </div>
                        )}
                        {isPartialPayment && (
                          <div className="flex items-center justify-center gap-2 bg-orange-100 text-orange-700 -mx-2 px-2 py-2 rounded mt-2">
                            <span className="text-xl">⚠️</span>
                            <span className="font-bold">دفع جزئي - يوجد رصيد متبقي</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
