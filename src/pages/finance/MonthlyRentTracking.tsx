/**
 * صفحة متابعة الإيجارات الشهرية
 * تصميم متوافق مع الداشبورد الرئيسي
 */
import React from 'react';
import { MonthlyRentTracker } from '@/components/finance/MonthlyRentTracker';

const MonthlyRentTracking = () => {
  return (
    <div className="min-h-screen bg-[#F6F8FB] p-6" dir="rtl">
      <MonthlyRentTracker />
    </div>
  );
};

export default MonthlyRentTracking;
