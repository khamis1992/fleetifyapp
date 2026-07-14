/**
 * ContractHeader Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContractHeader } from '../ContractHeader';
import type { Contract } from '@/types/contracts';

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr, options) => {
    const dateObj = new Date(date as string);
    if (formatStr === 'dd MMMM yyyy' || formatStr === 'dd MMMM yyyy HH:mm') {
      return dateObj.toLocaleDateString('ar-SA', options);
    }
    return dateObj.toString();
  }),
  differenceInDays: vi.fn(),
  ar: {},
}));

// Mock the router
vi.mock('react-router-dom', async () => {
  return {
    useNavigate: () => vi.fn(),
    useParams: () => ({ contractNumber: 'TEST-123' }),
  };
});

vi.mock('@/hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (amount: number) => `${amount} QAR`,
  }),
}));

describe('ContractHeader', () => {
  const mockContract: Contract = {
    id: 'test-contract-1',
    contract_number: 'TEST-123',
    customer_id: 'customer-1',
    vehicle_id: 'vehicle-1',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    monthly_amount: 100,
    contract_amount: 36500,
    total_paid: 500,
    balance_due: 36000,
    payment_status: 'partially_paid',
    status: 'active',
    description: 'Test contract description',
    company_id: 'company-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    customer: {
      id: 'customer-1',
      first_name_ar: 'أحمد',
      last_name_ar: 'محمد',
      phone: '+9665012345678',
    },
    vehicle: {
      id: 'vehicle-1',
      plate_number: 'ABC-1234',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      status: 'available',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders contract information correctly', () => {
    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('عقد رقم: TEST-123')).toBeInTheDocument();
    expect(screen.getByText('100 QAR')).toBeInTheDocument();
    expect(screen.getByText('36500 QAR')).toBeInTheDocument();
    expect(screen.getByText('مدفوع جزئيًا')).toBeInTheDocument();
  });

  it('displays customer information when available', () => {
    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    expect(screen.getByText('+9665012345678')).toBeInTheDocument();
    expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('ABC-1234')).toBeInTheDocument();
  });

  it('displays expiring soon badge when contract expires within 7 days', () => {
    // Mock the date to be 7 days before expiration
    vi.setSystemTime(new Date('2024-12-24'));

    const expiringSoonContract = {
      ...mockContract,
      end_date: '2024-12-30',
    };

    render(
      <ContractHeader
        contract={expiringSoonContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('ينتهي قريبًا')).toBeInTheDocument();
  });

  it('does not display expiring soon badge when contract expires in more than 7 days', () => {
    const expiringSoonContract = {
      ...mockContract,
      end_date: '2025-01-15',
    };

    render(
      <ContractHeader
        contract={expiringSoonContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.queryByText('ينتهي قريباً')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();

    render(
      <ContractHeader
        contract={mockContract}
        onEdit={onEdit}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const editButton = screen.getByText('تعديل');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onPrint when print button is clicked', async () => {
    const onPrint = vi.fn();

    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={onPrint}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const printButton = screen.getByText('طباعة');
    fireEvent.click(printButton);

    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it('calls onExport when export button is clicked', async () => {
    const onExport = vi.fn();

    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={onExport}
        onRefresh={vi.fn()}
      />
    );

    const exportButton = screen.getByText('تصدير');
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const onRefresh = vi.fn();

    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={onRefresh}
        isRefreshing={false}
      />
    );

    const refreshButton = screen.getByText('تحديث');
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when refreshing', () => {
    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={true}
      />
    );

    const refreshButton = screen.getByText('تحديث');
    expect(refreshButton).toBeDisabled();
  });

  it('displays description when provided', () => {
    const contractWithDescription = {
      ...mockContract,
      description: 'Important contract description',
    };

    render(
      <ContractHeader
        contract={contractWithDescription}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('الوصف')).toBeInTheDocument();
    expect(screen.getByText('Important contract description')).toBeInTheDocument();
  });

  it('does not display description section when no description is provided', () => {
    const contractWithoutDescription = {
      ...mockContract,
      description: null,
    };

    render(
      <ContractHeader
        contract={contractWithoutDescription}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.queryByText('الوصف')).not.toBeInTheDocument();
  });

  it('displays the partial payment status', () => {
    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('مدفوع جزئيًا')).toBeInTheDocument();
  });

  it('displays paid payment status', () => {
    const paidContract = {
      ...mockContract,
      payment_status: 'paid',
      total_paid: 36500,
      balance_due: 0,
    };

    render(
      <ContractHeader
        contract={paidContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('مدفوع')).toBeInTheDocument();
  });

  it('derives unpaid status when no explicit status exists', () => {
    const unpaidContract = {
      ...mockContract,
      payment_status: null,
      total_paid: 0,
      balance_due: 36500,
    };

    render(
      <ContractHeader
        contract={unpaidContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('غير مدفوع')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows loading spinner when refreshing', () => {
    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={true}
      />
    );

    // Check for spinning animation
    const refreshButton = screen.getByText('تحديث');
    const icon = refreshButton.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });
});
