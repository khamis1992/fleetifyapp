import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VehicleContractHandoffPanel } from '../VehicleContractHandoffPanel';

const mocks = vi.hoisted(() => ({ query: {} as Record<string, unknown>, impact: {} as Record<string, unknown> }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => mocks.query }));
vi.mock('@/hooks/useContractRenewal', () => ({ useContractCancellationImpact: () => mocks.impact }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('../ContractCancellationImpactPanel', () => ({ ContractCancellationImpactPanel: () => null }));
const previous = { id: 'previous', contract_number: 'C-41', status: 'active', updated_at: '2026-09-06',
  start_date: '2026-01-01', end_date: '2026-12-31', legal_status: null };
const props = { companyId: 'company', vehicleId: 'vehicle', scope: 'vehicle:dates' };
describe('vehicle handoff consent', () => {
  beforeEach(() => {
    mocks.query = { data: [previous], isFetching: false, isPending: false, isError: false };
    mocks.impact = { data: { contractId: 'previous' }, isFetching: false, isError: false };
  });
  it('requires a reason and explicit consent, without issuing a cancellation', async () => {
    const onReview = vi.fn();
    render(<VehicleContractHandoffPanel {...props} onReview={onReview} />);
    expect(onReview).toHaveBeenLastCalledWith({ scope: props.scope, ready: false, consent: undefined });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'طلب العميل استبدال العقد' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(onReview).toHaveBeenLastCalledWith({ scope: props.scope, ready: true,
      consent: { contractId: 'previous', updatedAt: previous.updated_at, reason: 'طلب العميل استبدال العقد' } }));
  });
  it('invalidates approval if the predecessor changes', () => {
    const onReview = vi.fn();
    const view = render(<VehicleContractHandoffPanel {...props} onReview={onReview} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'تغيير العقد بطلب العميل' } });
    fireEvent.click(screen.getByRole('checkbox'));
    mocks.query = { ...mocks.query, data: [{ ...previous, updated_at: '2026-09-07' }] };
    view.rerender(<VehicleContractHandoffPanel {...props} onReview={onReview} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(onReview).toHaveBeenLastCalledWith({ scope: props.scope, ready: false, consent: undefined });
  });
  it('blocks legal contracts and offers a link to review them', () => {
    mocks.query = { ...mocks.query, data: [{ ...previous, status: 'under_legal_procedure' }] };
    const onReview = vi.fn();
    render(<VehicleContractHandoffPanel {...props} onReview={onReview} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('link', { name: 'C-41' })).toHaveAttribute('href', '/contracts/previous');
    expect(onReview).toHaveBeenLastCalledWith({ scope: props.scope, ready: false, consent: undefined });
  });
  it('blocks submission when the occupancy query fails', () => {
    mocks.query = { isError: true, data: undefined };
    const onReview = vi.fn();
    render(<VehicleContractHandoffPanel {...props} onReview={onReview} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر فحص ارتباط المركبة');
    expect(onReview).toHaveBeenLastCalledWith({ scope: props.scope, ready: false, consent: undefined });
  });
});
