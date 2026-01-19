# Cash Receipt Voucher Component Guide

## Overview

The `CashReceiptVoucher` component is a React component that implements the Al Arraf Cash Receipt Voucher design while integrating with the Fleetify system's architecture and data structures.

## Features

- Follows the exact Al Arraf Cash Receipt Voucher design
- Supports both cash and cheque payment methods
- Converts numeric amounts to Arabic words
- RTL (Right-to-Left) support for Arabic language
- Responsive design that works on all screen sizes
- Print-friendly layout
- Integration with Fleetify's payment data structures

## Usage

### Basic Usage

```tsx
import { CashReceiptVoucher } from '@/components/finance';

const MyComponent = () => {
  const paymentData = {
    payment_number: "REC-2025-00144",
    payment_date: "2025-01-15",
    amount: 1500.00,
    payment_method: 'cash',
    currency: 'QAR',
    notes: "إيجار شهر يناير 2025",
    type: 'receipt',
    customer_id: "cust-123",
    payment_status: 'completed'
  };

  return (
    <CashReceiptVoucher payment={paymentData} />
  );
};
```

### With Print Functionality

```tsx
import { CashReceiptVoucher } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const CashReceiptWithPrint = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <Button onClick={handlePrint} className="flex items-center gap-2 mb-4">
        <Printer className="h-4 w-4" />
        طباعة السند
      </Button>
      <CashReceiptVoucher 
        payment={paymentData} 
        onPrint={handlePrint}
      />
    </div>
  );
};
```

## Props

| Prop | Type | Description | Required |
|------|------|-------------|----------|
| payment | EnhancedPaymentData | Payment data to display | Yes |
| onPrint | () => void | Callback function for print action | No |
| className | string | Additional CSS classes | No |

## Integration with Existing System

The component is designed to work seamlessly with the existing Fleetify finance system:

1. **Data Structure**: Uses the `EnhancedPaymentData` type from `@/schemas/payment.schema`
2. **Styling**: Follows Fleetify's design system and Tailwind CSS conventions
3. **RTL Support**: Properly handles right-to-left text for Arabic language
4. **Currency Formatting**: Integrates with the `useCurrencyFormatter` hook

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized through the `className` prop:

```tsx
<CashReceiptVoucher 
  payment={paymentData} 
  className="max-w-3xl mx-auto shadow-xl" 
/>
```

### Colors

The component uses the Al Arraf brand colors:
- Primary: `#004d40` (Dark Teal)
- Secondary: `#ff9800` (Orange/Amber)

These can be customized by modifying the Tailwind CSS classes in the component.

## Testing

The component includes unit tests in `__tests__/CashReceiptVoucher.test.tsx` that verify:
- Proper rendering of all elements
- Correct display of payment information
- Proper handling of different payment methods
- Amount conversion to words

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