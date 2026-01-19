import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProfessionalInvoiceTemplate } from '../ProfessionalInvoiceTemplate';

// Mock the useCurrencyFormatter hook
vi.mock('@/hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (amount: number) => `${amount.toFixed(3)} KWD`
  })
}));

// Mock the useCompanyCurrency hook
vi.mock('@/hooks/useCompanyCurrency', () => ({
  useCompanyCurrency: () => ({
    currency: 'KWD'
  })
}));

describe('ProfessionalInvoiceTemplate', () => {
  const mockInvoice = {
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

  it('renders correctly with invoice data', () => {
    render(<ProfessionalInvoiceTemplate invoice={mockInvoice} />);
    
    // Check header elements
    expect(screen.getByText('فاتورة مبيعات')).toBeInTheDocument();
    expect(screen.getByText('رقم الفاتورة: INV-2025-001')).toBeInTheDocument();
    expect(screen.getByText('مدفوعة')).toBeInTheDocument();
    
    // Check invoice details
    expect(screen.getByText('15/01/2025')).toBeInTheDocument();
    expect(screen.getByText('15/02/2025')).toBeInTheDocument();
    
    // Check customer info
    expect(screen.getByText('شركة النور التجارية')).toBeInTheDocument();
    
    // Check items
    expect(screen.getByText('خدمة استشارية شهرية')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check totals
    expect(screen.getByText('300.000 KWD')).toBeInTheDocument();
    expect(screen.getByText('315.000 KWD')).toBeInTheDocument();
  });

  it('renders status badges with correct colors', () => {
    const { rerender } = render(<ProfessionalInvoiceTemplate invoice={mockInvoice} />);
    
    // Check paid status
    let badge = screen.getByText('مدفوعة');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    
    // Check pending status
    const pendingInvoice = { ...mockInvoice, status: 'pending' };
    rerender(<ProfessionalInvoiceTemplate invoice={pendingInvoice} />);
    badge = screen.getByText('معلقة');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    
    // Check overdue status
    const overdueInvoice = { ...mockInvoice, status: 'overdue' };
    rerender(<ProfessionalInvoiceTemplate invoice={overdueInvoice} />);
    badge = screen.getByText('متأخرة');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('renders terms and notes when provided', () => {
    render(<ProfessionalInvoiceTemplate invoice={mockInvoice} />);
    
    expect(screen.getByText('الدفع خلال 30 يوماً من تاريخ الفاتورة')).toBeInTheDocument();
    expect(screen.getByText('شكراً لثقتكم في خدماتنا')).toBeInTheDocument();
  });

  it('handles missing invoice data gracefully', () => {
    render(<ProfessionalInvoiceTemplate invoice={null} />);
    expect(screen.queryByText('فاتورة')).not.toBeInTheDocument();
  });
});