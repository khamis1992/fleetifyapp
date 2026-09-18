import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../store/reducer';
import { LegalOverview } from '../components/LegalOverview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fixedCompensationRegister } from '@/utils/__tests__/fixtures/fixedCompensation';

const renderOverview = () => render(<QueryClientProvider client={new QueryClient()}><LegalOverview /></QueryClientProvider>);

const fixture = vi.hoisted(() => ({ state: {} as ReturnType<typeof createInitialState> }));
vi.mock('../store', () => ({ useLawsuitPreparationContext: () => fixture }));

describe('LegalOverview contract data', () => {
  beforeEach(() => {
    fixture.state = {
      ...createInitialState('contract-1'),
      contract: { id: 'contract-1', contract_number: 'LTO-TEST', monthly_amount: 1500, start_date: '2024-08-15', end_date: '2027-08-15' } as typeof fixture.state.contract,
      customer: { first_name: 'Test', last_name: 'Customer', national_id: '123', phone: '555' } as typeof fixture.state.customer,
      vehicle: { make: 'Toyota', model: 'Corolla', year: 2024, plate_number: '8209', vin: 'TEST-VIN' } as typeof fixture.state.vehicle,
    };
  });

  it('shows the contract, customer and vehicle while financial calculations are unavailable', () => {
    renderOverview();
    expect(screen.getByText('LTO-TEST')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('TEST-VIN')).toBeInTheDocument();
    expect(screen.queryByText('جاري تجهيز بيانات القضية')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('لم تكتمل مراجعة المطالبة المالية');
  });

  it('still shows loading when the contract itself has not arrived', () => {
    fixture.state.contract = null;
    renderOverview();
    expect(screen.getByText('جاري تجهيز بيانات القضية')).toBeInTheDocument();
  });

  it('shows fixed compensation separately without including it twice in the damage tiles', () => {
    fixture.state.financialClaimSource.claimRegister = fixedCompensationRegister(40800, 24900);
    fixture.state.calculations = { overdueRent: 40800, damagesFee: 10000, total: 75700, violationsFines: 24900 } as typeof fixture.state.calculations;
    renderOverview();
    const fixedTile = screen.getAllByText('تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع')[0].parentElement!;
    expect(fixedTile.textContent).toContain('١٠٬٠٠٠٫٠٠');
    expect(screen.getByText('أضرار ومصاريف وطلبات إضافية').parentElement?.textContent).toContain('٠٫٠٠');
    expect(screen.getByText('الإجمالي').parentElement?.textContent).toContain('٧٥٬٧٠٠٫٠٠');
    expect(screen.getByText('مبلغ ثابت')).toBeInTheDocument();
  });
});
