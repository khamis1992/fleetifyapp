import * as React from 'react';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface ContractsListProps {
  contracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewDetails: (contract: any) => void;
  onCancelContract: (contract: any) => void;
  onDeleteContract: (contract: any) => void;
  onCreateContract: () => void;
  onClearFilters: () => void;
  hasFilters: boolean;
  hasContracts: boolean;
}

export const ContractsList: React.FC<ContractsListProps> = ({
  contracts,
  onRenewContract,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  onDeleteContract,
  onCreateContract,
  onClearFilters,
  hasFilters,
  hasContracts
}) => {
  if (contracts.length > 0) {
    return (
      <div className="grid gap-4 w-full">
        {contracts.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            onRenew={onRenewContract}
            onManageStatus={onManageStatus}
            onViewDetails={onViewDetails}
            onCancelContract={onCancelContract}
            onDeleteContract={onDeleteContract}
            showRenewButton={contract.status === 'active'}
            showCancelButton={contract.status === 'active'}
            showDeleteButton={true}
          />
        ))}
      </div>
    );
  }

  // Empty state handling
  if (hasContracts && hasFilters) {
    return (
      <ContractsEmptyState
        type="no-results"
        onClearFilters={onClearFilters}
      />
    );
  } else {
    return (
      <ContractsEmptyState
        type="no-contracts"
        onCreateContract={onCreateContract}
      />
    );
  }
};