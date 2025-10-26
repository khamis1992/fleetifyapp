import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { ContractExpirationAlerts } from './ContractExpirationAlerts';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface ContractsTabsContentProps {
  activeContracts: any[];
  cancelledContracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewContract: (contract: any) => void;
  onCancelContract: (contract: any) => void;
  onDeleteContract: (contract: any) => void;
}

export const ContractsTabsContent: React.FC<ContractsTabsContentProps> = ({
  activeContracts,
  cancelledContracts,
  onRenewContract,
  onManageStatus,
  onViewContract,
  onCancelContract,
  onDeleteContract
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
              onDeleteContract={onDeleteContract}
              showRenewButton={true}
              showCancelButton={true}
              showDeleteButton={true}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="cancelled">
        <div className="grid gap-4">
          {cancelledContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onViewDetails={onViewContract}
              onDeleteContract={onDeleteContract}
              showDeleteButton={true}
            />
          ))}
          
          {cancelledContracts.length === 0 && (
            <ContractsEmptyState type="no-cancelled" />
          )}
        </div>
      </TabsContent>
    </>
  );
};