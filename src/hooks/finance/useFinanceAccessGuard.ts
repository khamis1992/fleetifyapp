import { useMemo } from "react";
import { usePermissionsCheck } from "@/hooks/usePermissionCheck";
import {
  FINANCE_FIELD_PERMISSION_MATRIX,
  FINANCE_PERMISSION_MATRIX,
  FinanceActionId,
  FinanceFieldPermissionDefinition,
  SegregationContext,
  evaluateSegregationOfDuties,
  getFinanceFieldPermission,
  permissionMatches,
} from "@/utils/financeAccessRules";

const permissionIds = Array.from(
  new Set(FINANCE_PERMISSION_MATRIX.flatMap((permission) => [permission.id, ...permission.fallbackPermissions]))
);

export function useFinanceAccessGuard() {
  const { data, isLoading, error } = usePermissionsCheck(permissionIds);

  const grantedPermissions = useMemo(
    () => data?.filter((permission) => permission.hasPermission).map((permission) => permission.permissionId) || [],
    [data]
  );

  const can = (action: FinanceActionId) => permissionMatches(grantedPermissions, action);

  const canEditField = (entity: FinanceFieldPermissionDefinition["entity"], field: string) => {
    const fieldPermission = getFinanceFieldPermission(entity, field);
    if (!fieldPermission) return false;
    return can(fieldPermission.permission);
  };

  const checkSegregationOfDuties = (context: Omit<SegregationContext, "bypassPermissions">) =>
    evaluateSegregationOfDuties({ ...context, bypassPermissions: grantedPermissions });

  return {
    isLoading,
    error,
    grantedPermissions,
    can,
    canEditField,
    checkSegregationOfDuties,
    protectedFields: FINANCE_FIELD_PERMISSION_MATRIX,
    permissionMatrix: FINANCE_PERMISSION_MATRIX,
  };
}
