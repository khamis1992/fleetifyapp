/**
 * Smoke tests for the redesigned Customer Details V3 building blocks.
 * They mount each section with minimal props to catch render-time
 * regressions (bad imports, module-scope t() usage, undefined access).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerHero } from '../customer-details-v3/CustomerHero';
import { CustomerActionBar } from '../customer-details-v3/CustomerActionBar';
import { CustomerPulse } from '../customer-details-v3/CustomerPulse';
import {
  buildCustomerSnapshotV3,
  buildProfileCompletionV3,
  getInitialCustomerTabV3,
  getRenewalOpportunitiesV3,
} from '../customer-details-v3/tokens';

const formatCurrency = (amount: number) => `${amount.toLocaleString()} ر.ق`;

const contracts = [
  {
    id: 'c-active',
    contract_number: 'CTR-100',
    status: 'active',
    end_date: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
    vehicle: { make: 'Toyota', model: 'Corolla', year: 2023 },
  },
  {
    id: 'c-cancelled',
    contract_number: 'CTR-099',
    status: 'cancelled',
    end_date: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    vehicle: { make: 'Nissan', model: 'Sunny', year: 2021 },
  },
];

const invoices = [
  { total_amount: 2500, paid_amount: 2500, balance_due: 0, status: 'paid' },
  { total_amount: 2000, paid_amount: 500, balance_due: 1500, status: 'open', due_date: '2026-01-01' },
  { total_amount: 900, paid_amount: 0, balance_due: 900, status: 'cancelled', due_date: '2026-01-01' },
];

const violations = [
  { status: 'pending', fine_amount: 300 },
  { status: 'paid', fine_amount: 150 },
];

const followups = [
  { scheduled_date: '2026-01-01' },
  { scheduled_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) },
];

const snapshot = buildCustomerSnapshotV3({
  contracts,
  invoices,
  trafficViolations: violations,
  scheduledFollowups: followups,
});

describe('customer details v3 tokens', () => {
  it('builds a financial snapshot from invoices and violations', () => {
    expect(snapshot.activeContracts).toBe(1);
    expect(snapshot.outstandingTotal).toBe(1500);
    expect(snapshot.dueNowTotal).toBe(1500);
    expect(snapshot.paidTotal).toBe(3000);
    expect(snapshot.unpaidViolationsCount).toBe(1);
    expect(snapshot.unpaidViolationsTotal).toBe(300);
    expect(snapshot.overdueFollowups).toBe(1);
    expect(snapshot.risk).toBe('danger');
  });

  it('detects renewal opportunities for active contracts ending soon only', () => {
    const opportunities = getRenewalOpportunitiesV3(contracts);
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0].contractId).toBe('c-active');
  });

  it('computes profile completion with actionable missing items', () => {
    const completion = buildProfileCompletionV3({ phone: '123', national_id: '456' }, 0);
    expect(completion.percent).toBe(40);
    expect(completion.missing.map((item) => item.label)).toContain('مستند واحد على الأقل');
  });

  it('maps legacy tab values to the new five worlds', () => {
    expect(getInitialCustomerTabV3('invoices')).toBe('financial');
    expect(getInitialCustomerTabV3('phones')).toBe('records');
    expect(getInitialCustomerTabV3(null)).toBe('overview');
    expect(getInitialCustomerTabV3('violations')).toBe('violations');
  });
});

describe('customer details v3 sections render', () => {
  it('renders the hero with identity, risk chip and stat tiles', () => {
    render(
      <MemoryRouter>
        <CustomerHero
          customer={{ phone: '5551234', national_id: '28901234567', customer_type: 'individual' }}
          customerName="عميل تجريبي"
          initials="ع ت"
          snapshot={snapshot}
          completion={buildProfileCompletionV3({ phone: '1', national_id: '2', email: '3' }, 1)}
          contractsCount={contracts.length}
          formatCurrency={formatCurrency}
          onBack={() => {}}
          onEdit={() => {}}
          onCall={() => {}}
          onWhatsApp={() => {}}
          onOpenContracts={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('عميل تجريبي')).toBeInTheDocument();
    expect(screen.getByText('متابعة عاجلة')).toBeInTheDocument();
    expect(screen.getByText('العقود النشطة')).toBeInTheDocument();
  });

  it('renders the action bar with the collect-due next move', () => {
    render(
      <MemoryRouter>
        <CustomerActionBar
          snapshot={snapshot}
          formatCurrency={formatCurrency}
          onAddPayment={() => {}}
          onCreateContract={() => {}}
          onUploadDocument={() => {}}
          onOpenCrm={() => {}}
          onOpenViolations={() => {}}
          onOpenFinancial={() => {}}
          onOpenContracts={() => {}}
          onRenewContract={() => {}}
          onEdit={() => {}}
          onPrint={() => {}}
          onShare={() => {}}
          onOpenLegal={() => {}}
          onOpenLegalData={() => {}}
          onDelete={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('تحصيل المتأخرات')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تسجيل دفعة' })).toBeInTheDocument();
  });

  it('renders the pulse rail with health, renewal and quick call log', () => {
    render(
      <CustomerPulse
        snapshot={snapshot}
        completion={buildProfileCompletionV3({ phone: '1' }, 0)}
        crmActivities={[
          {
            id: 'a1',
            customer_id: 'cu',
            note_type: 'phone',
            content: 'مكالمة متابعة مبدئية',
            is_important: false,
            created_at: new Date().toISOString(),
          },
        ]}
        crmStats={{ calls: 4, successfulCalls: 3, missedCalls: 1, messages: 2 }}
        quickCrmNote=""
        callStatus="answered"
        isSavingCall={false}
        onCrmNoteChange={() => {}}
        onCallStatusChange={() => {}}
        onSaveCall={() => {}}
        onEdit={() => {}}
        onUploadDocument={() => {}}
        onOpenCrm={() => {}}
        onRenewContract={() => {}}
      />,
    );

    expect(screen.getByText('صحة الملف')).toBeInTheDocument();
    expect(screen.getByText('فرص التجديد')).toBeInTheDocument();
    expect(screen.getByText('تسجيل مكالمة سريع')).toBeInTheDocument();
    expect(screen.getByText('مكالمة متابعة مبدئية')).toBeInTheDocument();
  });
});
