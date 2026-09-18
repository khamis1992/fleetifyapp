import { LegalPageHeader } from '@/components/legal/workspace/LegalPageHeader';
/**
 * Invoice Disputes Page
 * 
 * Route: /legal/invoice-disputes
 * Purpose: Manage invoice disputes and billing issues
 * 
 * Features:
 * - View all disputes
 * - Track resolution status
 * - Internal notes and communication
 * - Generate adjustments/credit notes
 * - Statistics dashboard
 */

import React from 'react';
import { InvoiceDisputeManagement } from '@/components/invoices/InvoiceDisputeManagement';
import '@/styles/legal-system.css';

const InvoiceDisputes: React.FC = () => {
  return (
    <div className="legal-system min-h-screen p-4 md:p-6">
      <LegalPageHeader title="نزاعات الفواتير" description="تابع اعتراضات العملاء، وراجع الملاحظات وقرارات تسوية الفواتير." />

      <InvoiceDisputeManagement />
    </div>
  );
};

export default InvoiceDisputes;
