/**
 * AR Aging Report Page
 *
 * Route: /finance/reports/ar-aging
 * Purpose: Accounts Receivable aging analysis and collections management
 *
 * Features:
 * - 5 aging categories breakdown
 * - Customer-wise analysis
 * - Collections priority list
 * - Export to Excel
 */

import React from 'react';
import { ARAgingReport } from '@/components/finance/ARAgingReport';
import { FinanceReportShell } from '@/components/finance/workspace/FinanceReportShell';

const ARAgingReportPage: React.FC = () => {
  return (
    <FinanceReportShell
      title="أعمار الذمم المدينة"
      description="تحليل أعمار أرصدة العملاء وأولويات التحصيل مع التصدير إلى Excel."
    >
      <ARAgingReport />
    </FinanceReportShell>
  );
};

export default ARAgingReportPage;
