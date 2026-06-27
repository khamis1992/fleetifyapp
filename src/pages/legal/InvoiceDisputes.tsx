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
      <div className="legal-hero mb-6 p-4">
        <h1 className="text-3xl font-bold">إدارة نزاعات الفواتير</h1>
        <p className="text-muted-foreground mt-2">
          تتبع وحل مشاكل الفواتير والنزاعات المالية مع العملاء
        </p>
      </div>
      
      <InvoiceDisputeManagement />
    </div>
  );
};

export default InvoiceDisputes;
