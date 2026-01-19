/**
 * AR Aging Report Page
 * 
 * Route: /finance/ar-aging
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

const ARAgingReportPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <ARAgingReport />
    </div>
  );
};

export default ARAgingReportPage;
