/**
 * Fleet→ledger bridge draft builders — pure functions, unit-tested.
 *
 * Every bridge entry is a real balanced journal draft posted through
 * create_manual_journal_entry_v1; the balance sheet keeps reading the ledger only.
 *
 * Entry taxonomy (reference types):
 *  - vehicle_capitalization          VCAP  DR vehicles asset / CR cash + opening equity
 *  - vehicle_financing_obligation     VFIN  DR opening equity / CR installment payable (original principal)
 *  - vehicle_financing_reclass       VRC   DR installment payable / CR long-term payable (due > 12 months)
 *  - vehicle_depreciation_backfill   VDEP  DR opening equity / CR accumulated depreciation
 */

export type FleetBridgeRole =
  | 'VEHICLES_ASSET'
  | 'VEHICLE_INSTALLMENT_PAYABLE'
  | 'VEHICLE_FINANCE_LONG_TERM'
  | 'ACCUMULATED_DEPRECIATION'
  | 'OPENING_EQUITY';

export const FLEET_BRIDGE_ROLES: FleetBridgeRole[] = [
  'VEHICLES_ASSET',
  'VEHICLE_INSTALLMENT_PAYABLE',
  'VEHICLE_FINANCE_LONG_TERM',
  'ACCUMULATED_DEPRECIATION',
  'OPENING_EQUITY',
];

/** Roles the bridge must also verify are classified for balance-sheet presentation. */
export const ROLE_SUGGESTED_SUBTYPES: Record<FleetBridgeRole, string> = {
  VEHICLES_ASSET: 'non_current_asset',
  VEHICLE_INSTALLMENT_PAYABLE: 'current_liability',
  VEHICLE_FINANCE_LONG_TERM: 'non_current_liability',
  ACCUMULATED_DEPRECIATION: 'contra_non_current_asset',
  OPENING_EQUITY: 'other_equity',
};

export interface BridgeVehicle {
  id: string;
  plateNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  isActive: boolean;
  status: string | null;
  purchaseCost: number;
  purchaseDate: string;
  registrationFees: number;
  depositAmount: number;
  loanAmount: number;
  financingType: string | null;
  accumulatedDepreciationStored: number;
  depreciationPosted: number;
  depreciationRate: number | null;
  residualValue: number | null;
  salvageValue: number | null;
  monthsSincePurchase: number | null;
  fixedAssetId: string | null;
  linkedAgreementId: string | null;
  linkedAgreementNumber: string | null;
  linkedAgreementStatus: string | null;
  linkedAllocatedAmount: number | null;
  linkedDownPayment: number | null;
  hasCapitalizationEntry: boolean;
  hasDepreciationEntry: boolean;
  hasAnyVehicleReference: boolean;
}

export interface BridgeAgreementVehicle {
  id: string;
  plateNumber: string | null;
  make: string | null;
  allocatedAmount: number;
}

export interface BridgeAgreement {
  id: string;
  agreementNumber: string | null;
  status: string | null;
  contractType: string | null;
  vendorName: string | null;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number;
  downPayment: number;
  financedPrincipal: number;
  principalPaid: number;
  principalRemaining: number;
  longTermPortion: number;
  reclassReferenceId: string;
  hasObligationEntry: boolean;
  hasReclassEntry: boolean;
  vehicles: BridgeAgreementVehicle[];
}

export interface BridgeAccount {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  subtype: string | null;
}

export type FleetBridgeRoleAccount = Partial<Record<FleetBridgeRole, BridgeAccount>>;

export interface FleetBridgeCandidates {
  asOf: string;
  earliestEntryDate: string | null;
  vehicles: BridgeVehicle[];
  vehiclesMissingData: number;
  agreements: BridgeAgreement[];
  accounts: {
    roles: FleetBridgeRoleAccount;
    suggestions: Partial<Record<FleetBridgeRole, BridgeAccount[]>>;
  };
}

export interface BridgeLineDraft {
  accountId: string;
  line_description: string;
  debit_amount: number;
  credit_amount: number;
  asset_id?: string | null;
}

export interface BridgeEntryDraft {
  key: string;
  referenceType: string;
  referenceId: string;
  entryNumberPrefix: string;
  entryDate: string;
  description: string;
  lines: BridgeLineDraft[];
}

export type ResolvedBridgeAccounts = Partial<Record<FleetBridgeRole | 'CASH' | 'BANK', string>>;

export const round2 = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;
export const isZero = (value: number): boolean => Math.abs(value) < 0.005;

export const vehicleLabel = (vehicle: BridgeVehicle): string =>
  [vehicle.make, vehicle.model, vehicle.plateNumber].filter(Boolean).join(' ') || vehicle.id.slice(0, 8);

/** Merge server-resolved role mappings with reviewer overrides; returns account ids per role. */
export function resolveBridgeAccounts(
  candidates: FleetBridgeCandidates,
  overrides: Partial<Record<FleetBridgeRole | 'CASH' | 'BANK', string>>,
): ResolvedBridgeAccounts {
  const resolved: ResolvedBridgeAccounts = {};
  for (const role of FLEET_BRIDGE_ROLES) {
    const account = candidates.accounts.roles[role];
    resolved[role] = account?.id ?? undefined;
  }
  for (const [role, accountId] of Object.entries(overrides)) {
    if (accountId) resolved[role as FleetBridgeRole] = accountId;
  }
  return resolved;
}

export interface CapitalizationOptions {
  /** Include vehicles.registration_fees in the debit side. Default false. */
  includeRegistrationFees?: boolean;
  /** Cash down-payment credited to the cash account; the rest balances to opening equity. Default: deposit or linked down payment. */
  cashPortion?: number;
}

/**
 * VCAP — vehicle capitalization at the purchase date:
 * DR vehicles asset (purchase cost ± registration fees)
 * CR cash/bank (down payment actually paid in cash)
 * CR opening equity (residual plug — washed out by the financing obligation entry)
 */
export function buildVehicleCapitalizationDraft(
  vehicle: BridgeVehicle,
  accounts: ResolvedBridgeAccounts,
  options: CapitalizationOptions = {},
): BridgeEntryDraft | null {
  const vehiclesAccount = accounts.VEHICLES_ASSET;
  const cashAccount = accounts.CASH || accounts.BANK;
  const equityAccount = accounts.OPENING_EQUITY;
  if (!vehiclesAccount || !equityAccount) return null;

  const total = round2(
    vehicle.purchaseCost + (options.includeRegistrationFees ? vehicle.registrationFees : 0),
  );
  if (total <= 0) return null;

  const defaultCash = round2(
    Math.max(vehicle.depositAmount, vehicle.linkedDownPayment && vehicle.linkedDownPayment > 0
      ? Math.min(vehicle.linkedDownPayment, total) : 0, 0),
  );
  const cash = round2(Math.max(0, Math.min(options.cashPortion ?? defaultCash, total)));
  const equity = round2(total - cash);

  const lines: BridgeLineDraft[] = [
    {
      accountId: vehiclesAccount,
      line_description: `رسملة مركبة — ${vehicleLabel(vehicle)}`,
      debit_amount: total,
      credit_amount: 0,
      asset_id: vehicle.fixedAssetId ?? null,
    },
  ];
  if (!isZero(cash)) {
    if (!cashAccount) return null;
    lines.push({
      accountId: cashAccount,
      line_description: `الجزء النقدي من شراء ${vehicleLabel(vehicle)}`,
      debit_amount: 0,
      credit_amount: cash,
    });
  }
  if (!isZero(equity)) {
    lines.push({
      accountId: equityAccount,
      line_description: `فارق رسملة عبر حقوق بدء الدفتر — ${vehicleLabel(vehicle)}`,
      debit_amount: 0,
      credit_amount: equity,
    });
  }

  return {
    key: `vcap:${vehicle.id}`,
    referenceType: 'vehicle_capitalization',
    referenceId: vehicle.id,
    entryNumberPrefix: `VCAP-${vehicle.purchaseDate.replace(/-/g, '')}`,
    entryDate: vehicle.purchaseDate,
    description: `رسملة مركبة ${vehicleLabel(vehicle)} — تكلفة الشراء بتاريخ الشراء`,
    lines,
  };
}

/**
 * VFIN — financing obligation at the agreement date, for the ORIGINAL financed
 * principal: the installment payments already debit the payable account, so
 * crediting the original principal lands the payable at exactly the remaining
 * balance. Short/long presentation is handled by the reclass entry.
 */
export function buildFinancingObligationDraft(
  agreement: BridgeAgreement,
  accounts: ResolvedBridgeAccounts,
  fallbackDate: string,
): BridgeEntryDraft | null {
  const payableAccount = accounts.VEHICLE_INSTALLMENT_PAYABLE;
  const equityAccount = accounts.OPENING_EQUITY;
  if (!payableAccount || !equityAccount) return null;

  const amount = round2(
    Math.max(agreement.financedPrincipal, agreement.totalAmount - agreement.downPayment, 0),
  );
  if (amount <= 0) return null;

  return {
    key: `vfin:${agreement.id}`,
    referenceType: 'vehicle_financing_obligation',
    referenceId: agreement.id,
    entryNumberPrefix: `VFIN-${(agreement.startDate || fallbackDate).replace(/-/g, '')}`,
    entryDate: agreement.startDate || fallbackDate,
    description: `التزام تمويل مركبات — اتفاقية ${agreement.agreementNumber || agreement.id.slice(0, 8)} — أصل التمويل`,
    lines: [
      {
        accountId: equityAccount,
        line_description: `إثبات التزام تمويل — اتفاقية ${agreement.agreementNumber || ''}`.trim(),
        debit_amount: amount,
        credit_amount: 0,
      },
      {
        accountId: payableAccount,
        line_description: `التزام أقساط المركبات (الأصل) — اتفاقية ${agreement.agreementNumber || ''}`.trim(),
        debit_amount: 0,
        credit_amount: amount,
      },
    ],
  };
}

/**
 * VRC — presentation reclass at the reporting date: moves the unpaid principal
 * due beyond twelve months out of the (current) installment payable account.
 * The reference id is deterministic per (agreement, date), so rerunning per
 * reporting date stays idempotent.
 */
export function buildFinancingReclassDraft(
  agreement: BridgeAgreement,
  accounts: ResolvedBridgeAccounts,
  asOf: string,
): BridgeEntryDraft | null {
  const payableAccount = accounts.VEHICLE_INSTALLMENT_PAYABLE;
  const longTermAccount = accounts.VEHICLE_FINANCE_LONG_TERM;
  if (!payableAccount || !longTermAccount) return null;

  const amount = round2(Math.min(agreement.longTermPortion, agreement.principalRemaining));
  if (amount <= 0) return null;

  return {
    key: `vrc:${agreement.id}:${asOf}`,
    referenceType: 'vehicle_financing_reclass',
    referenceId: agreement.reclassReferenceId,
    entryNumberPrefix: `VRC-${asOf.replace(/-/g, '')}`,
    entryDate: asOf,
    description: `إعادة تصنيف التزام تمويل إلى طويل الأجل — اتفاقية ${agreement.agreementNumber || agreement.id.slice(0, 8)} — ما يستحق بعد ١٢ شهراً`,
    lines: [
      {
        accountId: payableAccount,
        line_description: `تحويل الشريحة طويلة الأجل — اتفاقية ${agreement.agreementNumber || ''}`.trim(),
        debit_amount: amount,
        credit_amount: 0,
      },
      {
        accountId: longTermAccount,
        line_description: `التزامات تمويل مركبات طويلة الأجل — اتفاقية ${agreement.agreementNumber || ''}`.trim(),
        debit_amount: 0,
        credit_amount: amount,
      },
    ],
  };
}

/**
 * VDEP depreciation amount for the backfill: the stored accumulated depreciation
 * minus whatever the monthly engine already posted (via fixed-asset depreciation
 * records), falling back to a straight-line estimate from the rate, always capped
 * at the depreciable base (cost − salvage/residual).
 */
export function computeDepreciationBackfillAmount(vehicle: BridgeVehicle): number {
  const cost = round2(vehicle.purchaseCost);
  const base = round2(Math.max(
    cost - Math.max(vehicle.residualValue ?? 0, vehicle.salvageValue ?? 0),
    0,
  ));
  if (base <= 0) return 0;

  const stored = round2(vehicle.accumulatedDepreciationStored - vehicle.depreciationPosted);
  let amount = Math.min(Math.max(stored, 0), base);

  if (amount <= 0 && vehicle.depreciationRate && vehicle.depreciationRate > 0) {
    const months = Math.max(vehicle.monthsSincePurchase ?? 0, 0);
    const estimate = round2(base * (vehicle.depreciationRate / 100) * (months / 12));
    amount = Math.min(Math.max(estimate, 0), base);
  }
  return round2(amount);
}

/**
 * VDEP — opening accumulated depreciation at the reporting date:
 * DR opening equity / CR accumulated depreciation (contra asset), dated asOf.
 */
export function buildDepreciationBackfillDraft(
  vehicle: BridgeVehicle,
  accounts: ResolvedBridgeAccounts,
  asOf: string,
): BridgeEntryDraft | null {
  const accumulatedAccount = accounts.ACCUMULATED_DEPRECIATION;
  const equityAccount = accounts.OPENING_EQUITY;
  if (!accumulatedAccount || !equityAccount) return null;

  const amount = computeDepreciationBackfillAmount(vehicle);
  if (amount <= 0) return null;

  return {
    key: `vdep:${vehicle.id}`,
    referenceType: 'vehicle_depreciation_backfill',
    referenceId: vehicle.id,
    entryNumberPrefix: `VDEP-${asOf.replace(/-/g, '')}`,
    entryDate: asOf,
    description: `إهلاك تراكمي افتتاحي — ${vehicleLabel(vehicle)} — حتى تاريخ التقرير`,
    lines: [
      {
        accountId: equityAccount,
        line_description: `إهلاك تراكمي سابق الفترات — ${vehicleLabel(vehicle)}`,
        debit_amount: amount,
        credit_amount: 0,
      },
      {
        accountId: accumulatedAccount,
        line_description: `مجمع إهلاك المركبات — ${vehicleLabel(vehicle)}`,
        debit_amount: 0,
        credit_amount: amount,
        asset_id: vehicle.fixedAssetId ?? null,
      },
    ],
  };
}

/** Aggregate check for a list of drafts: ≥2 lines each and debits equal credits. */
export function draftsAreBalanced(drafts: BridgeEntryDraft[]): boolean {
  return drafts.every(draft => {
    if (draft.lines.length < 2) return false;
    const debit = round2(draft.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0));
    const credit = round2(draft.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0));
    return debit > 0 && Math.abs(debit - credit) <= 0.01;
  });
}
