import { CalendarDays } from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
/**
 * صفحة متابعة الإيجارات الشهرية
 * موحّدة مع نظام التصميم المالي
 */
import React from 'react';
import { MonthlyRentTracker } from '@/components/finance/MonthlyRentTracker';

const MonthlyRentTracking = () => {
  return (
    <section className="space-y-5" dir="rtl">
      <FinancePageHeader title="الإيجارات الشهرية" description="متابعة الإيجار المتوقع والتحصيل الشهري للعقود." icon={CalendarDays} />
      <FinanceContextActions ids={["receive", "tracking"]} />
      <MonthlyRentTracker />
    </section>
  );
};

export default MonthlyRentTracking;