import { LegalPageHeader } from '@/components/legal/workspace/LegalPageHeader';
/**
 * Late Fee Management Page
 * 
 * Route: /legal/late-fees
 * Purpose: Manage automatic late fees for overdue invoices
 * 
 * Features:
 * - View pending late fees
 * - Apply fees to invoices
 * - Request/approve waivers
 * - Manual processing trigger
 * - Statistics dashboard
 */

import React from 'react';
import { LateFeeManagement } from '@/components/invoices/LateFeeManagement';
import '@/styles/legal-system.css';

const LateFees: React.FC = () => {
  return (
    <div className="legal-system min-h-screen p-4 md:p-6">
      <LegalPageHeader title="غرامات التأخير" description="راجع الغرامات وحالات الإعفاء وقرارات المعالجة حسب سياسة الشركة." />

      <LateFeeManagement />
    </div>
  );
};

export default LateFees;
