# Professional Invoice Template Component Guide

## Overview

The `ProfessionalInvoiceTemplate` component is a React component that implements a modern, professional invoice design while integrating with the Fleetify system's architecture and data structures.

## Features

- Modern, professional invoice design with clean layout
- Responsive design that works on all screen sizes
- Support for multiple invoice types (sales, purchase, service, rental)
- Status badges with color coding (paid, pending, overdue, cancelled)
- Detailed invoice information display (dates, customer info, items, totals)
- Print and PDF download functionality
- RTL (Right-to-Left) support for Arabic language
- Integration with Fleetify's payment data structures

## Usage

### Basic Usage

```tsx
import { ProfessionalInvoiceTemplate } from '@/components/finance';

const MyComponent = () => {
  const invoiceData = {
    id: "inv_12345",
    invoice_number: "INV-2025-001",
    invoice_date: "2025-01-15",
    due_date: "2025-02-15",
    invoice_type: "sales",
    status: "paid",
    currency: "KWD",
    subtotal: 300.000,
    tax_amount: 15.000,
    discount_amount: 0,
    total_amount: 315.000,
    terms: "الدفع خلال 30 يوماً من تاريخ الفاتورة",
    notes: "شكراً لثقتكم في خدماتنا",
    customer_name: "شركة النور التجارية",
    items: [
      {
        id: 1,
        description: 'خدمة استشارية شهرية',
        quantity: 2,
        unit_price: 150.000,
        tax_rate: 5,
        total: 315.000
      }
    ]
  };

  return (
    <ProfessionalInvoiceTemplate invoice={invoiceData} />
  );
};
```

### With Print and Download Functionality

```tsx
import { ProfessionalInvoiceTemplate } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

const InvoiceWithActions = () => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Implementation for PDF download
    console.log('Download requested');
  };

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
        <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          تحميل PDF
        </Button>
      </div>
      
      <ProfessionalInvoiceTemplate 
        invoice={invoiceData}
        onPrint={handlePrint}
        onDownload={handleDownload}
      />
    </div>
  );
};
```

## Props

| Prop | Type | Description | Required |
|------|------|-------------|----------|
| invoice | any | Invoice data to display | Yes |
| onPrint | () => void | Callback function for print action | No |
| onDownload | () => void | Callback function for download action | No |
| className | string | Additional CSS classes | No |

## Integration with Existing System

The component is designed to work seamlessly with the existing Fleetify finance system:

1. **Data Structure**: Uses the invoice data structure from the Fleetify system
2. **Styling**: Follows Fleetify's design system and Tailwind CSS conventions
3. **RTL Support**: Properly handles right-to-left text for Arabic language
4. **Currency Formatting**: Integrates with the `useCurrencyFormatter` hook

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized through the `className` prop:

```tsx
<ProfessionalInvoiceTemplate 
  invoice={invoiceData} 
  className="max-w-3xl mx-auto shadow-xl" 
/>
```

### Colors

The component uses Fleetify's design system colors:
- Primary: Fleetify primary color
- Status colors: Green for paid, yellow for pending, red for overdue, gray for cancelled

These can be customized by modifying the Tailwind CSS classes in the component.

## Testing

The component includes unit tests in `__tests__/ProfessionalInvoiceTemplate.test.tsx` that verify:
- Proper rendering of all elements
- Correct display of invoice information
- Proper handling of different invoice statuses
- Status badge color coding
- Terms and notes display

## Accessibility

The component follows accessibility best practices:
- Proper semantic HTML structure
- ARIA labels where appropriate
- Sufficient color contrast
- Keyboard navigable elements

## Print Optimization

The component is optimized for printing:
- Uses print-friendly styles
- Removes unnecessary shadows and backgrounds
- Ensures proper sizing for printed documents

To trigger printing, use the browser's print functionality or call `window.print()` in JavaScript.

## PDF Generation

The component supports PDF generation through the `html2pdf.js` library:
- Converts the invoice to a PDF file
- Maintains the same styling as the HTML version
- Provides a download option for users

## Responsive Design

The component is fully responsive:
- Adapts to different screen sizes
- Maintains readability on mobile devices
- Adjusts layout for optimal viewing on all devices

## Internationalization

The component supports both Arabic and English:
- RTL layout for Arabic text
- Proper text direction handling
- Bilingual labels and descriptions