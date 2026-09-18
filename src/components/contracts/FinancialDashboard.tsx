/**
 * مكون لوحة التحكم المالية المصغرة - تصميم محسّن
 * عرض ملخص مالي شامل مع تصور بياني محسّن
 * Redesigned with improved UI/UX, better visual hierarchy, and modern card-based layout
 */

import { useMemo } from 'react';
import { ContractSectionHeading } from './contract-details-v3/ContractSection';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Contract } from '@/types/contracts';
import type { ContractFinancialSnapshot } from './contract-details-v3/tokens';

interface FinancialDashboardProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
  snapshot: ContractFinancialSnapshot;
}

export const FinancialDashboard = ({ contract, formatCurrency, snapshot }: FinancialDashboardProps) => {
  // جميع بطاقات الصفحة تعتمد اللقطة المالية المركزية نفسها.
  const financialData = useMemo(() => {
    const contractAmount = snapshot.contractTotal;
    const monthlyAmount = contract.monthly_amount || 0;
    const totalPaid = snapshot.paidTotal;
    const balanceDue = snapshot.remainingTotal;

    // نسبة الدفع
    const paymentPercentage = contractAmount > 0 ? Math.min(balanceDue > 0 ? 99 : 100, Math.floor((totalPaid / contractAmount) * 100)) : 0;

    // المبالغ الإضافية (إذا تجاوز المدفوع قيمة العقد)
    const extraPayments = Math.max(0, snapshot.activePaymentsTotal - contractAmount);

    // حالة الدفع
    const getPaymentStatus = () => {
      if (snapshot.financialReviewRequired) return { label: 'يحتاج مطابقة', variant: 'secondary' as const, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' };
      if (contractAmount > 0 && balanceDue === 0) return { label: 'مسدد بالكامل', variant: 'default' as const, color: 'text-[#0E9E7E]', bg: 'bg-[#ECFDF9]' };
      if (paymentPercentage >= 50) return { label: 'مسدد جزئياً', variant: 'secondary' as const, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' };
      if (totalPaid <= 0.01) return { label: 'غير مسدد', variant: 'secondary' as const, color: 'text-[#BE123C]', bg: 'bg-[#FFF5F6]' };
      return { label: 'مسدد قليلاً', variant: 'secondary' as const, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' };
    };

    return {
      contractAmount,
      totalPaid,
      balanceDue,
      monthlyAmount,
      paymentPercentage,
      extraPayments,
      paymentStatus: getPaymentStatus(),
    };
  }, [contract.monthly_amount, snapshot]);


  return <div className="space-y-6">
    <ContractSectionHeading number="02" title="الموقف المالي" description="ملخص التحصيل والرصيد المتبقي من البيانات المثبتة للعقد." />
    {!snapshot.hasFinancialCoverage && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">بيانات التحصيل غير مكتملة؛ راجع الفواتير والإيصالات قبل اعتماد الرصيد.</div>}
    {snapshot.financialReviewRequired && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">توجد فروقات تحتاج مطابقة قبل اعتماد الملخص المالي.</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-[#c5dcd0] bg-[#edf6f0] p-6 sm:p-8" aria-label="تقدم التحصيل">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-teal-900">المحصل من قيمة العقد</h3><Badge variant="outline" className="border-teal-200 bg-white text-teal-800">{financialData.paymentStatus.label}</Badge></div>
        <p className="mt-8 break-words text-3xl font-semibold tracking-tight text-teal-900">{formatCurrency(financialData.totalPaid)}</p>
        <p className="mt-2 text-sm text-teal-800">من {formatCurrency(financialData.contractAmount)}</p>
        <div className="mt-8 flex items-end justify-between gap-3"><span className="text-xs text-teal-800">نسبة التحصيل</span><strong className="text-2xl text-teal-900">{financialData.paymentPercentage}%</strong></div>
        <Progress aria-label="نسبة التحصيل" value={financialData.paymentPercentage} className="mt-3 h-2 bg-white [&>div]:bg-teal-700" />
        <div className="mt-8 border-t border-teal-200 pt-5"><p className="text-xs text-teal-800">المتبقي على العقد</p><p className="mt-2 text-xl font-semibold text-teal-950">{formatCurrency(financialData.balanceDue)}</p></div>
      </section>
      <section className="rounded-2xl border border-[#dce5e1] bg-white p-6" aria-label="تفاصيل الموقف المالي">
        <h3 className="mb-2 text-lg font-semibold">تفاصيل الرصيد</h3>
        <dl className="divide-y divide-[#e7eeea]">
          {[
            ['قيمة العقد الأساسية',financialData.contractAmount],
            ['القيمة الشهرية',financialData.monthlyAmount],
            ['المسدد من قيمة العقد',financialData.totalPaid],
            ['المبلغ المتبقي',financialData.balanceDue],
            ['الإجمالي الكلي',snapshot.activePaymentsTotal],
          ].map(([label,value])=><div key={String(label)} className="flex flex-wrap items-center justify-between gap-3 py-5"><dt className="text-sm text-[#64756e]">{label}</dt><dd className="font-semibold tabular-nums">{formatCurrency(Number(value))}</dd></div>)}
        </dl>
        {financialData.extraPayments > 0 && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p>مبالغ إضافية</p><p className="mt-1">فوق قيمة العقد: {formatCurrency(financialData.extraPayments)}</p></div>}
      </section>
    </div>
  </div>;
};
