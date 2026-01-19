/**
 * Payment Tracking Page
 * 
 * Route: /finance/payment-tracking
 * Purpose: Track partial payments, timeline view, and bank reconciliation
 * 
 * Features:
 * - Payment timeline view
 * - Visual indicators: Unpaid/Partial/Paid
 * - Payment method tracking
 * - Bank reconciliation dashboard
 */

import React from 'react';
import { PaymentTracking } from '@/components/finance/PaymentTracking';
import { PageHelp } from "@/components/help";
import { PaymentTrackingPageHelpContent } from "@/components/help/content";

const PaymentTrackingPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <PaymentTracking />
    </div>
  );
};

export default PaymentTrackingPage;
