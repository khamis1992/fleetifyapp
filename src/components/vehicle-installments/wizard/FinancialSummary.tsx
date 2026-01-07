import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Calendar, TrendingUp, Wallet, CreditCard, PiggyBank } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format, addMonths } from "date-fns";
import { ar } from "date-fns/locale";

interface FinancialSummaryProps {
  totalAmount: number;
  downPayment: number;
  numberOfInstallments: number;
  interestRate: number;
  startDate: string;
  vehicleCount: number;
}

export function FinancialSummary({
  totalAmount,
  downPayment,
  numberOfInstallments,
  interestRate,
  startDate,
  vehicleCount,
}: FinancialSummaryProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const calculations = useMemo(() => {
    const principal = totalAmount - downPayment;
    const monthlyInterestRate = interestRate / 12 / 100;
    
    let installmentAmount: number;
    let totalWithInterest: number;
    let totalInterest: number;

    if (monthlyInterestRate > 0 && numberOfInstallments > 0) {
      const denominator = Math.pow(1 + monthlyInterestRate, numberOfInstallments) - 1;
      installmentAmount = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfInstallments) / denominator;
      totalWithInterest = installmentAmount * numberOfInstallments + downPayment;
      totalInterest = totalWithInterest - totalAmount;
    } else {
      installmentAmount = numberOfInstallments > 0 ? principal / numberOfInstallments : 0;
      totalWithInterest = totalAmount;
      totalInterest = 0;
    }

    const endDate = startDate 
      ? format(addMonths(new Date(startDate), numberOfInstallments), "yyyy-MM-dd")
      : "";

    const amountPerVehicle = vehicleCount > 0 ? principal / vehicleCount : 0;

    return {
      principal: Math.round(principal * 100) / 100,
      installmentAmount: Math.round(installmentAmount * 100) / 100,
      totalWithInterest: Math.round(totalWithInterest * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      endDate,
      amountPerVehicle: Math.round(amountPerVehicle * 100) / 100,
    };
  }, [totalAmount, downPayment, numberOfInstallments, interestRate, startDate, vehicleCount]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    try {
      return format(new Date(dateStr), "dd MMMM yyyy", { locale: ar });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-rose-500" />
          الملخص المالي التفاعلي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Monthly Installment */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-rose-500" />
              <span className="text-xs text-neutral-500">القسط الشهري</span>
            </div>
            <p className="text-lg font-bold text-coral-600">
              {formatCurrency(calculations.installmentAmount)}
            </p>
          </div>

          {/* Total with Interest */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-neutral-500">الإجمالي مع الفوائد</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(calculations.totalWithInterest)}
            </p>
          </div>

          {/* Total Interest */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-neutral-500">إجمالي الفوائد</span>
            </div>
            <p className="text-lg font-bold text-amber-600">
              {formatCurrency(calculations.totalInterest)}
            </p>
          </div>

          {/* Principal Amount */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-neutral-500">المبلغ المتبقي</span>
            </div>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(calculations.principal)}
            </p>
          </div>

          {/* End Date */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-neutral-500">تاريخ الانتهاء</span>
            </div>
            <p className="text-sm font-bold text-purple-600">
              {formatDate(calculations.endDate)}
            </p>
          </div>

          {/* Per Vehicle */}
          {vehicleCount > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm border border-rose-100">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {vehicleCount} مركبات
                </Badge>
              </div>
              <p className="text-lg font-bold text-neutral-700">
                {formatCurrency(calculations.amountPerVehicle)}
                <span className="text-xs text-neutral-500 font-normal"> / مركبة</span>
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {totalAmount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>الدفعة المقدمة</span>
              <span>{((downPayment / totalAmount) * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-coral-400 to-orange-400 transition-all duration-500"
                style={{ width: `${(downPayment / totalAmount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

