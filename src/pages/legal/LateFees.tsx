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
      <div className="legal-hero mb-6 p-4">
        <h1 className="text-3xl font-bold">إدارة غرامات التأخير</h1>
        <p className="text-muted-foreground mt-2">
          معالجة تلقائية يومية للفواتير المتأخرة وتطبيق الغرامات حسب سياسة الشركة
        </p>
      </div>
      
      <LateFeeManagement />
    </div>
  );
};

export default LateFees;
