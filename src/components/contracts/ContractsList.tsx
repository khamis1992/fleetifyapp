import React from 'react';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface ContractsListProps {
  contracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewDetails: (contract: any) => void;
  onCancelContract: (contract: any) => void;
  onDeleteContract: (contract: any) => void;
  onAmendContract?: (contract: any) => void;
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
  onAmendContract,
  onCreateContract,
  onClearFilters,
  hasFilters,
  hasContracts
}) => {
  const { isMobile } = useSimpleBreakpoint();

  // Ensure contracts is an array
  const safeContracts = Array.isArray(contracts) ? contracts : [];

  if (safeContracts.length > 0) {
    return (
      <div className="w-full space-y-4">
        {safeContracts.map((contract, index) => (
          <ContractCard
            key={contract.id || `contract-${index}`}
            contract={contract}
            onRenew={onRenewContract}
            onManageStatus={onManageStatus}
            onViewDetails={onViewDetails}
            onCancelContract={onCancelContract}
            onDeleteContract={onDeleteContract}
            onAmendContract={onAmendContract}
            showRenewButton={contract.status === 'active'}
            showCancelButton={contract.status === 'active'}
            showDeleteButton={true}
            showAmendButton={contract.status === 'active'}
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