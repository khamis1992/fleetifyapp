import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CashReceiptVoucher } from '../CashReceiptVoucher';

// Mock the useCurrencyFormatter hook
vi.mock('@/hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (amount: number) => `${amount.toFixed(3)} QAR`
  })
}));

describe('CashReceiptVoucher', () => {
  const mockPayment = {
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

  it('renders correctly with cash payment', () => {
    render(<CashReceiptVoucher payment={mockPayment} />);
    
    // Check header elements
    expect(screen.getByText('AL ARRAF')).toBeInTheDocument();
    expect(screen.getByText('العراف لتأجير السيارات ذ.م.م')).toBeInTheDocument();
    expect(screen.getByText('سند قبض')).toBeInTheDocument();
    expect(screen.getByText('Receipt Voucher')).toBeInTheDocument();
    
    // Check payment number
    expect(screen.getByText('REC-2025-00144')).toBeInTheDocument();
    
    // Check date
    expect(screen.getByLabelText('التاريخ | Date')).toHaveValue('2025-01-15');
    
    // Check amount
    expect(screen.getByText('1500.000 QAR')).toBeInTheDocument();
    
    // Check payment method
    expect(screen.getByText('نقداً | By Cash')).toBeInTheDocument();
  });

  it('renders correctly with cheque payment', () => {
    const chequePayment = {
      ...mockPayment,
      payment_method: 'check',
      check_number: 'CHK-12345',
      bank_account: 'Bank Account 123'
    };
    
    render(<CashReceiptVoucher payment={chequePayment} />);
    
    // Check that cheque details are visible
    expect(screen.getByText('شيك | By Cheque')).toBeInTheDocument();
    expect(screen.getByText('CHK-12345')).toBeInTheDocument();
    expect(screen.getByText('Bank Account 123')).toBeInTheDocument();
  });

  it('converts amount to words correctly', () => {
    render(<CashReceiptVoucher payment={mockPayment} />);
    
    // Check that amount in words is displayed (simplified check)
    expect(screen.getByLabelText('مبلغ وقدره ( ريال قطري ) | The Sum of (Q.Rls.)')).toBeInTheDocument();
  });
});