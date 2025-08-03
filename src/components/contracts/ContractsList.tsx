import React from 'react';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface ContractsListProps {
  contracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewDetails: (contract: any) => void;
  onCancelContract: (contract: any) => void;
  onManagePayments: (contract: any) => void;
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
  onManagePayments,
  onCreateContract,
  onClearFilters,
  hasFilters,
  hasContracts
}) => {
  if (contracts.length > 0) {
    return (
      <div className="grid gap-4">
        {contracts.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            onRenew={onRenewContract}
            onManageStatus={onManageStatus}
            onViewDetails={onViewDetails}
            onCancelContract={onCancelContract}
            onManagePayments={onManagePayments}
            showRenewButton={contract.status === 'active'}
            showCancelButton={contract.status === 'active'}
            showPaymentButton={true}
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