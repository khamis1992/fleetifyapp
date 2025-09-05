import React from 'react';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { MobileContractsView } from './MobileContractsView';
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

export const ContractsList: React.FC<ContractsListProps> = (props) => {
  const { isMobile } = useSimpleBreakpoint();

  // Use mobile view for mobile devices
  if (isMobile) {
    return <MobileContractsView {...props} />;
  }

  // Desktop view
  const {
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
  } = props;

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

  return (
    <ContractsEmptyState 
      type={hasFilters ? 'no-results' : 'no-contracts'}
      onCreateContract={onCreateContract}
      onClearFilters={onClearFilters}
    />
  );
};