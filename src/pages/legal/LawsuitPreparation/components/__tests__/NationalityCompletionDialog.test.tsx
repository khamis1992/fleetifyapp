import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NationalityCompletionDialog } from '../NationalityCompletionDialog';

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn(), onClose: vi.fn() }));
vi.mock('@/hooks/business/useCustomerOperations', () => ({ useCustomerOperations: () => ({ updateCustomer: { mutateAsync: mocks.mutateAsync } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-1' }) }));

const show = () => render(<NationalityCompletionDialog customerId="customer-1" customerName="عميل اختباري" nationality={null} onClose={mocks.onClose} />);

describe('nationality completion in the lawsuit page', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.mutateAsync.mockResolvedValue({ id: 'customer-1' }); });
  afterEach(cleanup);

  it('blocks blank and placeholder values without guessing from country of residence', () => {
    show();
    const input = screen.getByLabelText('الجنسية الصحيحة');
    const save = screen.getByRole('button', { name: 'حفظ الجنسية وتحديث الجاهزية' });
    expect(input).toHaveValue('');
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: 'غير محدد' } });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: 'unknown' } });
    expect(save).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('saves only nationality through the shared customer operation before closing', async () => {
    show();
    fireEvent.change(screen.getByLabelText('الجنسية الصحيحة'), { target: { value: ' مصري ' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الجنسية وتحديث الجاهزية' }));
    await waitFor(() => expect(mocks.onClose).toHaveBeenCalledOnce());
    expect(mocks.mutateAsync).toHaveBeenCalledExactlyOnceWith({ id: 'customer-1', nationality: 'مصري' });
    expect(mocks.mutateAsync.mock.invocationCallOrder[0]).toBeLessThan(mocks.onClose.mock.invocationCallOrder[0]);
  });

  it('keeps the form and entered value after a rejected update', async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error('لا تملك صلاحية للتعديل'));
    show();
    fireEvent.change(screen.getByLabelText('الجنسية الصحيحة'), { target: { value: 'مصري' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الجنسية وتحديث الجاهزية' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية للتعديل');
    expect(screen.getByLabelText('الجنسية الصحيحة')).toHaveValue('مصري');
    expect(mocks.onClose).not.toHaveBeenCalled();
  });
});
