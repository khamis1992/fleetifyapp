import { describe, expect, it } from 'vitest';
import {
  buildDepreciationBackfillDraft,
  buildFinancingObligationDraft,
  buildFinancingReclassDraft,
  buildVehicleCapitalizationDraft,
  computeDepreciationBackfillAmount,
  draftsAreBalanced,
  resolveBridgeAccounts,
  type BridgeAgreement,
  type BridgeVehicle,
  type FleetBridgeCandidates,
  type ResolvedBridgeAccounts,
} from '../buildFleetBridgeDrafts';

const accounts: ResolvedBridgeAccounts = {
  VEHICLES_ASSET: 'acc-vehicles',
  VEHICLE_INSTALLMENT_PAYABLE: 'acc-payable',
  VEHICLE_FINANCE_LONG_TERM: 'acc-longterm',
  ACCUMULATED_DEPRECIATION: 'acc-accumulated',
  OPENING_EQUITY: 'acc-equity',
  CASH: 'acc-cash',
};

const vehicle = (overrides: Partial<BridgeVehicle> = {}): BridgeVehicle => ({
  id: '11111111-1111-1111-1111-111111111111',
  plateNumber: '12345',
  make: 'Bestune',
  model: 'T77',
  year: 2024,
  isActive: true,
  status: 'available',
  purchaseCost: 80000,
  purchaseDate: '2025-01-15',
  registrationFees: 1500,
  depositAmount: 20000,
  loanAmount: 60000,
  financingType: 'bank',
  accumulatedDepreciationStored: 12000,
  depreciationPosted: 0,
  depreciationRate: 20,
  residualValue: null,
  salvageValue: 5000,
  monthsSincePurchase: 19,
  fixedAssetId: null,
  linkedAgreementId: null,
  linkedAgreementNumber: null,
  linkedAgreementStatus: null,
  linkedAllocatedAmount: null,
  linkedDownPayment: null,
  hasCapitalizationEntry: false,
  hasDepreciationEntry: false,
  hasAnyVehicleReference: false,
  ...overrides,
});

const agreement = (overrides: Partial<BridgeAgreement> = {}): BridgeAgreement => ({
  id: '22222222-2222-2222-2222-222222222222',
  agreementNumber: 'AGR-001',
  status: 'active',
  contractType: 'single_vehicle',
  vendorName: 'مورد بيستون',
  startDate: '2025-01-10',
  endDate: '2028-01-10',
  totalAmount: 80000,
  downPayment: 20000,
  financedPrincipal: 60000,
  principalPaid: 15000,
  principalRemaining: 45000,
  longTermPortion: 30000,
  reclassReferenceId: '33333333-3333-3333-3333-333333333333',
  hasObligationEntry: false,
  hasReclassEntry: false,
  vehicles: [{ id: '11111111-1111-1111-1111-111111111111', plateNumber: '12345', make: 'Bestune', allocatedAmount: 60000 }],
  ...overrides,
});

describe('buildVehicleCapitalizationDraft', () => {
  it('builds a balanced entry: vehicles debit, cash + equity credit', () => {
    const draft = buildVehicleCapitalizationDraft(vehicle(), accounts);
    expect(draft).not.toBeNull();
    const lines = draft!.lines;
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ accountId: 'acc-vehicles', debit_amount: 80000, credit_amount: 0 });
    expect(lines[1]).toMatchObject({ accountId: 'acc-cash', debit_amount: 0, credit_amount: 20000 });
    expect(lines[2]).toMatchObject({ accountId: 'acc-equity', debit_amount: 0, credit_amount: 60000 });
    expect(draftsAreBalanced([draft!])).toBe(true);
    expect(draft).toMatchObject({ referenceType: 'vehicle_capitalization', referenceId: vehicle().id, entryDate: '2025-01-15' });
  });

  it('adds registration fees to the debit side when requested', () => {
    const draft = buildVehicleCapitalizationDraft(vehicle(), accounts, { includeRegistrationFees: true });
    expect(draft!.lines[0].debit_amount).toBe(81500);
    expect(draftsAreBalanced([draft!])).toBe(true);
  });

  it('caps the cash portion at the total and drops a zero cash line', () => {
    const draft = buildVehicleCapitalizationDraft(vehicle(), accounts, { cashPortion: 999999 });
    expect(draft!.lines).toHaveLength(2);
    expect(draft!.lines[1]).toMatchObject({ accountId: 'acc-cash', credit_amount: 80000 });
    expect(draftsAreBalanced([draft!])).toBe(true);
  });

  it('returns null when required accounts are missing', () => {
    expect(buildVehicleCapitalizationDraft(vehicle(), { OPENING_EQUITY: 'acc-equity' })).toBeNull();
    expect(buildVehicleCapitalizationDraft(vehicle(), { VEHICLES_ASSET: 'acc-vehicles' })).toBeNull();
    expect(
      buildVehicleCapitalizationDraft(vehicle(), { VEHICLES_ASSET: 'acc-vehicles', OPENING_EQUITY: 'acc-equity' }, { cashPortion: 0 }),
    ).not.toBeNull();
  });

  it('uses the linked agreement down payment when the vehicle has no deposit', () => {
    const draft = buildVehicleCapitalizationDraft(
      vehicle({ depositAmount: 0, linkedDownPayment: 25000 }),
      accounts,
    );
    const cashLine = draft!.lines.find(line => line.accountId === 'acc-cash');
    expect(cashLine?.credit_amount).toBe(25000);
  });
});

describe('buildFinancingObligationDraft', () => {
  it('credits the original financed principal against opening equity', () => {
    const draft = buildFinancingObligationDraft(agreement(), accounts, '2026-08-31');
    expect(draft).not.toBeNull();
    expect(draft!.lines).toHaveLength(2);
    expect(draft!.lines[0]).toMatchObject({ accountId: 'acc-equity', debit_amount: 60000 });
    expect(draft!.lines[1]).toMatchObject({ accountId: 'acc-payable', credit_amount: 60000 });
    expect(draftsAreBalanced([draft!])).toBe(true);
    expect(draft).toMatchObject({ referenceType: 'vehicle_financing_obligation', entryDate: '2025-01-10' });
  });

  it('falls back to total minus down payment when the schedule principal is zero', () => {
    const draft = buildFinancingObligationDraft(
      agreement({ financedPrincipal: 0, totalAmount: 90000, downPayment: 10000 }),
      accounts,
      '2026-08-31',
    );
    expect(draft!.lines[1].credit_amount).toBe(80000);
  });

  it('uses the fallback date when the agreement has no start date', () => {
    const draft = buildFinancingObligationDraft(agreement({ startDate: null }), accounts, '2026-08-31');
    expect(draft!.entryDate).toBe('2026-08-31');
  });
});

describe('buildFinancingReclassDraft', () => {
  it('moves only the long-term portion, capped by the remaining principal', () => {
    const draft = buildFinancingReclassDraft(agreement(), accounts, '2026-08-31');
    expect(draft).not.toBeNull();
    expect(draft!.lines[0]).toMatchObject({ accountId: 'acc-payable', debit_amount: 30000 });
    expect(draft!.lines[1]).toMatchObject({ accountId: 'acc-longterm', credit_amount: 30000 });
    expect(draft).toMatchObject({ referenceType: 'vehicle_financing_reclass', referenceId: agreement().reclassReferenceId, entryDate: '2026-08-31' });
  });

  it('caps the reclass at the remaining principal', () => {
    const draft = buildFinancingReclassDraft(
      agreement({ longTermPortion: 50000, principalRemaining: 40000 }),
      accounts,
      '2026-08-31',
    );
    expect(draft!.lines[0].debit_amount).toBe(40000);
  });

  it('returns null when there is no long-term slice', () => {
    expect(buildFinancingReclassDraft(agreement({ longTermPortion: 0 }), accounts, '2026-08-31')).toBeNull();
  });
});

describe('computeDepreciationBackfillAmount', () => {
  it('uses stored accumulated minus already-posted depreciation', () => {
    expect(computeDepreciationBackfillAmount(vehicle({ depreciationPosted: 4000 }))).toBe(8000);
  });

  it('never exceeds the depreciable base (cost minus salvage)', () => {
    expect(computeDepreciationBackfillAmount(vehicle({ accumulatedDepreciationStored: 999999 }))).toBe(75000);
  });

  it('falls back to a straight-line estimate from the rate when nothing is stored', () => {
    // base = 75000, rate 20%, 19 months → 75000 * 0.2 * 19/12 = 23750
    expect(computeDepreciationBackfillAmount(vehicle({ accumulatedDepreciationStored: 0 }))).toBe(23750);
  });

  it('returns zero when the base is fully consumed', () => {
    expect(computeDepreciationBackfillAmount(vehicle({ salvageValue: 80000 }))).toBe(0);
  });
});

describe('buildDepreciationBackfillDraft', () => {
  it('balances opening equity against accumulated depreciation at the report date', () => {
    const draft = buildDepreciationBackfillDraft(vehicle(), accounts, '2026-08-31');
    expect(draft).not.toBeNull();
    expect(draft!.lines[0]).toMatchObject({ accountId: 'acc-equity', debit_amount: 12000 });
    expect(draft!.lines[1]).toMatchObject({ accountId: 'acc-accumulated', credit_amount: 12000 });
    expect(draft).toMatchObject({ referenceType: 'vehicle_depreciation_backfill', entryDate: '2026-08-31' });
  });

  it('returns null when nothing is left to backfill', () => {
    expect(buildDepreciationBackfillDraft(vehicle({ accumulatedDepreciationStored: 0, depreciationRate: null }), accounts, '2026-08-31')).toBeNull();
  });
});

describe('resolveBridgeAccounts', () => {
  it('merges server-resolved roles with reviewer overrides', () => {
    const candidates: FleetBridgeCandidates = {
      asOf: '2026-08-31',
      earliestEntryDate: null,
      vehicles: [],
      vehiclesMissingData: 0,
      agreements: [],
      accounts: {
        roles: {
          VEHICLES_ASSET: { id: 'server-vehicles', code: '1410', name: 'Vehicles', nameAr: 'المركبات', subtype: 'non_current_asset' },
          OPENING_EQUITY: { id: 'server-equity', code: '3100', name: 'Equity', nameAr: 'حقوق', subtype: null },
        },
        suggestions: {},
      },
    };
    const resolved = resolveBridgeAccounts(candidates, { OPENING_EQUITY: 'override-equity', VEHICLE_FINANCE_LONG_TERM: 'override-longterm' });
    expect(resolved.VEHICLES_ASSET).toBe('server-vehicles');
    expect(resolved.OPENING_EQUITY).toBe('override-equity');
    expect(resolved.VEHICLE_FINANCE_LONG_TERM).toBe('override-longterm');
    expect(resolved.ACCUMULATED_DEPRECIATION).toBeUndefined();
  });
});
