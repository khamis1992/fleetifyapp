/**
 * ContractHeader Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('ContractHeader', () => {
  const mockContract: Contract = {
    id: 'test-contract-1',
    contract_number: 'TEST-123',
    customer_id: 'customer-1',
    vehicle_id: 'vehicle-1',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    daily_rate: 100,
    total_amount: 36500,
    status: 'active',
    payment_method: 'cash',
    notes: 'Test contract notes',
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
    expect(screen.getByDisplayValue('100 ريال')).toBeInTheDocument();
    expect(screen.getByDisplayValue('36,500 ريال')).toBeInTheDocument();
    expect(screen.getByText('نقدي')).toBeInTheDocument();
    expect(screen.getByText('نقدي')).toBeInTheDocument();
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

    expect(screen.getByText('ينتهي قريباً')).toBeInTheDocument();
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
        onExport={fn()}
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

  it('displays notes when provided', () => {
    const contractWithNotes = {
      ...mockContract,
      notes: 'Important contract notes',
    };

    render(
      <ContractHeader
        contract={contractWithNotes}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('ملاحظات')).toBeInTheDocument();
    expect(screen.getByText('Important contract notes')).toBeInTheDocument();
  });

  it('does not display notes section when no notes provided', () => {
    const contractWithoutNotes = {
      ...mockContract,
      notes: null,
    };

    render(
      <ContractHeader
        contract={contractWithoutNotes}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.queryByText('ملاحظات')).not.toBeInTheDocument();
  });

  it('displays correct payment method badge', () => {
    render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('نقدي')).toBeInTheDocument();
  });

  it('displays card payment method', () => {
    const contractWithCard = {
      ...mockContract,
      payment_method: 'card',
    };

    render(
      <ContractHeader
        contract={contractWithCard}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('بطاقة')).toBeInTheDocument();
  });

  it('displays transfer payment method', () => {
    const contractWithTransfer = {
      ...mockContract,
      payment_method: 'transfer',
    };

    render(
      <ContractHeader
        contract={contractWithTransfer}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('تحويل بنكي')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ContractHeader
        contract={mockContract}
        onEdit={vi.fn()}
        onPrint={vi.fn()}
        onExport={fn()}
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
        onExport={fn()}
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