interface PostingAccount {
  company_id: string;
  account_type: string;
  balance_type: string;
  account_level: number | null;
  is_header: boolean | null;
  is_active: boolean | null;
}

/** Shared by the selector and the mutation preflight. Posting RPCs validate again. */
export function isEligibleAccountMapping(
  account: PostingAccount | undefined | null,
  category: string | undefined,
  companyId: string | undefined | null,
  typeCode?: string
): boolean {
  if (!account || !companyId || !category) return false;
  // Live metadata contains a display group in account_category for these fleet types.
  const fleetCategories: Record<string, string> = {
    VEHICLE_ASSETS: "assets",
    ACCUMULATED_DEPRECIATION_VEHICLES: "assets",
    DEPRECIATION_EXPENSE_VEHICLES: "expenses",
    INSURANCE_EXPENSE: "expenses",
  };
  const accountCategory = fleetCategories[typeCode || ""] || category;
  const contraAsset = [
    "ACCUMULATED_DEPRECIATION",
    "ACCUMULATED_DEPRECIATION_VEHICLES",
  ].includes(typeCode || "");
  const balance =
    !contraAsset && ["assets", "expenses"].includes(accountCategory)
      ? "debit"
      : "credit";
  return (
    account.company_id === companyId &&
    account.is_active === true &&
    account.is_header === false &&
    (account.account_level ?? 0) >= 3 &&
    account.account_type === accountCategory &&
    account.balance_type === balance
  );
}
