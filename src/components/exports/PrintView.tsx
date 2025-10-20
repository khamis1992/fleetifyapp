/**
 * Print View Component
 *
 * Wrapper component that optimizes content for printing.
 * Applies CSS @media print styles to hide navigation, sidebars, and other non-essential elements.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export interface PrintViewProps {
  /** Content to print */
  children: React.ReactNode;
  /** Company name for header */
  companyName?: string;
  /** Document title */
  title?: string;
  /** Show print button */
  showPrintButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const PrintView: React.FC<PrintViewProps> = ({
  children,
  companyName = 'FleetifyApp',
  title = 'تقرير',
  showPrintButton = true,
  className = '',
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide non-essential elements */
          .no-print,
          nav,
          aside,
          header,
          footer,
          .sidebar,
          .navigation,
          .navbar,
          button,
          .dropdown,
          .tooltip {
            display: none !important;
          }

          /* Show only print content */
          .print-only {
            display: block !important;
          }

          /* Page setup */
          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            font-size: 12pt;
          }

          /* Reset layout for print */
          * {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Chart containers */
          .chart-container {
            page-break-inside: avoid;
            margin-bottom: 20mm;
          }

          /* Tables */
          table {
            page-break-inside: avoid;
            width: 100% !important;
            border-collapse: collapse;
          }

          table th {
            background-color: #3b82f6 !important;
            color: white !important;
            padding: 8px;
            text-align: right;
            border: 1px solid #ddd;
          }

          table td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            text-align: right;
          }

          /* Cards */
          .card,
          .widget {
            page-break-inside: avoid;
            margin-bottom: 10mm;
            border: 1px solid #ddd !important;
            padding: 10mm !important;
          }

          /* Headings */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            margin-top: 0;
          }

          h1 {
            font-size: 24pt;
            margin-bottom: 10mm;
          }

          h2 {
            font-size: 18pt;
            margin-bottom: 8mm;
          }

          h3 {
            font-size: 14pt;
            margin-bottom: 6mm;
          }

          /* Page breaks */
          .page-break {
            page-break-before: always;
          }

          .avoid-break {
            page-break-inside: avoid;
          }

          /* Print header */
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 10mm;
            padding-bottom: 5mm;
            border-bottom: 2px solid #3b82f6;
          }

          .print-header h1 {
            margin: 0;
            color: #3b82f6;
          }

          .print-header .company-name {
            font-size: 18pt;
            font-weight: bold;
            color: #1f2937;
          }

          .print-header .print-date {
            font-size: 10pt;
            color: #6b7280;
            margin-top: 2mm;
          }

          /* Links */
          a {
            text-decoration: none;
            color: black !important;
          }

          a[href]:after {
            content: "";
          }

          /* Flex/Grid layouts */
          .flex,
          .grid {
            display: block !important;
          }

          /* Images */
          img {
            max-width: 100% !important;
            page-break-inside: avoid;
          }

          /* Recharts (SVG charts) */
          .recharts-wrapper {
            page-break-inside: avoid;
          }

          /* Hide scroll containers */
          .scroll-area,
          .overflow-auto,
          .overflow-scroll {
            overflow: visible !important;
            max-height: none !important;
          }

          /* Optimize shadows and effects */
          .shadow,
          .shadow-sm,
          .shadow-md,
          .shadow-lg {
            box-shadow: none !important;
          }

          /* Optimize spacing */
          .container {
            max-width: 100% !important;
            padding: 0 !important;
          }

          /* Dashboard grid */
          .dashboard-grid {
            display: block !important;
          }

          .dashboard-grid > * {
            width: 100% !important;
            margin-bottom: 10mm;
          }
        }

        /* Print-only elements (hidden on screen) */
        .print-only {
          display: none;
        }

        @media print {
          .print-only {
            display: block;
          }
        }
      `}</style>

      {/* Print Header (only visible when printing) */}
      <div className="print-only print-header">
        <div className="company-name">{companyName}</div>
        <h1>{title}</h1>
        <div className="print-date">
          تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* Print Button (hidden when printing) */}
      {showPrintButton && (
        <div className="no-print mb-4">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        </div>
      )}

      {/* Content */}
      <div className={className}>
        {children}
      </div>
    </>
  );
};

/**
 * Page Break Component
 * Insert this between sections to force a page break in print
 */
export const PrintPageBreak: React.FC = () => {
  return <div className="page-break" />;
};

/**
 * Avoid Break Component
 * Wrap content that should not be split across pages
 */
export const AvoidBreak: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="avoid-break">{children}</div>;
};
