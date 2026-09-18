import { CalendarDays } from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
/**
 * صفحة متابعة الإيجارات الشهرية
 * تصميم متوافق مع الداشبورد الرئيسي
 */
import React from 'react';
import { MonthlyRentTracker } from '@/components/finance/MonthlyRentTracker';

const MonthlyRentTracking = () => {
  return (
    <div className="min-h-screen bg-[#F6F8FB] p-6" dir="rtl">
      <FinancePageHeader title="الإيجارات الشهرية" description="متابعة الإيجار المتوقع والتحصيل الشهري للعقود." icon={CalendarDays} />
      <MonthlyRentTracker />
    </div>
  );
};

export default MonthlyRentTracking;
