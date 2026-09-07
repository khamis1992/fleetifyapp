import { usePermissionsCheck } from "@/hooks/usePermissionCheck";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useFleetifyTranslation } from "@/hooks/useTranslation";
import {
  filterFinanceNavigation,
  financeNavigationPermissions,
  type FinanceLanguage,
} from "./financeNavigation";

export function useFinanceNavigation() {
  const {
    companyId,
    hasCompanyAdminAccess,
    hasGlobalAccess,
    isAuthenticating,
  } = useUnifiedCompanyAccess();
  const { currentLanguage } = useFleetifyTranslation("financial");
  const permissions = usePermissionsCheck(financeNavigationPermissions);
  const language: FinanceLanguage = currentLanguage === "ar" ? "ar" : "en";
  const access = {
    admin: !!hasCompanyAdminAccess,
    superAdmin: !!hasGlobalAccess,
    permissions: new Set(
      permissions.data
        ?.filter((item) => item.hasPermission)
        .map((item) => item.permissionId) || []
    ),
  };
  const groups =
    !companyId || isAuthenticating ? [] : filterFinanceNavigation(access);
  return {
    groups,
    searchGroups:
      !companyId || isAuthenticating
        ? []
        : filterFinanceNavigation(access, true),
    language,
    isLoading: isAuthenticating || permissions.isLoading,
  };
}
