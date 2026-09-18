import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { TimelineView } from '../TimelineView';
import type { Contract } from '@/types/contracts';

afterEach(cleanup);
describe('contract timeline presentation', () => {
  it('does not present an aggregate cache update as a payment event', () => {
    render(<TimelineView contract={{ contract_number:'TEST', start_date:'2026-01-01', end_date:'2026-12-31', updated_at:'2026-09-06' } as Contract}
      paidTotal={500} remainingTotal={1000} trafficViolationsCount={11} formatCurrency={amount=>`QAR ${amount}`} />);
    expect(screen.getByText('QAR 500')).toBeInTheDocument();
    const timeline = screen.getByRole('region', {name:'الجدول الزمني للعقد'});
    expect(within(timeline).queryByText('التحصيل المالي')).not.toBeInTheDocument();
    expect(within(timeline).getAllByRole('article')).toHaveLength(2);
  });
  it('omits malformed historical dates without crashing the record view', () => {
    render(<TimelineView contract={{contract_number:'TEST',start_date:'invalid',end_date:'invalid'} as Contract} formatCurrency={String} />);
    expect(screen.getByText('لا توجد أحداث في الجدول الزمني')).toBeInTheDocument();
  });
});
