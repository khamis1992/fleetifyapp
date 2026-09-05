import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../store/reducer';
import { LegalOverview } from '../components/LegalOverview';

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
    render(<LegalOverview />);
    expect(screen.getByText('LTO-TEST')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('TEST-VIN')).toBeInTheDocument();
    expect(screen.queryByText('جاري تجهيز بيانات القضية')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('لم تكتمل مراجعة المطالبة المالية');
  });

  it('still shows loading when the contract itself has not arrived', () => {
    fixture.state.contract = null;
    render(<LegalOverview />);
    expect(screen.getByText('جاري تجهيز بيانات القضية')).toBeInTheDocument();
  });
});
