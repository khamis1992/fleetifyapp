import React from 'react';
import { PermissionGuard } from './PermissionGuard';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeMessage?: boolean;
  hideIfNoAccess?: boolean;
}

/**
 * Updated FeatureGate component that uses the new PermissionGuard system
 * @deprecated Use PermissionGuard directly for better flexibility
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradeMessage = true,
  hideIfNoAccess = false
}) => {
  return (
    <PermissionGuard
      feature={feature}
      fallback={fallback}
      showUpgradeMessage={showUpgradeMessage}
      hideIfNoAccess={hideIfNoAccess}
    >
      {children}
    </PermissionGuard>
  );
};