import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { ContractExpirationAlerts } from './ContractExpirationAlerts';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface ContractsTabsContentProps {
  activeContracts: any[];
  suspendedContracts: any[];
  expiredContracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewContract: (contract: any) => void;
  onCancelContract: (contract: any) => void;
}

export const ContractsTabsContent: React.FC<ContractsTabsContentProps> = ({
  activeContracts,
  suspendedContracts,
  expiredContracts,
  onRenewContract,
  onManageStatus,
  onViewContract,
  onCancelContract
}) => {
  return (
    <>
      <TabsContent value="alerts">
        <ContractExpirationAlerts 
          onRenewContract={onRenewContract}
          onViewContract={onViewContract}
          daysAhead={30}
        />
      </TabsContent>

      <TabsContent value="active">
        <div className="grid gap-4">
          {activeContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onRenew={onRenewContract}
              onViewDetails={onViewContract}
              onCancelContract={onCancelContract}
              showRenewButton={true}
              showCancelButton={true}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="suspended">
        <div className="grid gap-4">
          {suspendedContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onManageStatus={onManageStatus}
              onViewDetails={onViewContract}
              showManageButton={true}
            />
          ))}
          
          {suspendedContracts.length === 0 && (
            <ContractsEmptyState type="no-suspended" />
          )}
        </div>
      </TabsContent>

      <TabsContent value="expired">
        <div className="grid gap-4">
          {expiredContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onRenew={onRenewContract}
              onViewDetails={onViewContract}
              showRenewButton={true}
            />
          ))}
          
          {expiredContracts.length === 0 && (
            <ContractsEmptyState type="no-expired" />
          )}
        </div>
      </TabsContent>
    </>
  );
};