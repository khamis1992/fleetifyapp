import { describe, expect, it } from 'vitest';

import { calculatePropertyReports } from '../usePropertyReports';

type PropertyReportSource = Parameters<typeof calculatePropertyReports>[0];

const today = new Date();
const todayIso = today.toISOString().slice(0, 10);
const currentMonthDate = `${todayIso.slice(0, 7)}-01`;

const createSource = (): PropertyReportSource =>
  ({
    properties: [
      {
        id: 'property-1',
        company_id: 'company-1',
        property_name: 'Property 1',
        property_name_ar: 'العقار الأول',
        property_type: 'apartment',
        property_status: 'occupied',
        property_code: 'P-1',
        is_active: true,
        owner_id: 'owner-1',
        sale_price: 100_000,
      },
      {
        id: 'property-2',
        company_id: 'company-1',
        property_name: 'Property 2',
        property_type: 'villa',
        property_status: 'available',
        property_code: 'P-2',
        is_active: true,
        sale_price: 200_000,
      },
    ],
    contracts: [
      {
        id: 'contract-1',
        company_id: 'company-1',
        contract_number: 'PC-1',
        contract_type: 'rental',
        property_id: 'property-1',
        start_date: '2026-01-01',
        status: 'active',
        is_active: true,
        rental_amount: 1_000,
        commission_amount: 50,
        tenant_id: 'tenant-1',
      },
      {
        id: 'contract-2',
        company_id: 'company-1',
        contract_number: 'PC-2',
        contract_type: 'rental',
        property_id: 'property-1',
        start_date: '2026-02-01',
        status: 'active',
        is_active: true,
        rental_amount: 1_000,
        commission_amount: 0,
      },
    ],
    payments: [
      {
        id: 'payment-1',
        company_id: 'company-1',
        property_contract_id: 'contract-1',
        payment_number: 'PP-1',
        payment_type: 'rent',
        due_date: currentMonthDate,
        payment_date: todayIso,
        amount: 1_000,
        total_amount: 1_000,
        status: 'paid',
      },
      {
        id: 'payment-2',
        company_id: 'company-1',
        property_contract_id: 'contract-1',
        payment_number: 'PP-2',
        payment_type: 'rent',
        due_date: '2026-01-01',
        payment_date: null,
        amount: 500,
        total_amount: 500,
        status: 'pending',
      },
    ],
    owners: [
      {
        id: 'owner-1',
        company_id: 'company-1',
        owner_code: 'O-1',
        full_name: 'Owner One',
        full_name_ar: 'المالك الأول',
      },
    ],
    maintenance: [
      {
        id: 'maintenance-1',
        company_id: 'company-1',
        property_id: 'property-1',
        maintenance_number: 'M-1',
        maintenance_type: 'repair',
        title: 'Repair',
        priority: 'normal',
        status: 'completed',
        requested_date: '2026-01-02',
        completion_date: '2026-01-04',
        actual_cost: 100,
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-04T00:00:00Z',
      },
    ],
    tenants: [
      {
        id: 'tenant-1',
        company_id: 'company-1',
        customer_type: 'individual',
        first_name: 'Tenant',
        last_name: 'One',
        phone: '12345678',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
  }) as unknown as PropertyReportSource;

describe('calculatePropertyReports', () => {
  it('counts only paid payments as revenue and keeps pending dues overdue', () => {
    const report = calculatePropertyReports(createSource());

    expect(report.financial.totalRevenue).toBe(1_000);
    expect(report.financial.monthlyRevenue).toBe(1_000);
    expect(report.financial.overduePyments).toBe(500);
    expect(report.financial.collectionRate).toBeCloseTo(66.67, 1);
  });

  it('deducts recorded maintenance and commissions without estimated expenses', () => {
    const report = calculatePropertyReports(createSource());

    expect(report.financial.totalProfit).toBe(850);
    expect(report.portfolio.totalExpenses).toBe(150);
    expect(report.portfolio.totalValue).toBe(300_000);
  });

  it('counts occupied properties once even when they have multiple active contracts', () => {
    const report = calculatePropertyReports(createSource());

    expect(report.financial.totalProperties).toBe(2);
    expect(report.financial.occupiedProperties).toBe(1);
    expect(report.financial.vacantProperties).toBe(1);
    expect(report.financial.occupancyRate).toBe(50);
  });
});
